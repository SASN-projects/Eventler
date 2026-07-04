import { Injectable } from '@nestjs/common';
import { HistorySignalSummary, HistoryScope } from './recommendation-history.service';

/**
 * Structured context object for the event-recommendation-planner prompt.
 *
 * Each field is a pre-rendered, human-readable string section that maps
 * directly to a {{variable}} placeholder in the Langfuse prompt template.
 *
 * Design intent: Future recommendation signals should be added by enriching
 * the relevant section in this object (and the builder that produces it)
 * rather than by adding new top-level template variables.
 */
export interface RecommendationPromptContext {
  /** Core facts about the event (type, location, dates, participants). */
  eventCoreContext: string;

  /**
    * Safe summary of the current-event preferences.
    * For individual events this reflects the user's answers.
    * For group events this reflects the final aggregated group answers.
   */
  userPreferencesSummary: string;

  /**
   * Hard constraints the model must respect (location, date, participant
   * count, required output schema, forbidden fields).
   */
  constraintsSummary: string;

  /**
    * Optional signals: includes historical user or group preference signals
    * derived from past selected events (secondary, never overrides current
    * preferences). Falls back to a no-history message when unavailable.
   */
  optionalSignalsSummary: string;

  /**
  * Prioritisation policy: hard constraints → current-event preferences →
  * historical signals (secondary) → relevance → diversity → specificity →
  * practical usefulness → no hallucinations.
   */
  recommendationPolicy: string;

  /**
   * Exact JSON schema instruction that the model must follow for its output.
   * Must remain consistent with the parsing logic in RecommendationsService.
   */
  outputFormatInstructions: string;
}

/**
 * Input shape used by the builder — the same fields already extracted from
 * the Event entity inside RecommendationsService.
 */
export interface RecommendationEventInput {
  eventType: string;
  targetDate: string;
  locationCity: string;
  locationCountry: string;
  participantCount: number;
}

/**
 * A single collected slide answer.
 */
export interface RecommendationSlideAnswer {
  question: string;
  answerValue: string;
}

export interface RecommendationPromptContextOptions {
  preferenceScope?: HistoryScope;
  currentPreferencesSummary?: string;
}

/**
 * Builds the RecommendationPromptContext from event data, slide answers,
 * and an optional historical preference summary.
 *
 * Architecture notes:
 *  - Extending with a new future signal (budget, weather, etc.) means adding
 *    it to the appropriate section string here without changing the prompt
 *    template variables.
 *  - All section values are plain, sanitised strings — no undefined, null,
 *    JSON noise, or broken placeholders can leak through.
 *  - Historical signals are always placed in optionalSignalsSummary and are
 *    clearly marked as secondary — they must never override current-event
 *    preferences or hard constraints.
 */
@Injectable()
export class RecommendationPromptContextBuilder {
  /**
   * Build the full RecommendationPromptContext for one recommendation request.
   *
   * @param eventInput     Core event fields already extracted from the Event entity.
   * @param eventAnswers   Slide answers collected for this event (may be empty).
   * @param historySummary Optional aggregated history signal from RecommendationHistoryService.
   */
  build(
    eventInput: RecommendationEventInput,
    eventAnswers: RecommendationSlideAnswer[] = [],
    historySummary?: HistorySignalSummary,
    options: RecommendationPromptContextOptions = {},
  ): RecommendationPromptContext {
    const preferenceScope = options.preferenceScope ?? 'user';

    return {
      eventCoreContext: this.buildEventCoreContext(eventInput),
      userPreferencesSummary: this.buildCurrentPreferencesSummary(
        eventAnswers,
        preferenceScope,
        options.currentPreferencesSummary,
      ),
      constraintsSummary: this.buildConstraintsSummary(eventInput),
      optionalSignalsSummary: this.buildOptionalSignalsSummary(historySummary, preferenceScope),
      recommendationPolicy: this.buildRecommendationPolicy(preferenceScope),
      outputFormatInstructions: this.buildOutputFormatInstructions(),
    };
  }

  // ---------------------------------------------------------------------------
  // Section builders
  // ---------------------------------------------------------------------------

  private buildEventCoreContext(input: RecommendationEventInput): string {
    return [
      `- Event Type: ${input.eventType}`,
      `- Target Date: ${input.targetDate}`,
      `- Location: ${input.locationCity}, ${input.locationCountry}`,
      `- Number of Participants: ${input.participantCount}`,
    ].join('\n');
  }

  private buildCurrentPreferencesSummary(
    eventAnswers: RecommendationSlideAnswer[],
    preferenceScope: HistoryScope,
    currentPreferencesSummary?: string,
  ): string {
    if (currentPreferencesSummary && currentPreferencesSummary.trim().length > 0) {
      return currentPreferencesSummary.trim();
    }

    if (preferenceScope === 'group') {
      return this.buildGroupPreferencesSummary(eventAnswers);
    }

    if (!eventAnswers || eventAnswers.length === 0) {
      return 'No explicit user preferences were provided.';
    }

    const lines = eventAnswers
      .map((a) => `- ${a.question}: ${a.answerValue}`)
      .join('\n');

    return `The following preferences were collected from participant answers — every recommendation must reflect these:\n${lines}`;
  }

  private buildGroupPreferencesSummary(eventAnswers: RecommendationSlideAnswer[]): string {
    if (!eventAnswers || eventAnswers.length === 0) {
      return 'No final group answers were provided.';
    }

    const groupedAnswers = new Map<string, Map<string, number>>();

    for (const answer of eventAnswers) {
      const question = answer.question?.trim();
      const answerValue = answer.answerValue?.trim();
      if (!question || !answerValue) {
        continue;
      }

      const answersByQuestion = groupedAnswers.get(question) ?? new Map<string, number>();
      answersByQuestion.set(answerValue, (answersByQuestion.get(answerValue) ?? 0) + 1);
      groupedAnswers.set(question, answersByQuestion);
    }

    const lines = ['Final group answers/preferences (highest priority after hard constraints):'];

    for (const [question, answersByQuestion] of groupedAnswers.entries()) {
      const totalResponses = [...answersByQuestion.values()].reduce((sum, count) => sum + count, 0);
      const [winningAnswer, winningCount] = [...answersByQuestion.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0];

      lines.push(`- ${question}: ${winningAnswer} (${winningCount}/${totalResponses} responses)`);
    }

    return lines.length > 1 ? lines.join('\n') : 'No final group answers were provided.';
  }

  private buildConstraintsSummary(input: RecommendationEventInput): string {
    return [
      `- Location: recommendations must be suitable for ${input.locationCity}, ${input.locationCountry}.`,
      `- Date/time: recommendations must be plausible for ${input.targetDate}.`,
      `- Participants: recommendations must accommodate ${input.participantCount} people.`,
      '- Output schema: return exactly 3 recommendations. Each must have title, description, and address fields.',
      '- Do not include extra fields beyond title, description, and address.',
      '- Do not invent venues, addresses, or facts that cannot plausibly exist.',
    ].join('\n');
  }

  /**
   * Renders optional signals into the prompt context.
   *
   * When a historySummary is provided and contains a meaningful signal
   * (historySignalUsed=true), the aggregated summaryText is included here.
   * The historical signal is explicitly marked as secondary.
   *
   * When no history is available, a clear fallback message is used so the
   * model does not receive an empty section.
   *
   * Future contributors: additional signals (budget, weather, accessibility)
   * can be appended here without changing the prompt template variables.
   */
  private buildOptionalSignalsSummary(
    historySummary: HistorySignalSummary | undefined,
    preferenceScope: HistoryScope,
  ): string {
    const sections: string[] = [];

    if (historySummary && historySummary.summaryText.trim().length > 0) {
      sections.push(historySummary.summaryText);
    } else {
      sections.push(
        preferenceScope === 'group'
          ? 'No historical group selection data is available.'
          : 'No historical user selection data is available.',
      );
    }

    // Future signals (budget, weather, accessibility, preferred vibe, etc.)
    // will be appended here as additional sections when they become available.

    return sections.join('\n\n');
  }

  private buildRecommendationPolicy(preferenceScope: HistoryScope): string {
    const currentPreferenceLabel = preferenceScope === 'group'
      ? 'final group answers/preferences'
      : 'current user preferences';
    const historicalLabel = preferenceScope === 'group'
      ? 'historical group preference signals'
      : 'historical user preference signals';

    return [
      'PRIORITY ORDER — always follow this exact order:',
      '1. Hard constraints come first — never violate location, date, participant count, or schema requirements.',
      `2. ${currentPreferenceLabel} come second — recommendations must fully reflect the current event's explicit preferences for THIS event.`,
      `3. ${historicalLabel} are a SOFT SECONDARY signal only — use them to break ties or add variety, not to override current preferences.`,
      '4. Relevance to event type — tailor suggestions to the nature of the event.',
      '5. Diversity — each recommendation must be meaningfully different from the others.',
      '6. Specificity — be concrete and actionable; avoid vague or generic suggestions.',
      '7. Practical usefulness — recommendations should be realistic and achievable.',
      '8. Avoid hallucinations — do not invent venues, phone numbers, or addresses.',
      '',
      'Historical preferences are only a soft secondary signal. They must never override explicit current-event preferences or hard constraints.',
      'If current-event preferences conflict with historical behavior, current-event preferences win.',
      'Avoid overfitting to historical behavior. Avoid assuming the user always wants the same type of recommendation.',
    ].join('\n');
  }

  private buildOutputFormatInstructions(): string {
    return [
      'Return a JSON object with a single key "recommendedEvents" containing an array of exactly 3 objects.',
      'Each object must include:',
      '  - "title": a short, descriptive title (string)',
      '  - "description": a meaningful description of the recommendation (string)',
      '  - "address": a plausible physical address suitable for the location (string)',
      'Do not include any additional keys. Do not wrap the output in markdown.',
      '',
      'Example structure:',
      '{',
      '  "recommendedEvents": [',
      '    { "title": "...", "description": "...", "address": "..." },',
      '    { "title": "...", "description": "...", "address": "..." },',
      '    { "title": "...", "description": "...", "address": "..." }',
      '  ]',
      '}',
    ].join('\n');
  }
}
