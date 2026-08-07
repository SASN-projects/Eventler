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
   * For group events this reflects the current/provisional group preference summary derived
   * from current group member answers.
   *
   * NOTE: A canonical finalized group-answer artifact does not yet exist. When it does,
   * this field should reflect that finalized artifact instead of the provisional summary.
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
 * Builds a current/provisional group preference summary from raw group member answers,
 * explicitly surfacing disagreement between group members instead of only reporting the
 * winning answer.
 *
 * CURRENT BEHAVIOR: Derives a per-question answer distribution directly from the
 * EventResponse rows collected from group members for this event. This is a provisional
 * approach because a canonical finalized group-answer artifact does not yet exist.
 *
 * Conflict handling:
 *  - Unanimous questions are reported as such.
 *  - Non-unanimous questions report the full answer distribution (not just the winner),
 *    and are flagged with a CONFLICT NOTICE instructing the model to favor recommendations
 *    that are broadly acceptable to dissenting members rather than only the majority, and
 *    to use the 3 recommendation slots to reflect the range of preferences where reasonable.
 *  - When there is no strict majority (a tie), this is called out explicitly so the model
 *    does not assume false consensus.
 *
 * FUTURE BEHAVIOR: When a finalized group-answer artifact is implemented, this function
 * should be replaced by consuming that artifact instead.
 *
 * This is exported as a standalone function (rather than only a private builder method) so
 * RecommendationsService — which precomputes this summary early for reuse in judge metadata —
 * and RecommendationPromptContextBuilder share a single source of truth and cannot drift apart.
 */
export function buildGroupConsensusSummary(eventAnswers: RecommendationSlideAnswer[] = []): string {
  if (!eventAnswers || eventAnswers.length === 0) {
    return 'No current group member answers were provided.';
  }

  const groupedAnswers = new Map<string, Map<string, number>>();

  for (const answer of eventAnswers) {
    const question = answer?.question?.trim();
    const answerValue = answer?.answerValue?.trim();
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
  const conflictingQuestions: string[] = [];

  for (const [question, answersByQuestion] of groupedAnswers.entries()) {
    const distribution = [...answersByQuestion.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    const totalResponses = distribution.reduce((sum, [, count]) => sum + count, 0);
    const [topAnswer, topCount] = distribution[0];

    if (distribution.length === 1) {
      lines.push(`- ${question}: unanimous — all ${topCount}/${totalResponses} responses chose "${topAnswer}".`);
      continue;
    }

    conflictingQuestions.push(question);
    const hasStrictMajority = topCount * 2 > totalResponses;

    if (hasStrictMajority) {
      const otherAnswersText = distribution
        .slice(1)
        .map(([value, count]) => `"${value}" (${count}/${totalResponses})`)
        .join(', ');
      lines.push(
        `- ${question}: majority prefers "${topAnswer}" (${topCount}/${totalResponses}), but this is NOT unanimous — other member(s) preferred ${otherAnswersText}.`,
      );
    } else {
      const allOptionsText = distribution
        .map(([value, count]) => `"${value}" (${count}/${totalResponses})`)
        .join(', ');
      lines.push(`- ${question}: no clear majority — group is evenly split between ${allOptionsText}.`);
    }
  }

  if (conflictingQuestions.length > 0) {
    lines.push(
      '',
      `CONFLICT NOTICE: The group did NOT fully agree on: ${conflictingQuestions.join(', ')}. ` +
        'Do not simply discard the minority preferences. Favor recommendations that reasonably satisfy the ' +
        'majority while remaining broadly acceptable to dissenting members, and use the 3 recommendation slots ' +
        'to reflect the range of group preferences where reasonable, rather than 3 near-identical options that ' +
        'only please the majority.',
    );
  }

  return lines.join('\n');
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

  /**
   * Builds a current/provisional group preference summary from raw group member answers.
   *
   * Delegates to {@link buildGroupConsensusSummary}, the single source of truth for
   * deriving this summary, so that RecommendationsService (which precomputes this summary
   * for reuse in judge metadata) and this builder never drift apart.
   */
  private buildGroupPreferencesSummary(eventAnswers: RecommendationSlideAnswer[]): string {
    return buildGroupConsensusSummary(eventAnswers);
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
    // CURRENT GROUP BEHAVIOR: The policy uses the current/provisional group preference summary
    // (derived from current group member answers) as the second-priority signal.
    //
    // TODO: When finalized group answers exist, this label should become
    // 'finalized group answers/preferences' and the policy order will be:
    //   current group event hard constraints > finalized group answers/preferences > historical group preferences
    const currentPreferenceLabel = preferenceScope === 'group'
      ? 'current/provisional group preference summary'
      : 'current user preferences';
    const historicalLabel = preferenceScope === 'group'
      ? 'historical group preference signals'
      : 'historical user preference signals';

    const groupConflictGuidance = preferenceScope === 'group'
      ? [
        '',
        'GROUP CONFLICT HANDLING — this event was answered by multiple group members and their answers may disagree:',
        '- Treat a CONFLICT NOTICE (if present in the group preference summary) as a signal that the group is not unanimous on that question.',
        '- Never silently discard minority/dissenting preferences — a majority is not the same as consensus.',
        '- Prefer recommendations that reasonably satisfy the majority while remaining broadly acceptable to dissenting members (compromise options), rather than options that only please the majority and would alienate the rest of the group.',
        '- When a question has no clear majority (an even split/tie), do not arbitrarily pick one side — favor recommendations that work reasonably well under either preference.',
        '- Use the 3 recommendation slots deliberately: where preferences conflict, it is acceptable (and often better) for the 3 recommendations to collectively cover the range of group preferences instead of all leaning toward a single side.',
      ]
      : [];

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
      ...groupConflictGuidance,
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
