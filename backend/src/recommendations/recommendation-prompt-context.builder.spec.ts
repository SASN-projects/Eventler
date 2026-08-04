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

    it('group flow renders a current/provisional group preference summary instead of raw individual answers', () => {
      const { userPreferencesSummary } = builder.build(
        baseInput,
        groupAnswers,
        makeHistorySummary({ scope: 'group' }),
        { preferenceScope: 'group' },
      );

      // Must use provisional/current wording — not finalized group answers
      expect(userPreferencesSummary).toContain('Current/provisional group preference summary');
      expect(userPreferencesSummary).not.toContain('Final group answers/preferences');
      expect(userPreferencesSummary).toContain('Vibe');
      expect(userPreferencesSummary).toContain('Budget');
      expect(userPreferencesSummary).toContain('Relaxed');
    });

    it('group flow summary is secondary to the current/provisional summary (not finalized artifact)', () => {
      // Demonstrates that the group preference summary is marked as provisional
      // because no finalized group-answer artifact exists yet.
      const { userPreferencesSummary } = builder.build(
        baseInput,
        groupAnswers,
        undefined,
        { preferenceScope: 'group' },
      );
      expect(userPreferencesSummary).toContain('Current/provisional group preference summary');
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

    it('includes group-specific priority rules when scope is group — uses provisional/current wording', () => {
      const { recommendationPolicy } = builder.build(
        baseInput,
        groupAnswers,
        makeHistorySummary({ scope: 'group' }),
        { preferenceScope: 'group' },
      );

      // Must use provisional/current wording — not finalized group answers
      expect(recommendationPolicy.toLowerCase()).toContain('current/provisional group preference summary');
      expect(recommendationPolicy.toLowerCase()).not.toContain('final group answers/preferences');
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

  // ── new question label formats ────────────────────────────────────────────
  describe('new question labels flow through userPreferencesSummary', () => {
    it('renders the occasion label and answer in the individual preference summary', () => {
      const answers = [{ question: 'What is the occasion for this event?', answerValue: 'Birthday or milestone' }];
      const { userPreferencesSummary } = builder.build(baseInput, answers);
      expect(userPreferencesSummary).toContain('What is the occasion for this event?');
      expect(userPreferencesSummary).toContain('Birthday or milestone');
    });

    it('renders the vibe label and answer in the individual preference summary', () => {
      const answers = [{ question: 'What vibe are you going for?', answerValue: 'Relaxed and laid-back' }];
      const { userPreferencesSummary } = builder.build(baseInput, answers);
      expect(userPreferencesSummary).toContain('What vibe are you going for?');
      expect(userPreferencesSummary).toContain('Relaxed and laid-back');
    });

    it('renders the activity label and answer in the individual preference summary', () => {
      const answers = [{ question: 'What kind of activity do you have in mind?', answerValue: 'Food and dining' }];
      const { userPreferencesSummary } = builder.build(baseInput, answers);
      expect(userPreferencesSummary).toContain('What kind of activity do you have in mind?');
      expect(userPreferencesSummary).toContain('Food and dining');
    });

    it('renders the updated budget label with new option text', () => {
      const answers = [{ question: 'What is your budget per person?', answerValue: 'Moderate — 50 to 150 NIS' }];
      const { userPreferencesSummary } = builder.build(baseInput, answers);
      expect(userPreferencesSummary).toContain('What is your budget per person?');
      expect(userPreferencesSummary).toContain('Moderate — 50 to 150 NIS');
    });

    it('renders the time-of-day hard constraint in the individual preference summary', () => {
      const answers = [{ question: 'When during the day do you plan to go?', answerValue: 'Evening (5pm-9pm)' }];
      const { userPreferencesSummary } = builder.build(baseInput, answers);
      expect(userPreferencesSummary).toContain('When during the day do you plan to go?');
      expect(userPreferencesSummary).toContain('Evening (5pm-9pm)');
    });

    it('renders the must-have hard constraint in the individual preference summary', () => {
      const answers = [{ question: 'Is there anything that is a must-have for this event?', answerValue: 'Wheelchair accessible' }];
      const { userPreferencesSummary } = builder.build(baseInput, answers);
      expect(userPreferencesSummary).toContain('Is there anything that is a must-have for this event?');
      expect(userPreferencesSummary).toContain('Wheelchair accessible');
    });

    it('renders all 7 new question labels simultaneously without collision', () => {
      const answers = [
        { question: 'What is the occasion for this event?', answerValue: 'Friends hangout' },
        { question: 'What vibe are you going for?', answerValue: 'Lively and energetic' },
        { question: 'What kind of activity do you have in mind?', answerValue: 'Outdoor adventure' },
        { question: 'What is your budget per person?', answerValue: 'Low — up to 50 NIS' },
        { question: 'Where would you prefer to go?', answerValue: 'Outdoors — park, rooftop, beach' },
        { question: 'When during the day do you plan to go?', answerValue: 'Afternoon (12pm-5pm)' },
        { question: 'How important is food or drinks at this event?', answerValue: 'Nice to have but not the main point' },
      ];
      const { userPreferencesSummary } = builder.build(baseInput, answers);
      expect(userPreferencesSummary).toContain('Friends hangout');
      expect(userPreferencesSummary).toContain('Lively and energetic');
      expect(userPreferencesSummary).toContain('Outdoor adventure');
      expect(userPreferencesSummary).toContain('Low — up to 50 NIS');
      expect(userPreferencesSummary).toContain('Outdoors — park, rooftop, beach');
      expect(userPreferencesSummary).toContain('Afternoon (12pm-5pm)');
      expect(userPreferencesSummary).toContain('Nice to have but not the main point');
    });
  });

  // ── group flow: new question labels ───────────────────────────────────────
  describe('group flow majority-vote with new question labels', () => {
    it('aggregates vibe answers by majority vote using new option texts', () => {
      const groupVibeAnswers = [
        { question: 'What vibe are you going for?', answerValue: 'Relaxed and laid-back' },
        { question: 'What vibe are you going for?', answerValue: 'Relaxed and laid-back' },
        { question: 'What vibe are you going for?', answerValue: 'Lively and energetic' },
      ];
      const { userPreferencesSummary } = builder.build(baseInput, groupVibeAnswers, undefined, { preferenceScope: 'group' });
      expect(userPreferencesSummary).toContain('What vibe are you going for?');
      expect(userPreferencesSummary).toContain('Relaxed and laid-back');
    });

    it('aggregates budget answers by majority vote using updated option texts', () => {
      const groupBudgetAnswers = [
        { question: 'What is your budget per person?', answerValue: 'Low — up to 50 NIS' },
        { question: 'What is your budget per person?', answerValue: 'Low — up to 50 NIS' },
        { question: 'What is your budget per person?', answerValue: 'Moderate — 50 to 150 NIS' },
      ];
      const { userPreferencesSummary } = builder.build(baseInput, groupBudgetAnswers, undefined, { preferenceScope: 'group' });
      expect(userPreferencesSummary).toContain('What is your budget per person?');
      expect(userPreferencesSummary).toContain('Low — up to 50 NIS');
    });

    it('aggregates occasion answers by majority vote', () => {
      const groupOccasionAnswers = [
        { question: 'What is the occasion for this event?', answerValue: 'Birthday or milestone' },
        { question: 'What is the occasion for this event?', answerValue: 'Birthday or milestone' },
        { question: 'What is the occasion for this event?', answerValue: 'Friends hangout' },
      ];
      const { userPreferencesSummary } = builder.build(baseInput, groupOccasionAnswers, undefined, { preferenceScope: 'group' });
      expect(userPreferencesSummary).toContain('What is the occasion for this event?');
      expect(userPreferencesSummary).toContain('Birthday or milestone');
    });
  });
});
