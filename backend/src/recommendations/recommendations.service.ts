import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recommendation } from './entities/recommendation.entity';
import { Event } from '../events/entities/event.entity';
import { SchemaType, ObjectSchema } from '@google/generative-ai';
import { Venue } from '../venues/entities/venue.entity';
import { SlidesService } from '../slides/slides.service';
import { LangfuseService } from '../langfuse/langfuse.service';
import { GeminiService } from '../gemini/gemini.service';
import { ILangfuseTrace } from '../langfuse/interfaces/langfuse.interface';
import { RecommendationQualityEvaluator } from './recommendation-quality.evaluator';
import { RecommendationJudgeService } from './recommendation-judge.service';

export interface RecommendationResult {
  id: string;
  title: string;
  description: string;
  address: string;
}

export interface GenerateRecommendationResponse {
  success: boolean;
  data?: RecommendationResult[];
  message?: string;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
    private slideAnswerService: SlidesService,
    private readonly langfuseService: LangfuseService,
    private readonly geminiService: GeminiService,
    private readonly qualityEvaluator: RecommendationQualityEvaluator,
    private readonly judgeService: RecommendationJudgeService,
  ) {}

  getFeed() {
    const mockRecommendations = [
      {
        id: '1',
        title: 'Coffee Shop Meet-up',
        score: 0.95,
        rank: 1,
      },
      {
        id: '2',
        title: 'Beach Volleyball',
        score: 0.88,
        rank: 2,
      },
      {
        id: '3',
        title: 'Movie Night',
        score: 0.82,
        rank: 3,
      },
    ];

    return {
      recommendations: mockRecommendations,
      count: mockRecommendations.length,
    };
  }

  async generateRecommendation(eventId: string): Promise<GenerateRecommendationResponse> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: [],
    });

    if (!event) {
      return {
        success: false,
        message: `Event with id ${eventId} not found`,
      };
    }

    // Initialize Langfuse trace
    const trace = this.langfuseService.trace('generate-recommendations', {
      userId: event.createdById,
      sessionId: eventId,
      metadata: {
        eventId,
        eventType: event.eventType,
        locationCity: event.locationCity,
        locationCountry: event.locationCountry,
        participantCount: event.participantCount,
      },
    });

    // Trace the retrieval of slide answers (preferences retrieval / RAG step)
    const retrievalSpan = trace.span({
      name: 'retrieve-user-preferences',
      input: { eventId },
    });

    let eventAnswers: any[] = [];
    try {
      eventAnswers = await this.slideAnswerService.getEventAnswers(eventId);
      this.logger.debug(`Retrieved ${eventAnswers.length} slide answer(s) for event ${eventId}`);
      retrievalSpan.end({
        output: {
          answersCount: eventAnswers.length,
        },
      });
    } catch (error: any) {
      retrievalSpan.end({
        level: 'ERROR',
        statusMessage: error.message,
      });
      trace.update({
        output: {
          success: false,
          error: `Preferences retrieval failed: ${error.message}`,
        },
      });
      throw error;
    }

    const input = {
      targetDate: event.targetDate || 'flexible',
      locationCity: event.locationCity || 'local area',
      locationCountry: event.locationCountry || 'local area',
      participantCount: event.participantCount || 1,
      eventType: event.eventType || 'casual',
    };

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const prompt = this.buildPrompt(input, eventAnswers);
        const rawResponse = await this.callGeminiModel(prompt, trace, attempt);

        // ── Quality evaluation (deterministic, fire-and-forget) ──────────
        const scores = this.qualityEvaluator.evaluate(rawResponse);
        try {
          for (const [name, value] of Object.entries(scores) as [string, number][]) {
            trace.score({ name, value });
          }
        } catch (scoreErr: any) {
          this.logger.warn(`Quality score reporting failed: ${scoreErr.message}`);
        }
        // ────────────────────────────────────────────────────────────────

        // ── LLM-as-a-Judge (optional, fire-and-forget) ───────────────────
        const recommendedEvents = this.parseGeminiResponse(rawResponse, input);
        if (this.judgeService.shouldSample()) {
          try {
            await this.judgeService.evaluate(
              {
                eventType: input.eventType,
                locationCity: input.locationCity,
                locationCountry: input.locationCountry,
                participantCount: input.participantCount,
                targetDate: String(input.targetDate),
                preferenceCount: eventAnswers.length,
                recommendations: recommendedEvents.map((r) => ({
                  title: r.title,
                  description: r.description,
                  address: r.address,
                })),
              },
              trace,
            );
          } catch (judgeErr: any) {
            this.logger.warn(`LLM Judge call failed unexpectedly: ${judgeErr.message}`);
          }
        }
        // ─────────────────────────────────────────────────────────────────

        this.logger.debug(`Attempt ${attempt}: generated ${recommendedEvents.length} recommendation(s) for event ${eventId}`);

        // Persist the generated recommendations under its own span
        const persistSpan = trace.span({
          name: 'persist-recommendations',
          input: { count: recommendedEvents.length },
        });

        let savedRecommendations: Recommendation[];
        try {
          const recommendationsToSave = recommendedEvents.map((recommendation) =>
            this.recommendationRepository.create({
              title: recommendation.title,
              description: recommendation.description,
              address: recommendation.address,
            }),
          );

          savedRecommendations = await this.recommendationRepository.save(recommendationsToSave);

          persistSpan.end({
            output: {
              savedCount: savedRecommendations.length,
              ids: savedRecommendations.map((r) => r.id),
            },
          });
        } catch (dbError: any) {
          persistSpan.end({
            level: 'ERROR',
            statusMessage: dbError.message,
          });
          throw dbError;
        }

        // Update parent trace on success
        trace.update({
          output: {
            success: true,
            recommendationsCount: savedRecommendations.length,
            recommendationIds: savedRecommendations.map((r) => r.id),
          },
        });

        return {
          success: true,
          data: savedRecommendations.map((savedRecommendation) => ({
            id: savedRecommendation.id,
            title: savedRecommendation.title,
            description: savedRecommendation.description,
            address: savedRecommendation.address,
          })),
        };
      } catch (error: any) {
        lastError = error as Error;
        this.logger.warn(`Recommendation attempt ${attempt} failed: ${error.message}`);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // Update parent trace on failure after retries
    trace.update({
      output: {
        success: false,
        error: `Failed to generate recommendation after ${maxRetries} attempts. Last error: ${lastError?.message}`,
      },
      metadata: {
        attempts: maxRetries,
      },
    });

    return {
      success: false,
      message: `Failed to generate recommendation after ${maxRetries} attempts. Last error: ${lastError?.message}`,
    };
  }

  async selectRecommendation(eventId: string, recommendationId: string): Promise<GenerateRecommendationResponse> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: [],
    });

    if (!event) {
      return {
        success: false,
        message: `Event with id ${eventId} not found`,
      };
    }

    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      return {
        success: false,
        message: `Recommendation with id ${recommendationId} not found`,
      };
    }

    event.recommendation = recommendation;
    await this.eventRepository.save(event);

    return {
      success: true,
      data: [
        {
          id: recommendation.id,
          title: recommendation.title,
          description: recommendation.description,
          address: recommendation.address,
        },
      ],
    };
  }

  private buildPrompt(
    input: {
      targetDate: string;
      locationCity: string;
      locationCountry: string;
      participantCount: number;
      eventType: string;
    },
    eventAnswers: any[] = [],
  ): string {
    const slideAnswersText = eventAnswers
      .map((answer) => `- ${answer.question}: ${answer.answerValue}`)
      .join('\n');

    const preferencesSection = slideAnswersText
      ? `User Preferences (from participant answers — tailor every recommendation to reflect these):\n  ${slideAnswersText}`
      : 'User Preferences:\n  No explicit user preferences were provided.';

    return `You are a friendly event planner. Build exactly three (3) distinct structured event recommendations (as JSON array under key "recommendedEvents") based on the following event details:

  - Event Type: ${input.eventType}
  - Target Date: ${input.targetDate}
  - Location: ${input.locationCity}, ${input.locationCountry}
  - Number of Participants: ${input.participantCount}

  ${preferencesSection}

  Return JSON with key "recommendedEvents" containing an array of 3 objects. Each object must include: 'title' (short), 'description' (text), and 'address' (text). Do not include extra fields.`;
  }

  private async callGeminiModel(prompt: string, parentTrace?: ILangfuseTrace, attempt = 1): Promise<string> {
    const responseSchema: ObjectSchema = {
      type: SchemaType.OBJECT,
      properties: {
        recommendedEvents: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              address: { type: SchemaType.STRING },
            },
            required: ['title', 'description', 'address'],
          },
        },
      },
      required: ['recommendedEvents'],
    };

    try {
      const result = await this.geminiService.generateJsonContent<{ recommendedEvents: any[] }>({
        prompt,
        responseSchema,
        parentTrace,
        promptName: `event-recommendation-planner (attempt ${attempt})`,
        promptVersion: '1.0.0', // extension point for prompt management
        metadata: { attempt },
      });

      return JSON.stringify(result);
    } catch (error: any) {
      throw new Error(`Failed to generate recommendation: ${error.message}`);
    }
  }

  private parseGeminiResponse(
    responseText: string,
    input: {
      targetDate: string;
      locationCity: string;
      locationCountry: string;
      participantCount: number;
      eventType: string;
    },
  ): RecommendationResult[] {
    try {
      const parsed = JSON.parse(responseText.trim());
      if (parsed && Array.isArray(parsed.recommendedEvents)) {
        return parsed.recommendedEvents.map((event: any) => ({
          title: event.title || `${input.eventType} Event on ${input.targetDate}`,
          description:
            event.description ||
            `A ${input.eventType} event for ${input.participantCount} people in ${input.locationCity}`,
          address: event.address || `${input.locationCity}, ${input.locationCountry}`,
        }));
      }
    } catch (error: any) {
      this.logger.warn(`Failed to parse Gemini response as JSON: ${error.message}`);
    }

    throw new Error('Failed to parse recommendation response from Gemini model');
  }
}
