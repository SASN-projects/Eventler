import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recommendation } from './entities/recommendation.entity';
import { Event } from '../events/entities/event.entity';
import { EventType } from '../events/enums/event.enums';
import { EventStatus } from '../events/enums/event-status.enum';
import { SchemaType, ObjectSchema } from '@google/generative-ai';
import { Venue } from '../venues/entities/venue.entity';
import { SlidesService } from '../slides/slides.service';
import { LangfuseService } from '../langfuse/langfuse.service';
import { GeminiService } from '../gemini/gemini.service';
import { ILangfuseTrace } from '../langfuse/interfaces/langfuse.interface';
import { RecommendationQualityEvaluator } from './recommendation-quality.evaluator';
import { RecommendationJudgeService } from './recommendation-judge.service';
import {
  RecommendationPromptContextBuilder,
  RecommendationEventInput,
} from './recommendation-prompt-context.builder';
import {
  RecommendationHistoryService,
  HistorySignalSummary,
  HistoryScope,
} from './recommendation-history.service';

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

/**
 * Prompt metadata resolved after a getPrompt() call.
 * Passed through to Gemini generation metadata for Langfuse observability.
 */
interface PromptMeta {
  promptVersion: number | string;
  promptSource: 'langfuse' | 'fallback';
}

// ---------------------------------------------------------------------------
// Fallback prompt template
//
// This is the hardcoded fallback used when Langfuse Prompt Management is
// disabled, unreachable, or does not contain the prompt.
//
// It uses the same {{variable}} placeholders as the managed Langfuse template
// so the same context builder and compile step are used in both paths.
//
// To update the managed prompt: edit the template in Langfuse UI under
// prompt name "event-recommendation-planner" — this fallback remains for
// safety only. To update the fallback: edit the constant below.
// ---------------------------------------------------------------------------
export const RECOMMENDATION_PROMPT_NAME = 'event-recommendation-planner';

export const RECOMMENDATION_FALLBACK_TEMPLATE = `You are a friendly event planner.

Use the following event context:

{{eventCoreContext}}

User preferences:

{{userPreferencesSummary}}

Constraints and requirements:

{{constraintsSummary}}

Additional optional signals:

{{optionalSignalsSummary}}

Recommendation policy:

{{recommendationPolicy}}

Return the answer exactly according to this format:

{{outputFormatInstructions}}`;

// ---------------------------------------------------------------------------
// Template compilation
//
// Performs simple {{variableName}} → value substitution.
// All values are pre-sanitised strings produced by the context builder —
// undefined/null cannot appear. Unresolved placeholders (which would only
// occur in a corrupt template) are replaced with an empty string.
// ---------------------------------------------------------------------------
export function compileTemplate(
  template: string,
  variables: Record<string, any>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = variables[key];
    return typeof value === 'string' ? value : '';
  });
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
    private readonly promptContextBuilder: RecommendationPromptContextBuilder,
    private readonly historyService: RecommendationHistoryService,
    private readonly configService: ConfigService,
  ) { }

  private getPromptName(): string {
    return this.configService.get<string>('LANGFUSE_PROMPT_NAME') || RECOMMENDATION_PROMPT_NAME;
  }

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
      // Only emit the safe aggregate — raw question/answerValue must NOT appear here.
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

    const eventInput: RecommendationEventInput = {
      targetDate: event.targetDate || 'flexible',
      locationCity: event.locationCity || 'local area',
      locationCountry: event.locationCountry || 'local area',
      participantCount: event.participantCount || 1,
      eventType: event.eventType || 'casual',
    };

    const preferenceScope: HistoryScope =
      event.eventType === EventType.GROUP && !!event.groupId ? 'group' : 'user';
    const currentPreferencesSummary =
      preferenceScope === 'group'
        ? this.buildGroupPreferencesSummary(eventAnswers)
        : undefined;

    // ── Retrieve user history (soft secondary signal) ────────────────────
    // History lookup is non-blocking: a failure returns the no-history fallback
    // and the span is ended with ERROR metadata. Recommendation generation
    // continues regardless.
    const historyStartMs = Date.now();
    const historySpan = trace.span({
      name: preferenceScope === 'group' ? 'retrieve-group-history' : 'retrieve-user-history',
      input: {
        historyScope: preferenceScope,
        subjectId: preferenceScope === 'group' ? event.groupId : event.createdById,
      },
    });

    let historySummary: HistorySignalSummary | undefined;
    try {
      historySummary = await this.historyService.getHistorySignal({
        scope: preferenceScope,
        subjectId: preferenceScope === 'group' ? event.groupId : event.createdById,
        currentEventId: eventId,
      });
      historySpan.end({
        output: {
          historyScope: preferenceScope,
          historyItemsCount: historySummary.historyItemsCount,
          historySignalUsed: historySummary.historySignalUsed,
          dominantEventTypes: historySummary.dominantEventTypes,
          preferredLocations: historySummary.preferredLocations,
          preferredCategories: historySummary.preferredCategories,
          latencyMs: Date.now() - historyStartMs,
        },
      });
    } catch (historyErr: any) {
      // This path should not be reached (history service is non-throwing),
      // but is kept as a safety net.
      historySpan.end({
        level: 'ERROR',
        statusMessage: historyErr.message,
        output: {
          historyScope: preferenceScope,
          historyItemsCount: 0,
          historySignalUsed: false,
          latencyMs: Date.now() - historyStartMs,
        },
      });
      this.logger.warn(`History span error (non-blocking): ${historyErr.message}`);
    }
    // ─────────────────────────────────────────────────────────────────────

    // Fetch the managed prompt from Langfuse (or fall back to the hardcoded template).
    // This is done once before the retry loop so all retry attempts share the same
    // resolved version and source metadata.
    const { template, version: promptVersion, source: promptSource } =
      await this.langfuseService.getPrompt(
        this.getPromptName(),
        RECOMMENDATION_FALLBACK_TEMPLATE,
      );

    const promptMeta: PromptMeta = { promptVersion, promptSource };

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const prompt = this.buildPrompt(
          eventInput,
          eventAnswers,
          template,
          historySummary,
          {
            preferenceScope,
            currentPreferencesSummary,
          },
        );
        const rawResponse = await this.callGeminiModel(prompt, promptMeta, trace, attempt);

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
        const recommendedEvents = this.parseGeminiResponse(rawResponse, eventInput);
        if (this.judgeService.shouldSample()) {
          try {
            await this.judgeService.evaluate(
              {
                eventType: eventInput.eventType,
                locationCity: eventInput.locationCity,
                locationCountry: eventInput.locationCountry,
                participantCount: eventInput.participantCount,
                targetDate: String(eventInput.targetDate),
                preferenceScope,
                currentPreferencesSummary:
                  currentPreferencesSummary ?? undefined,
                userPreferences:
                  preferenceScope === 'group'
                    ? []
                    : eventAnswers.map((p) => ({
                      question: p.question,
                      answerValue: p.answerValue,
                    })),
                recommendations: recommendedEvents.map((r) => ({
                  title: r.title,
                  description: r.description,
                  address: r.address,
                })),
                // Pass the safe aggregated summary text only — never raw history.
                historyScope: historySummary?.scope,
                historySummaryText: historySummary?.summaryText,
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

  async selectRecommendation(eventId: string, recommendationId: string, userId?: string): Promise<GenerateRecommendationResponse> {
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

    if (userId && event.createdById && event.createdById !== userId) {
      return {
        success: false,
        message: 'Only the event creator can choose a recommendation for this event.',
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
    event.status = EventStatus.FINALIZED;
    event.finalizedAt = new Date();
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

  /**
   * Builds the final compiled prompt string.
   *
   * Uses the RecommendationPromptContextBuilder to produce the structured
   * context object, then compiles it into the given template string via
   * simple {{variable}} substitution.
   *
   * @param eventInput   Core event fields.
   * @param eventAnswers Slide answers for personalisation.
   * @param template     Prompt template (from Langfuse or fallback constant).
   */
  private buildPrompt(
    eventInput: RecommendationEventInput,
    eventAnswers: any[] = [],
    template: string = RECOMMENDATION_FALLBACK_TEMPLATE,
    historySummary?: HistorySignalSummary,
    options: {
      preferenceScope: HistoryScope;
      currentPreferencesSummary?: string;
    } = { preferenceScope: 'user' },
  ): string {
    const context = this.promptContextBuilder.build(
      eventInput,
      eventAnswers,
      historySummary,
      options,
    );
    return compileTemplate(template, context);
  }

  /**
   * Builds a current/provisional group preference summary from raw group member answers.
   *
   * CURRENT BEHAVIOR: Derives a majority-vote summary directly from the EventResponse rows
   * collected from group members for this event. This is a provisional approach because a
   * canonical finalized group-answer artifact does not yet exist.
   *
   * FUTURE BEHAVIOR: When a finalized group-answer artifact is implemented, this method
   * should be replaced by consuming that artifact instead of deriving the summary from raw
   * member answers.
   *
   * TODO: Once finalized group answers exist, replace this derivation with the finalized
   * group-answer artifact. The policy order will then become:
   *   current group event hard constraints > finalized group answers/preferences > historical group preferences
   */
  private buildGroupPreferencesSummary(eventAnswers: any[] = []): string {
    if (!eventAnswers || eventAnswers.length === 0) {
      return 'No current group member answers were provided.';
    }

    const groupedAnswers = new Map<string, Map<string, number>>();

    for (const answer of eventAnswers) {
      const question = typeof answer?.question === 'string' ? answer.question.trim() : '';
      const answerValue = typeof answer?.answerValue === 'string' ? answer.answerValue.trim() : '';

      if (!question || !answerValue) {
        continue;
      }

      const answersByQuestion = groupedAnswers.get(question) ?? new Map<string, number>();
      answersByQuestion.set(answerValue, (answersByQuestion.get(answerValue) ?? 0) + 1);
      groupedAnswers.set(question, answersByQuestion);
    }

    if (groupedAnswers.size === 0) {
      return 'No current group member answers were provided.';
    }

    // Header reflects provisional/current state — not finalized group answers.
    const lines = ['Current/provisional group preference summary (highest priority after hard constraints):'];

    for (const [question, answersByQuestion] of groupedAnswers.entries()) {
      const totalResponses = [...answersByQuestion.values()].reduce((sum, count) => sum + count, 0);
      const [winningAnswer, winningCount] = [...answersByQuestion.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0];

      lines.push(`- ${question}: ${winningAnswer} (${winningCount}/${totalResponses} responses)`);
    }

    return lines.join('\n');
  }

  private async callGeminiModel(
    prompt: string,
    promptMeta: PromptMeta,
    parentTrace?: ILangfuseTrace,
    attempt = 1,
  ): Promise<string> {
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
      const promptName = this.getPromptName();
      const result = await this.geminiService.generateJsonContent<{ recommendedEvents: any[] }>({
        prompt,
        responseSchema,
        parentTrace,
        promptName: `${promptName} (attempt ${attempt})`,
        promptVersion: String(promptMeta.promptVersion),
        metadata: {
          attempt,
          promptName,
          promptVersion: promptMeta.promptVersion,
          promptSource: promptMeta.promptSource,
        },
      });

      return JSON.stringify(result);
    } catch (error: any) {
      throw new Error(`Failed to generate recommendation: ${error.message}`);
    }
  }

  private parseGeminiResponse(
    responseText: string,
    input: RecommendationEventInput,
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
