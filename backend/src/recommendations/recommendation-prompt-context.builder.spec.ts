import {
  RecommendationPromptContextBuilder,
  RecommendationEventInput,
  RecommendationSlideAnswer,
} from './recommendation-prompt-context.builder';
import { HistorySignalSummary } from './recommendation-history.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const baseInput: RecommendationEventInput = {
  eventType: 'casual',
  targetDate: '2025-12-31',
  locationCity: 'New York',
  locationCountry: 'USA',
  participantCount: 5,
};

const twoAnswers: RecommendationSlideAnswer[] = [
  { question: 'Vibe', answerValue: 'Relaxed' },
  { question: 'Budget', answerValue: 'Medium' },
];

const groupAnswers: RecommendationSlideAnswer[] = [
  { question: 'Vibe', answerValue: 'Relaxed' },
  { question: 'Vibe', answerValue: 'Relaxed' },
  { question: 'Vibe', answerValue: 'Energetic' },
  { question: 'Budget', answerValue: 'Medium' },
  { question: 'Budget', answerValue: 'Medium' },
];

const makeHistorySummary = (
  partial: Partial<HistorySignalSummary> = {},
): HistorySignalSummary => ({
  scope: 'user',
  historyItemsCount: 5,
  historySignalUsed: true,
  dominantEventTypes: ['individual'],
  preferredLocations: ['Tel Aviv'],
  preferredCategories: ['restaurant'],
  summaryText:
    'Historical user preference signals (secondary — must not override current-event preferences):\n- User often selected restaurant-related recommendations.\n- User frequently organized individual-type events.\n- User has previously preferred events in: Tel Aviv.\n- These signals are SECONDARY. The current event\'s explicit preferences and constraints take priority.',
  ...partial,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('RecommendationPromptContextBuilder', () => {
  let builder: RecommendationPromptContextBuilder;

  beforeEach(() => {
    builder = new RecommendationPromptContextBuilder();
  });

  // ── eventCoreContext ───────────────────────────────────────────────────────
  describe('eventCoreContext', () => {
    it('includes event type', () => {
      const { eventCoreContext } = builder.build(baseInput, []);
      expect(eventCoreContext).toContain('casual');
    });

    it('includes location city and country', () => {
      const { eventCoreContext } = builder.build(baseInput, []);
      expect(eventCoreContext).toContain('New York');
      expect(eventCoreContext).toContain('USA');
    });

    it('includes target date', () => {
      const { eventCoreContext } = builder.build(baseInput, []);
      expect(eventCoreContext).toContain('2025-12-31');
    });

    it('includes participant count', () => {
      const { eventCoreContext } = builder.build(baseInput, []);
      expect(eventCoreContext).toContain('5');
    });
  });

  // ── userPreferencesSummary ─────────────────────────────────────────────────
  describe('userPreferencesSummary', () => {
    it('contains summarised preferences when answers exist', () => {
      const { userPreferencesSummary } = builder.build(baseInput, twoAnswers);
      expect(userPreferencesSummary).toContain('Vibe');
      expect(userPreferencesSummary).toContain('Relaxed');
      expect(userPreferencesSummary).toContain('Budget');
      expect(userPreferencesSummary).toContain('Medium');
    });

    it('contains the exact fallback text when answers array is empty', () => {
      const { userPreferencesSummary } = builder.build(baseInput, []);
      expect(userPreferencesSummary).toBe('No explicit user preferences were provided.');
    });

    it('contains the exact fallback text when answers are omitted (default param)', () => {
      const { userPreferencesSummary } = builder.build(baseInput);
      expect(userPreferencesSummary).toBe('No explicit user preferences were provided.');
    });

    it('changing user answers changes userPreferencesSummary', () => {
      const summaryA = builder.build(baseInput, [
        { question: 'Vibe', answerValue: 'Relaxed' },
      ]).userPreferencesSummary;

      const summaryB = builder.build(baseInput, [
        { question: 'Vibe', answerValue: 'Energetic' },
      ]).userPreferencesSummary;

      expect(summaryA).not.toBe(summaryB);
      expect(summaryA).toContain('Relaxed');
      expect(summaryB).toContain('Energetic');
    });

    it('userPreferencesSummary is still present when historySummary is also provided', () => {
      const { userPreferencesSummary } = builder.build(
        baseInput,
        twoAnswers,
        makeHistorySummary(),
      );
      expect(userPreferencesSummary).toContain('Vibe');
      expect(userPreferencesSummary).toContain('Relaxed');
    });

    it('group flow renders a final group summary instead of raw individual answers', () => {
      const { userPreferencesSummary } = builder.build(
        baseInput,
        groupAnswers,
        makeHistorySummary({ scope: 'group' }),
        { preferenceScope: 'group' },
      );

      expect(userPreferencesSummary).toContain('Final group answers/preferences');
      expect(userPreferencesSummary).toContain('Vibe');
      expect(userPreferencesSummary).toContain('Budget');
      expect(userPreferencesSummary).toContain('Relaxed');
    });
  });

  // ── constraintsSummary ────────────────────────────────────────────────────
  describe('constraintsSummary', () => {
    it('mentions location city and country', () => {
      const { constraintsSummary } = builder.build(baseInput, []);
      expect(constraintsSummary).toContain('New York');
      expect(constraintsSummary).toContain('USA');
    });

    it('mentions participant count', () => {
      const { constraintsSummary } = builder.build(baseInput, []);
      expect(constraintsSummary).toContain('5');
    });

    it('mentions schema constraint (exactly 3 recommendations)', () => {
      const { constraintsSummary } = builder.build(baseInput, []);
      expect(constraintsSummary).toContain('3');
    });
  });

  // ── optionalSignalsSummary — no history ───────────────────────────────────
  describe('optionalSignalsSummary — no history', () => {
    it('contains the "no historical data" fallback when no historySummary is provided', () => {
      const { optionalSignalsSummary } = builder.build(baseInput, []);
      expect(optionalSignalsSummary).toContain(
        'No historical user selection data is available.',
      );
    });

    it('contains the "no historical data" fallback when historySummary.historySignalUsed is false', () => {
      const noHistorySummary = makeHistorySummary({
        historySignalUsed: false,
        summaryText: 'No historical user selection data is available.',
      });
      const { optionalSignalsSummary } = builder.build(baseInput, [], noHistorySummary);
      expect(optionalSignalsSummary).toContain(
        'No historical user selection data is available.',
      );
    });

    it('does NOT contain "No additional optional signals were provided." anymore', () => {
      const { optionalSignalsSummary } = builder.build(baseInput, []);
      expect(optionalSignalsSummary).not.toContain(
        'No additional optional signals were provided.',
      );
    });
  });

  // ── optionalSignalsSummary — with history ─────────────────────────────────
  describe('optionalSignalsSummary — with history', () => {
    it('includes historySummary.summaryText when historySignalUsed is true', () => {
      const history = makeHistorySummary();
      const { optionalSignalsSummary } = builder.build(baseInput, [], history);

      expect(optionalSignalsSummary).toContain(history.summaryText);
    });

    it('includes "secondary" keyword to label history as lower-priority', () => {
      const history = makeHistorySummary();
      const { optionalSignalsSummary } = builder.build(baseInput, [], history);

      expect(optionalSignalsSummary.toLowerCase()).toContain('secondary');
    });

    it('does NOT contain "No historical user selection data is available." when history exists', () => {
      const history = makeHistorySummary();
      const { optionalSignalsSummary } = builder.build(baseInput, [], history);

      expect(optionalSignalsSummary).not.toContain(
        'No historical user selection data is available.',
      );
    });

    it('includes group history summary when group scope is provided', () => {
      const history = makeHistorySummary({
        scope: 'group',
        summaryText:
          'Historical group preference signals (secondary — must not override current-event preferences):\n- This group often selected restaurant-related recommendations.',
      });
      const { optionalSignalsSummary } = builder.build(
        baseInput,
        groupAnswers,
        history,
        { preferenceScope: 'group' },
      );

      expect(optionalSignalsSummary).toContain('Historical group preference signals');
      expect(optionalSignalsSummary).not.toContain('No historical group selection data is available.');
    });

    it('uses a group fallback when group history is empty', () => {
      const history = makeHistorySummary({
        scope: 'group',
        historySignalUsed: false,
        summaryText: 'No historical group selection data is available.',
      });
      const { optionalSignalsSummary } = builder.build(
        baseInput,
        groupAnswers,
        history,
        { preferenceScope: 'group' },
      );

      expect(optionalSignalsSummary).toContain('No historical group selection data is available.');
    });

    it('does not dump raw recommendation titles or addresses into optionalSignalsSummary', () => {
      const history = makeHistorySummary({
        // summaryText that a real history service would produce — keyword-only, no raw content
        summaryText:
          'Historical user preference signals (secondary):\n- User often selected restaurant-related recommendations.',
      });
      const { optionalSignalsSummary } = builder.build(baseInput, [], history);

      // Assert that the content is only what summaryText provides — no leakage of raw data
      expect(optionalSignalsSummary).not.toContain('42 Main St');
      expect(optionalSignalsSummary).not.toContain('Raw Title Text');
    });
  });

  // ── recommendationPolicy — priority order ─────────────────────────────────
  describe('recommendationPolicy — priority order', () => {
    it('is a non-empty string', () => {
      const { recommendationPolicy } = builder.build(baseInput, []);
      expect(recommendationPolicy.length).toBeGreaterThan(10);
    });

    it('explicitly states that historical preferences are a soft secondary signal', () => {
      const { recommendationPolicy } = builder.build(baseInput, []);
      expect(recommendationPolicy.toLowerCase()).toContain('secondary');
    });

    it('states that historical preferences must not override current-event preferences', () => {
      const { recommendationPolicy } = builder.build(baseInput, []);
      expect(recommendationPolicy.toLowerCase()).toContain('must never override');
    });

    it('contains the priority order: hard constraints first', () => {
      const { recommendationPolicy } = builder.build(baseInput, []);
      expect(recommendationPolicy.toLowerCase()).toContain('hard constraints');
    });

    it('contains reference to current-event preferences coming second', () => {
      const { recommendationPolicy } = builder.build(baseInput, []);
      // Should mention current-event preferences have higher priority
      expect(recommendationPolicy.toLowerCase()).toContain('current-event');
    });

    it('says current-event preferences win if they conflict with history', () => {
      const { recommendationPolicy } = builder.build(baseInput, []);
      expect(recommendationPolicy.toLowerCase()).toContain('current-event preferences win');
    });

    it('includes group-specific priority rules when scope is group', () => {
      const { recommendationPolicy } = builder.build(
        baseInput,
        groupAnswers,
        makeHistorySummary({ scope: 'group' }),
        { preferenceScope: 'group' },
      );

      expect(recommendationPolicy.toLowerCase()).toContain('final group answers/preferences');
      expect(recommendationPolicy.toLowerCase()).toContain('historical group preference signals');
    });

    it('mentions avoiding overfitting to historical behavior', () => {
      const { recommendationPolicy } = builder.build(baseInput, []);
      expect(recommendationPolicy.toLowerCase()).toContain('overfitting');
    });
  });

  // ── outputFormatInstructions ──────────────────────────────────────────────
  describe('outputFormatInstructions', () => {
    it('mentions the required JSON key "recommendedEvents"', () => {
      const { outputFormatInstructions } = builder.build(baseInput, []);
      expect(outputFormatInstructions).toContain('recommendedEvents');
    });

    it('mentions required fields: title, description, address', () => {
      const { outputFormatInstructions } = builder.build(baseInput, []);
      expect(outputFormatInstructions).toContain('title');
      expect(outputFormatInstructions).toContain('description');
      expect(outputFormatInstructions).toContain('address');
    });
  });

  // ── null/undefined safety ─────────────────────────────────────────────────
  describe('null/undefined safety', () => {
    it('does not produce the string "undefined" anywhere in the context (no history)', () => {
      const context = builder.build(baseInput, twoAnswers);
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain('"undefined"');
      expect(serialized).not.toContain(':undefined');
    });

    it('does not produce the string "null" anywhere in the context (no history)', () => {
      const context = builder.build(baseInput, twoAnswers);
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain('"null"');
    });

    it('does not produce "undefined" when historySummary is provided', () => {
      const context = builder.build(baseInput, twoAnswers, makeHistorySummary());
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain('"undefined"');
      expect(serialized).not.toContain(':undefined');
    });

    it('all six context fields are non-empty strings', () => {
      const context = builder.build(baseInput, twoAnswers);
      for (const [, value] of Object.entries(context)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('all six context fields are non-empty strings when historySummary is provided', () => {
      const context = builder.build(baseInput, twoAnswers, makeHistorySummary());
      for (const [, value] of Object.entries(context)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });
});
