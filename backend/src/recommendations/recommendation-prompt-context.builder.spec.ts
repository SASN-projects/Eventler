import {
  RecommendationPromptContextBuilder,
  RecommendationEventInput,
  RecommendationSlideAnswer,
} from './recommendation-prompt-context.builder';

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

  // ── optionalSignalsSummary ────────────────────────────────────────────────
  describe('optionalSignalsSummary', () => {
    it('contains the "no optional signals" fallback', () => {
      const { optionalSignalsSummary } = builder.build(baseInput, []);
      expect(optionalSignalsSummary).toBe('No additional optional signals were provided.');
    });
  });

  // ── recommendationPolicy ──────────────────────────────────────────────────
  describe('recommendationPolicy', () => {
    it('is a non-empty string', () => {
      const { recommendationPolicy } = builder.build(baseInput, []);
      expect(recommendationPolicy.length).toBeGreaterThan(10);
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
    it('does not produce the string "undefined" anywhere in the context', () => {
      const context = builder.build(baseInput, twoAnswers);
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain('"undefined"');
      expect(serialized).not.toContain(':undefined');
    });

    it('does not produce the string "null" anywhere in the context', () => {
      const context = builder.build(baseInput, twoAnswers);
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain('"null"');
    });

    it('all six context fields are non-empty strings', () => {
      const context = builder.build(baseInput, twoAnswers);
      for (const [key, value] of Object.entries(context)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0, `Field "${key}" must not be empty`);
      }
    });
  });
});
