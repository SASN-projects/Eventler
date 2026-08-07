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
import { GeminiService, classifyGeminiError, ClassifiedGeminiError } from '../gemini/gemini.service';
import { ILangfuseTrace } from '../langfuse/interfaces/langfuse.interface';
import { RecommendationQualityEvaluator } from './recommendation-quality.evaluator';
import { RecommendationJudgeService } from './recommendation-judge.service';
import {
  GooglePlacesService,
  GooglePlaceCandidate,
  GooglePlacePhotoAttribution,
  GooglePlacesOpeningHours,
} from './google-places.service';
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
  photoUrl?: string;
  photoAttributions?: GooglePlacePhotoAttribution[];
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
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

interface PlacesSearchPlanItem {
  textQuery: string;
  includedType?: string;
  minRating?: number;
  priceLevels?: string[];
  weight?: number;
}

interface PlacesSearchPlan {
  searches: PlacesSearchPlanItem[];
}

interface RankedPlaceRecommendation extends RecommendationResult {
  score: number;
  placeId: string;
  photoName?: string;
  openingMatch?: OpeningMatch;
}

interface PlannedVisitTime {
  date: Date;
  day: number;
  minutes: number;
  label: string;
}

interface OpeningMatch {
  status: 'open' | 'closed' | 'unknown';
  source?: 'current' | 'regular';
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
    private readonly googlePlacesService: GooglePlacesService,
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

  async generateRecommendation(eventId: string, requesterUserId?: string): Promise<GenerateRecommendationResponse> {
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

    if (requesterUserId && event.createdById && event.createdById !== requesterUserId) {
      return {
        success: false,
        message: 'Only the event creator can generate recommendations for this event.',
      };
    }

    // ── Group lifecycle guard ──────────────────────────────────────────────
    // For group events, if the owner manually triggers recommendation generation
    // while the questionnaire is still OPEN (collecting_responses) or DRAFT,
    // transition the questionnaire to CLOSED so recommendation generation proceeds.
    if (event.eventType === EventType.GROUP) {
      if (
        event.status === EventStatus.OPEN ||
        event.status === EventStatus.DRAFT
      ) {
        event.status = EventStatus.CLOSED;
        await this.eventRepository.save(event);
      } else if (
        event.status !== EventStatus.CLOSED &&
        event.status !== EventStatus.GENERATING_RECOMMENDATIONS &&
        event.status !== EventStatus.RECOMMENDATIONS_READY
      ) {
        return {
          success: false,
          message: `Recommendations cannot be generated for a group event in status '${event.status}'.`,
        };
      }
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

    if (this.googlePlacesService.isConfigured()) {
      try {
        const searchPlan = await this.generatePlacesSearchPlan(eventInput, eventAnswers, trace);
        const rankedRecommendations = await this.searchAndRankPlaces(searchPlan, eventInput, eventAnswers, trace);

        if (rankedRecommendations.length >= 3) {
          const topRecommendations = await this.attachPlacePhotos(rankedRecommendations.slice(0, 3));
          const persistSpan = trace.span({
            name: 'persist-google-places-recommendations',
            input: {
              count: topRecommendations.length,
              placeIds: topRecommendations.map((recommendation) => recommendation.placeId),
            },
          });

          try {
            const recommendationsToSave = topRecommendations.map((recommendation) =>
              this.recommendationRepository.create({
                title: recommendation.title,
                description: recommendation.description,
                address: recommendation.address,
                eventId,
              }),
            );
            const savedRecommendations = await this.recommendationRepository.save(recommendationsToSave);
            await this.eventRepository.update({ id: eventId }, { status: EventStatus.RECOMMENDATIONS_READY });

            persistSpan.end({
              output: {
                savedCount: savedRecommendations.length,
                ids: savedRecommendations.map((recommendation) => recommendation.id),
              },
            });

            trace.update({
              output: {
                success: true,
                source: 'google_places',
                recommendationsCount: savedRecommendations.length,
                recommendationIds: savedRecommendations.map((recommendation) => recommendation.id),
              },
            });

            return {
              success: true,
              data: savedRecommendations.map((savedRecommendation, index) => ({
                id: savedRecommendation.id,
                title: savedRecommendation.title,
                description: savedRecommendation.description,
                address: savedRecommendation.address,
                photoUrl: topRecommendations[index]?.photoUrl,
                photoAttributions: topRecommendations[index]?.photoAttributions,
                googleMapsUri: topRecommendations[index]?.googleMapsUri,
                rating: topRecommendations[index]?.rating,
                userRatingCount: topRecommendations[index]?.userRatingCount,
              })),
            };
          } catch (dbError: any) {
            persistSpan.end({
              level: 'ERROR',
              statusMessage: dbError.message,
            });
            throw dbError;
          }
        }

        this.logger.warn(
          `Google Places produced ${rankedRecommendations.length} ranked result(s); falling back to Gemini-only recommendations.`,
        );
      } catch (placesError: any) {
        this.logger.warn(`Google Places recommendation flow failed; falling back to Gemini-only flow: ${placesError.message}`);
      }
    } else {
      this.logger.warn('Google Places API key is not configured; using Gemini-only recommendations.');
    }

    const maxRetries = Number(this.configService.get('GEMINI_MAX_RETRIES')) || 4;
    const baseDelayMs = Number(this.configService.get('GEMINI_RETRY_BASE_DELAY_MS')) || 2000;
    const maxDelayMs = Number(this.configService.get('GEMINI_RETRY_MAX_DELAY_MS')) || 15000;
    const primaryModel =
      this.configService.get<string>('GEMINI_MODEL') ||
      (this.geminiService.getDefaultModel ? this.geminiService.getDefaultModel() : 'gemini-2.5-flash');
    const fallbackModel = this.configService.get<string>('GEMINI_FALLBACK_MODEL');

    let lastError: Error | null = null;
    let lastClassified: ClassifiedGeminiError | null = null;
    let currentModel = primaryModel;
    let modelFallbackUsed = false;

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
        const rawResponse = await this.callGeminiModel(prompt, promptMeta, trace, attempt, currentModel);

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
              eventId,
            }),
          );

          savedRecommendations = await this.recommendationRepository.save(recommendationsToSave);
          await this.eventRepository.update({ id: eventId }, { status: EventStatus.RECOMMENDATIONS_READY });

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
          metadata: {
            model: currentModel,
            modelFallbackUsed,
            primaryModel,
            fallbackModel: modelFallbackUsed ? fallbackModel : undefined,
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
        const classified = (error as any).classified || classifyGeminiError(error);
        lastClassified = classified;

        this.logger.warn(`Recommendation attempt ${attempt} (${currentModel}) failed [${classified.errorCode}]: ${error.message}`);

        // Non-retryable error -> abort retries immediately
        if (!classified.isRetryable) {
          this.logger.warn(`Non-retryable provider error encountered [${classified.errorCode}]; aborting retries.`);
          break;
        }

        // Primary model retries exhausted & fallback model configured -> try fallback model once
        if (attempt === maxRetries && fallbackModel && fallbackModel !== primaryModel && !modelFallbackUsed) {
          this.logger.warn(`Primary model ${primaryModel} failed after ${maxRetries} attempts. Trying fallback model ${fallbackModel}.`);
          currentModel = fallbackModel;
          modelFallbackUsed = true;
          attempt = 0; // Reset loop counter for fallback model
          continue;
        }

        if (attempt < maxRetries) {
          const delay = this.computeBackoffDelay(attempt, baseDelayMs, maxDelayMs);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Update parent trace on failure after retries
    trace.update({
      output: {
        success: false,
        error: lastClassified?.message || lastError?.message,
      },
      metadata: {
        attempts: maxRetries,
        retryable: lastClassified?.isRetryable ?? false,
        providerErrorCode: lastClassified?.errorCode ?? 'PROVIDER_ERROR',
        providerUnavailable: lastClassified?.providerUnavailable ?? false,
        modelFallbackUsed,
        primaryModel,
        fallbackModel: modelFallbackUsed ? fallbackModel : undefined,
      },
    });

    return {
      success: false,
      message: lastClassified?.isRetryable
        ? `${lastClassified.errorCode}: ${lastClassified.message}`
        : `Failed to generate recommendation: ${lastClassified?.message || lastError?.message}`,
    };
  }

  async selectRecommendation(
    eventId: string,
    recommendationId: string,
    userId?: string,
  ): Promise<GenerateRecommendationResponse> {
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

    if (event.status !== EventStatus.RECOMMENDATIONS_READY) {
      return {
        success: false,
        message: `A recommendation can only be selected when the event is in RECOMMENDATIONS_READY status. Current status: ${event.status}`,
      };
    }

    // Validate the recommendation belongs to this event (prevents cross-event selection)
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId, eventId },
    });

    if (!recommendation) {
      return {
        success: false,
        message: `Recommendation with id ${recommendationId} not found for this event`,
      };
    }

    event.recommendation = recommendation;
    event.status = EventStatus.FINAL_SELECTION_MADE;
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

  public computeBackoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
    const rawDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
    return Math.floor(rawDelay * (0.5 + Math.random() * 0.5));
  }

  private async callGeminiModel(
    prompt: string,
    promptMeta: PromptMeta,
    parentTrace?: ILangfuseTrace,
    attempt = 1,
    modelName?: string,
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
        modelName,
        promptName: `${promptName} (attempt ${attempt})`,
        promptVersion: String(promptMeta.promptVersion),
        metadata: {
          attempt,
          attemptNumber: attempt,
          model: modelName || (this.geminiService.getDefaultModel ? this.geminiService.getDefaultModel() : 'gemini-2.5-flash'),
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

  private async generatePlacesSearchPlan(
    eventInput: RecommendationEventInput,
    eventAnswers: any[] = [],
    parentTrace?: ILangfuseTrace,
  ): Promise<PlacesSearchPlan> {
    const preferences = eventAnswers
      .map((answer) => `- ${answer.question}: ${answer.answerValue}`)
      .join('\n') || 'No explicit user preferences were provided.';

    const prompt = [
      'You convert event preferences into Google Places Text Search requests.',
      'Return ONLY JSON. Do not recommend final venues.',
      '',
      'Event:',
      `- Type: ${eventInput.eventType}`,
      `- Location: ${eventInput.locationCity}, ${eventInput.locationCountry}`,
      `- Participants: ${eventInput.participantCount}`,
      `- Target date: ${eventInput.targetDate}`,
      '',
      'User preferences:',
      preferences,
      '',
      'Create 3 to 5 concise Google Places search intents.',
      'Each textQuery must include the city/country and a concrete venue/activity category.',
      'Use includedType only when it is a valid Google Places primary type such as restaurant, bar, cafe, park, museum, night_club, movie_theater, bowling_alley, tourist_attraction, shopping_mall.',
      'Use minRating when quality matters. Use priceLevels only for food/drink/shopping/services.',
      'Do not use openNow. The backend checks opening hours against the planned event date/time.',
    ].join('\n');

    const responseSchema: ObjectSchema = {
      type: SchemaType.OBJECT,
      properties: {
        searches: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              textQuery: { type: SchemaType.STRING },
              includedType: { type: SchemaType.STRING },
              minRating: { type: SchemaType.NUMBER },
              priceLevels: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
              weight: { type: SchemaType.NUMBER },
            },
            required: ['textQuery'],
          },
        },
      },
      required: ['searches'],
    };

    const result = await this.geminiService.generateJsonContent<PlacesSearchPlan>({
      prompt,
      responseSchema,
      parentTrace,
      promptName: 'google-places-search-plan',
      metadata: {
        eventType: eventInput.eventType,
        locationCity: eventInput.locationCity,
        locationCountry: eventInput.locationCountry,
      },
    });

    const searches = (result.searches ?? [])
      .filter((search) => search.textQuery?.trim())
      .slice(0, 5)
      .map((search) => ({
        ...search,
        textQuery: this.ensureQueryHasLocation(search.textQuery, eventInput),
        minRating: this.normalizeMinRating(search.minRating),
        priceLevels: this.normalizePriceLevels(search.priceLevels),
        weight: Math.min(Math.max(search.weight ?? 1, 0.25), 2),
      }));

    if (searches.length === 0) {
      return {
        searches: this.buildFallbackSearches(eventInput, eventAnswers),
      };
    }

    return { searches };
  }

  private async searchAndRankPlaces(
    searchPlan: PlacesSearchPlan,
    eventInput: RecommendationEventInput,
    eventAnswers: any[],
    parentTrace?: ILangfuseTrace,
  ): Promise<RankedPlaceRecommendation[]> {
    const span = parentTrace?.span({
      name: 'google-places-search-and-rank',
      input: { searches: searchPlan.searches },
    });

    const plannedVisit = this.resolvePlannedVisitTime(eventInput, eventAnswers);
    const allCandidates: Array<GooglePlaceCandidate & { planWeight: number }> = [];
    for (const search of searchPlan.searches) {
      try {
        const places = await this.googlePlacesService.searchText({
          textQuery: search.textQuery,
          includedType: search.includedType,
          minRating: search.minRating,
          priceLevels: search.priceLevels,
          pageSize: 10,
          regionCode: this.inferRegionCode(eventInput.locationCountry),
        });

        allCandidates.push(
          ...places.map((place) => ({
            ...place,
            planWeight: search.weight ?? 1,
          })),
        );
      } catch (error: any) {
        this.logger.warn(`Places query failed for "${search.textQuery}": ${error.message}`);
      }
    }

    const deduped = this.dedupePlaces(allCandidates);
    const ranked = deduped
      .filter((place) => !place.businessStatus || place.businessStatus === 'OPERATIONAL')
      .map((place) => this.toRankedRecommendation(place, eventInput, eventAnswers, plannedVisit))
      .sort((a, b) => b.score - a.score);

    span?.end({
      output: {
        candidates: allCandidates.length,
        deduped: deduped.length,
        ranked: ranked.length,
        topPlaceIds: ranked.slice(0, 3).map((place) => place.placeId),
        plannedVisit: plannedVisit.label,
      },
    });

    return ranked;
  }

  private toRankedRecommendation(
    place: GooglePlaceCandidate & { planWeight: number },
    eventInput: RecommendationEventInput,
    eventAnswers: any[],
    plannedVisit: PlannedVisitTime,
  ): RankedPlaceRecommendation {
    const openingMatch = this.getOpeningMatch(place, plannedVisit);
    const score = this.scorePlace(place, eventAnswers, openingMatch);

    return {
      id: place.id,
      placeId: place.id,
      title: place.displayName,
      address: place.formattedAddress,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      googleMapsUri: place.googleMapsUri,
      photoName: place.photoName,
      photoAttributions: place.photoAttributions,
      openingMatch,
      score,
      description: this.buildGooglePlaceDescription(place, eventInput),
    };
  }

  private buildGooglePlaceDescription(
    place: GooglePlaceCandidate,
    eventInput: RecommendationEventInput,
  ) {
    if (place.description) {
      return place.description;
    }

    const typeText = this.formatPlaceType(place.primaryType ?? place.types?.[0]);
    const priceText = this.formatPriceLevel(place.priceLevel);
    const venueText = typeText ? `${typeText} option in ${eventInput.locationCity}` : `Option in ${eventInput.locationCity}`;

    return [
      venueText,
      priceText,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  private async attachPlacePhotos(
    recommendations: RankedPlaceRecommendation[],
  ): Promise<RankedPlaceRecommendation[]> {
    return Promise.all(
      recommendations.map(async (recommendation) => {
        if (!recommendation.photoName) return recommendation;

        let photoUrl: string | undefined;
        try {
          photoUrl = await this.googlePlacesService.getPhotoUri(recommendation.photoName);
        } catch (error: any) {
          this.logger.warn(`Google Places photo attachment failed for ${recommendation.placeId}: ${error.message}`);
        }

        return {
          ...recommendation,
          photoUrl,
        };
      }),
    );
  }

  private resolvePlannedVisitTime(
    eventInput: RecommendationEventInput,
    eventAnswers: any[],
  ): PlannedVisitTime {
    const parsedDate = new Date(String(eventInput.targetDate));
    const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const hasExplicitTime =
      date.getHours() !== 0 ||
      date.getMinutes() !== 0 ||
      /\d{1,2}:\d{2}/.test(String(eventInput.targetDate));

    const inferredMinutes = this.inferPreferredMinutes(eventAnswers);
    if (!hasExplicitTime && inferredMinutes !== undefined) {
      date.setHours(Math.floor(inferredMinutes / 60), inferredMinutes % 60, 0, 0);
    } else if (!hasExplicitTime) {
      date.setHours(19, 0, 0, 0);
    }

    const minutes = date.getHours() * 60 + date.getMinutes();
    return {
      date,
      day: date.getDay(),
      minutes,
      label: `${date.toLocaleDateString('en-CA')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    };
  }

  private inferPreferredMinutes(eventAnswers: any[]) {
    const text = eventAnswers
      .map((answer) => `${answer.question ?? ''} ${answer.answerValue ?? ''}`)
      .join(' ')
      .toLowerCase();

    const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (timeMatch) {
      return Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
    }

    if (/\b(brunch|breakfast|morning)\b/.test(text)) return 10 * 60;
    if (/\b(lunch|noon)\b/.test(text)) return 13 * 60;
    if (/\b(afternoon)\b/.test(text)) return 16 * 60;
    if (/\b(dinner|evening|night|bar|drinks|party)\b/.test(text)) return 20 * 60;
    return undefined;
  }

  private getOpeningMatch(place: GooglePlaceCandidate, plannedVisit: PlannedVisitTime): OpeningMatch {
    const currentMatch = this.matchOpeningHours(place.currentOpeningHours, plannedVisit);
    if (currentMatch.status !== 'unknown') return { ...currentMatch, source: 'current' };

    const regularMatch = this.matchOpeningHours(place.regularOpeningHours, plannedVisit);
    if (regularMatch.status !== 'unknown') return { ...regularMatch, source: 'regular' };

    return { status: 'unknown' };
  }

  private matchOpeningHours(
    openingHours: GooglePlacesOpeningHours | undefined,
    plannedVisit: PlannedVisitTime,
  ): OpeningMatch {
    const periods = openingHours?.periods ?? [];
    if (!periods.length) return { status: 'unknown' };

    const visitMinuteOfWeek = plannedVisit.day * 24 * 60 + plannedVisit.minutes;
    const isOpen = periods.some((period) => {
      if (period.open?.day === undefined || period.open.hour === undefined) return false;

      const open = period.open.day * 24 * 60 + period.open.hour * 60 + (period.open.minute ?? 0);
      const close =
        period.close?.day === undefined || period.close.hour === undefined
          ? open + 7 * 24 * 60
          : period.close.day * 24 * 60 + period.close.hour * 60 + (period.close.minute ?? 0);
      const normalizedClose = close <= open ? close + 7 * 24 * 60 : close;

      return (
        this.isMinuteWithinPeriod(visitMinuteOfWeek, open, normalizedClose) ||
        this.isMinuteWithinPeriod(visitMinuteOfWeek + 7 * 24 * 60, open, normalizedClose)
      );
    });

    return { status: isOpen ? 'open' : 'closed' };
  }

  private isMinuteWithinPeriod(value: number, open: number, close: number) {
    return value >= open && value < close;
  }

  private formatPlaceType(type?: string) {
    if (!type) return undefined;
    return type
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private formatPriceLevel(priceLevel?: string) {
    const labels: Record<string, string> = {
      PRICE_LEVEL_FREE: 'Free',
      PRICE_LEVEL_INEXPENSIVE: 'Inexpensive',
      PRICE_LEVEL_MODERATE: 'Moderate price',
      PRICE_LEVEL_EXPENSIVE: 'Expensive',
      PRICE_LEVEL_VERY_EXPENSIVE: 'Very expensive',
    };

    return priceLevel ? labels[priceLevel] : undefined;
  }

  private scorePlace(
    place: GooglePlaceCandidate & { planWeight: number },
    eventAnswers: any[],
    openingMatch: OpeningMatch = { status: 'unknown' },
  ) {
    const ratingScore = (place.rating ?? 0) * 20;
    const popularityScore = Math.log10((place.userRatingCount ?? 0) + 1) * 12;
    const queryWeightScore = place.planWeight * 10;
    const preferenceScore = this.scorePreferenceMatches(place, eventAnswers);
    const openingScore = openingMatch.status === 'open' ? 15 : openingMatch.status === 'closed' ? -35 : 0;

    return ratingScore + popularityScore + queryWeightScore + preferenceScore + openingScore;
  }

  private scorePreferenceMatches(place: GooglePlaceCandidate, eventAnswers: any[]) {
    const haystack = [
      place.displayName,
      place.formattedAddress,
      place.primaryType,
      ...(place.types ?? []),
      place.searchQuery,
    ]
      .join(' ')
      .toLowerCase();

    return eventAnswers.reduce((score, answer) => {
      const value = String(answer.answerValue ?? '').toLowerCase();
      if (!value || value.length < 3) return score;
      return haystack.includes(value) ? score + 8 : score;
    }, 0);
  }

  private dedupePlaces<T extends GooglePlaceCandidate>(places: T[]) {
    const byKey = new Map<string, T>();

    for (const place of places) {
      const key = place.id || `${place.displayName.toLowerCase()}-${place.formattedAddress.toLowerCase()}`;
      const existing = byKey.get(key);
      if (!existing || this.scorePlace(place as any, []) > this.scorePlace(existing as any, [])) {
        byKey.set(key, place);
      }
    }

    return Array.from(byKey.values());
  }

  private buildFallbackSearches(eventInput: RecommendationEventInput, eventAnswers: any[]): PlacesSearchPlanItem[] {
    const preferenceText = eventAnswers.map((answer) => answer.answerValue).filter(Boolean).join(' ');
    const location = `${eventInput.locationCity}, ${eventInput.locationCountry}`;

    return [
      {
        textQuery: `${preferenceText || eventInput.eventType} restaurant in ${location}`,
        includedType: 'restaurant',
        minRating: 4,
        weight: 1,
      },
      {
        textQuery: `${preferenceText || eventInput.eventType} bar cafe in ${location}`,
        minRating: 4,
        weight: 0.9,
      },
      {
        textQuery: `${preferenceText || eventInput.eventType} activity in ${location}`,
        minRating: 4,
        weight: 0.8,
      },
    ];
  }

  private ensureQueryHasLocation(query: string, eventInput: RecommendationEventInput) {
    const normalizedQuery = query.trim();
    const location = `${eventInput.locationCity}, ${eventInput.locationCountry}`;
    const lower = normalizedQuery.toLowerCase();

    if (lower.includes(eventInput.locationCity.toLowerCase()) || lower.includes(eventInput.locationCountry.toLowerCase())) {
      return normalizedQuery;
    }

    return `${normalizedQuery} in ${location}`;
  }

  private normalizeMinRating(value?: number) {
    if (value === undefined || Number.isNaN(value)) return undefined;
    return Math.min(Math.max(Math.ceil(value * 2) / 2, 0), 5);
  }

  private normalizePriceLevels(priceLevels?: string[]) {
    const allowed = new Set([
      'PRICE_LEVEL_INEXPENSIVE',
      'PRICE_LEVEL_MODERATE',
      'PRICE_LEVEL_EXPENSIVE',
      'PRICE_LEVEL_VERY_EXPENSIVE',
    ]);

    return (priceLevels ?? []).filter((level) => allowed.has(level));
  }

  private inferRegionCode(country: string) {
    const normalized = country.toLowerCase();
    if (normalized.includes('israel')) return 'IL';
    if (normalized.includes('united states') || normalized === 'usa') return 'US';
    if (normalized.includes('united kingdom')) return 'GB';
    return undefined;
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
