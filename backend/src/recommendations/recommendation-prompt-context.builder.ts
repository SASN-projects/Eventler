import { Injectable } from '@nestjs/common';

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
   * Safe summary of user answers/preferences from slide responses.
   * Personalises the recommendations. Falls back to a clear "no preferences"
   * message when the event has no collected answers.
   */
  userPreferencesSummary: string;

  /**
   * Hard constraints the model must respect (location, date, participant
   * count, required output schema, forbidden fields).
   */
  constraintsSummary: string;

  /**
   * Optional / future signals such as budget, weather, user history, etc.
   * Currently always set to the "no signals" fallback until those sources
   * are wired in a future PR.
   */
  optionalSignalsSummary: string;

  /**
   * Prioritisation policy: hard constraints → preferences → relevance →
   * diversity → specificity → practical usefulness → no hallucinations.
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

/**
 * Builds the RecommendationPromptContext from event data and slide answers.
 *
 * Architecture notes:
 *  - Extending with a new future signal (budget, weather, etc.) means adding
 *    it to the appropriate section string here without changing the prompt
 *    template variables.
 *  - All section values are plain, sanitised strings — no undefined, null,
 *    JSON noise, or broken placeholders can leak through.
 */
@Injectable()
export class RecommendationPromptContextBuilder {
  /**
   * Build the full RecommendationPromptContext for one recommendation request.
   *
   * @param eventInput  Core event fields already extracted from the Event entity.
   * @param eventAnswers Slide answers collected for this event (may be empty).
   */
  build(
    eventInput: RecommendationEventInput,
    eventAnswers: RecommendationSlideAnswer[] = [],
  ): RecommendationPromptContext {
    return {
      eventCoreContext: this.buildEventCoreContext(eventInput),
      userPreferencesSummary: this.buildUserPreferencesSummary(eventAnswers),
      constraintsSummary: this.buildConstraintsSummary(eventInput),
      optionalSignalsSummary: this.buildOptionalSignalsSummary(),
      recommendationPolicy: this.buildRecommendationPolicy(),
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

  private buildUserPreferencesSummary(
    eventAnswers: RecommendationSlideAnswer[],
  ): string {
    if (!eventAnswers || eventAnswers.length === 0) {
      return 'No explicit user preferences were provided.';
    }

    const lines = eventAnswers
      .map((a) => `- ${a.question}: ${a.answerValue}`)
      .join('\n');

    return `The following preferences were collected from participant answers — every recommendation must reflect these:\n${lines}`;
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
   * Placeholder for future optional signals (budget, weather, user history,
   * preferred vibe, accessibility, etc.).
   *
   * Future contributors: add enriched signal strings here without changing the
   * prompt template variables. If a signal is unavailable, omit it gracefully.
   */
  private buildOptionalSignalsSummary(): string {
    // No optional signals are wired yet. Future signals (budget, weather,
    // user history, accessibility, preferred atmosphere, etc.) will be
    // appended here as they become available.
    return 'No additional optional signals were provided.';
  }

  private buildRecommendationPolicy(): string {
    return [
      '1. Hard constraints come first — never violate location, date, participant, or schema requirements.',
      '2. User preferences come second — recommendations must reflect any stated preferences.',
      '3. Relevance to event type — tailor suggestions to the nature of the event.',
      '4. Diversity — each recommendation must be meaningfully different from the others.',
      '5. Specificity — be concrete and actionable; avoid vague or generic suggestions.',
      '6. Practical usefulness — recommendations should be realistic and achievable.',
      '7. Avoid hallucinations — do not invent venues, phone numbers, or addresses.',
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
