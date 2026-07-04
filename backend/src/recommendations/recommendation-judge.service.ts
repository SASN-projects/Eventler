import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchemaType, ObjectSchema } from '@google/generative-ai';
import { GeminiService } from '../gemini/gemini.service';
import { ILangfuseTrace } from '../langfuse/interfaces/langfuse.interface';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JudgeInput {
  /** Event type (e.g. "casual", "corporate"). No raw user data. */
  eventType: string;
  locationCity: string;
  locationCountry: string;
  participantCount: number;
  targetDate: string;
  /** Indicates whether the current event is user-scoped or group-scoped. */
  preferenceScope: 'user' | 'group';
  /** Minimized current-event preference summary when raw answers should not be exposed. */
  currentPreferencesSummary?: string;
  /** Actual user preferences for individual flow. */
  userPreferences: Array<{
    question: string;
    answerValue: string;
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    address: string;
  }>;
  /**
   * Safe, aggregated historical preference summary text produced by
   * RecommendationHistoryService. Never contains raw event/answer content.
   * Undefined when no history is available.
   */
  historySummaryText?: string;
  /** Scope of the historical summary when provided. */
  historyScope?: 'user' | 'group';
}

export interface JudgeScores {
  relevance_to_event: number;
  preference_alignment: number;
  location_fit: number;
  date_time_fit: number;
  specificity: number;
  diversity: number;
  /** Mapped to numeric: low=1, medium=0.5, high=0 */
  hallucination_risk_numeric: number;
  overall_quality: number;
  reason?: string;
}

/** Internal config resolved at construction time. */
interface JudgeConfig {
  enabled: boolean;
  model: string;
  timeoutMs: number;
  sampleRate: number;
  maxInputLength: number;
  maxOutputLength: number;
}

const HALLUCINATION_MAP: Record<string, number> = {
  low: 1,
  medium: 0.5,
  high: 0,
};

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_SAMPLE_RATE = 1;
const DEFAULT_MAX_INPUT_LENGTH = 4_000;
const DEFAULT_MAX_OUTPUT_LENGTH = 2_000;

// ---------------------------------------------------------------------------
// Response schema for structured JSON output from the judge model
// ---------------------------------------------------------------------------
const JUDGE_RESPONSE_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    relevance_to_event: { type: SchemaType.NUMBER },
    preference_alignment: { type: SchemaType.NUMBER },
    location_fit: { type: SchemaType.NUMBER },
    date_time_fit: { type: SchemaType.NUMBER },
    specificity: { type: SchemaType.NUMBER },
    diversity: { type: SchemaType.NUMBER },
    hallucination_risk: { type: SchemaType.STRING },
    overall_quality: { type: SchemaType.NUMBER },
    reason: { type: SchemaType.STRING },
  },
  required: [
    'relevance_to_event',
    'preference_alignment',
    'location_fit',
    'date_time_fit',
    'specificity',
    'diversity',
    'hallucination_risk',
    'overall_quality',
    'reason',
  ],
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class RecommendationJudgeService {
  private readonly logger = new Logger(RecommendationJudgeService.name);
  private readonly config: JudgeConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiService: GeminiService,
  ) {
    this.config = this.resolveConfig();

    this.logger.log(`LLM Judge mode: ${this.config.enabled ? 'ENABLED' : 'DISABLED'}`);
    if (this.config.enabled) {
      this.logger.log(
        `  model=${this.config.model}, sampleRate=${this.config.sampleRate}, timeoutMs=${this.config.timeoutMs}`,
      );
    }
  }

  /** Returns true when the judge is both enabled and the random sample passes. */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /** Returns true when the judge is enabled AND a random sample allows this call. */
  shouldSample(): boolean {
    if (!this.config.enabled) return false;
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Run LLM-as-a-Judge evaluation, attach scores to the Langfuse trace.
   *
   * This method is fire-and-forget: it NEVER throws into the caller.
   * All failures are caught, logged safely, and recorded as Langfuse metadata.
   */
  async evaluate(input: JudgeInput, trace: ILangfuseTrace): Promise<void> {
    const startMs = Date.now();

    try {
      const prompt = this.buildJudgePrompt(input);
      const truncatedPrompt = prompt.slice(0, this.config.maxInputLength);

      const rawResult = await this.withTimeout(
        this.geminiService.generateJsonContent<Record<string, any>>({
          prompt: truncatedPrompt,
          responseSchema: JUDGE_RESPONSE_SCHEMA,
          parentTrace: trace,
          promptName: 'recommendation-llm-judge',
          promptVersion: '1.0.0',
          modelName: this.config.model,
          metadata: {
            judge_enabled: true,
            judge_model: this.config.model,
            judge_sample_rate: this.config.sampleRate,
          },
        }),
        this.config.timeoutMs,
      );

      const latencyMs = Date.now() - startMs;
      const scores = this.parseJudgeResult(rawResult);

      this.attachScores(scores, trace, latencyMs);
    } catch (err: any) {
      const latencyMs = Date.now() - startMs;
      this.logger.warn(`LLM Judge evaluation failed: ${err.message}`);
      this.attachFailureMetadata(trace, err.message, latencyMs);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private resolveConfig(): JudgeConfig {
    const enabled =
      this.configService.get<string>('RECOMMENDATION_JUDGE_ENABLED') === 'true';

    const model =
      this.configService.get<string>('RECOMMENDATION_JUDGE_MODEL') ||
      this.configService.get<string>('GOOGLE_GEMINI_MODEL') ||
      DEFAULT_MODEL;

    const timeoutMs = this.parsePositiveInt(
      this.configService.get<string>('RECOMMENDATION_JUDGE_TIMEOUT_MS'),
      DEFAULT_TIMEOUT_MS,
    );

    const sampleRate = this.parseProbability(
      this.configService.get<string>('RECOMMENDATION_JUDGE_SAMPLE_RATE'),
      DEFAULT_SAMPLE_RATE,
    );

    const maxInputLength = this.parsePositiveInt(
      this.configService.get<string>('RECOMMENDATION_JUDGE_MAX_INPUT_LENGTH'),
      DEFAULT_MAX_INPUT_LENGTH,
    );

    const maxOutputLength = this.parsePositiveInt(
      this.configService.get<string>('RECOMMENDATION_JUDGE_MAX_OUTPUT_LENGTH'),
      DEFAULT_MAX_OUTPUT_LENGTH,
    );

    return { enabled, model, timeoutMs, sampleRate, maxInputLength, maxOutputLength };
  }

  private buildJudgePrompt(input: JudgeInput): string {
    const recLines = input.recommendations
      .map(
        (r, i) =>
          `${i + 1}. Title: "${r.title}"\n   Description: "${r.description.slice(0, this.config.maxOutputLength)}"\n   Address: "${r.address}"`,
      )
      .join('\n\n');

    const currentPreferenceLabel = input.preferenceScope === 'group'
      ? 'Final Group Answers/Preferences (CURRENT GROUP EVENT — highest priority after hard constraints):'
      : 'User Preferences (CURRENT EVENT — highest priority after hard constraints):';

    const preferenceLines = input.currentPreferencesSummary && input.currentPreferencesSummary.trim().length > 0
      ? input.currentPreferencesSummary
      : input.userPreferences && input.userPreferences.length > 0
        ? input.userPreferences.map((p) => `  - ${p.question}: ${p.answerValue}`).join('\n')
        : input.preferenceScope === 'group'
          ? '  No final group answers were provided.'
          : '  No explicit user preferences were provided.';

    const historicalLabel = input.historyScope === 'group'
      ? 'Historical Group Preference Signals'
      : 'Historical User Preference Signals';
    const historicalFallback = input.historyScope === 'group'
      ? 'No historical group selection data is available.'
      : 'No historical user selection data is available.';
    const historicalSignalSection = input.historySummaryText
      ? `${historicalLabel} (SECONDARY — must not override current-event preferences):\n${input.historySummaryText}`
      : `${historicalLabel}: ${historicalFallback}`;

    return `You are an expert event planning evaluator.
Evaluate the following event recommendations against the event context and return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

Event Context:
- Event Type: ${input.eventType}
- Location: ${input.locationCity}, ${input.locationCountry}
- Date: ${input.targetDate}
- Participants: ${input.participantCount}
${currentPreferenceLabel}
${preferenceLines}

${historicalSignalSection}

Generated Recommendations:
${recLines}

Priority order used during generation: (1) hard constraints, (2) current-event explicit preferences or final group answers, (3) historical signals (secondary).

Note: Historical preference signals are a SECONDARY input that must never override explicit current-event preferences.
When scoring preference_alignment:
- Score LOWER if recommendations appear to ignore current-event explicit preferences or final group answers in favour of historical behavior.
- Score LOWER if recommendations overfit to history at the expense of current-event context.
- Score HIGHER if recommendations respect current-event preferences first, then appropriately incorporate history as variety.

Score each criterion on a scale of 0 to 1 (0=poor, 1=excellent).
For hallucination_risk, use one of: "low", "medium", or "high".
The "reason" field should be a brief explanation without exposing private user data.

Return exactly this JSON schema:
{
  "relevance_to_event": <0-1>,
  "preference_alignment": <0-1>,
  "location_fit": <0-1>,
  "date_time_fit": <0-1>,
  "specificity": <0-1>,
  "diversity": <0-1>,
  "hallucination_risk": "low" | "medium" | "high",
  "overall_quality": <0-1>,
  "reason": "<brief explanation>"
}`;
  }

  private parseJudgeResult(raw: Record<string, any>): JudgeScores {
    const clamp = (v: any, fallback: number): number => {
      const n = typeof v === 'number' ? v : parseFloat(v);
      return isNaN(n) ? fallback : Math.min(1, Math.max(0, n));
    };

    const hallucinationRaw =
      typeof raw.hallucination_risk === 'string'
        ? raw.hallucination_risk.toLowerCase().trim()
        : 'medium';

    return {
      relevance_to_event: clamp(raw.relevance_to_event, 0),
      preference_alignment: clamp(raw.preference_alignment, 0),
      location_fit: clamp(raw.location_fit, 0),
      date_time_fit: clamp(raw.date_time_fit, 0),
      specificity: clamp(raw.specificity, 0),
      diversity: clamp(raw.diversity, 0),
      hallucination_risk_numeric: HALLUCINATION_MAP[hallucinationRaw] ?? 0.5,
      overall_quality: clamp(raw.overall_quality, 0),
      reason: typeof raw.reason === 'string' ? raw.reason.slice(0, 500) : undefined,
    };
  }

  private attachScores(scores: JudgeScores, trace: ILangfuseTrace, latencyMs: number): void {
    const numericScores: Array<{ name: string; value: number }> = [
      { name: 'judge_relevance_to_event', value: scores.relevance_to_event },
      { name: 'judge_preference_alignment', value: scores.preference_alignment },
      { name: 'judge_location_fit', value: scores.location_fit },
      { name: 'judge_date_time_fit', value: scores.date_time_fit },
      { name: 'judge_specificity', value: scores.specificity },
      { name: 'judge_diversity', value: scores.diversity },
      { name: 'judge_hallucination_risk', value: scores.hallucination_risk_numeric },
      { name: 'judge_overall_quality', value: scores.overall_quality },
      { name: 'judge_latency_ms', value: latencyMs },
      { name: 'judge_failed', value: 0 },
    ];

    for (const { name, value } of numericScores) {
      try {
        trace.score({ name, value });
      } catch (err: any) {
        this.logger.warn(`Failed to attach judge score "${name}": ${err.message}`);
      }
    }
  }

  private attachFailureMetadata(trace: ILangfuseTrace, errorMessage: string, latencyMs: number): void {
    const failureScores: Array<{ name: string; value: number }> = [
      { name: 'judge_failed', value: 1 },
      { name: 'judge_latency_ms', value: latencyMs },
    ];

    for (const { name, value } of failureScores) {
      try {
        trace.score({ name, value });
      } catch (err: any) {
        this.logger.warn(`Failed to attach judge failure score "${name}": ${err.message}`);
      }
    }

    // Log the error type without the full message to avoid leaking model responses
    this.logger.warn(`Judge failed after ${latencyMs}ms: ${errorMessage.slice(0, 200)}`);
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`LLM Judge timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
      promise
        .then((v) => {
          clearTimeout(timer);
          resolve(v);
        })
        .catch((e) => {
          clearTimeout(timer);
          reject(e instanceof Error ? e : new Error(String(e)));
        });
    });
  }

  private parsePositiveInt(raw: string | undefined, fallback: number): number {
    const n = parseInt(raw ?? '', 10);
    return isNaN(n) || n <= 0 ? fallback : n;
  }

  private parseProbability(raw: string | undefined, fallback: number): number {
    const n = parseFloat(raw ?? '');
    if (isNaN(n)) return fallback;
    return Math.min(1, Math.max(0, n));
  }
}
