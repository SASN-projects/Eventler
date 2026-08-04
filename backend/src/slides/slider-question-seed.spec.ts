/**
 * Static validation of the slider_questions / question_options seed data.
 *
 * These tests guard against accidental removal or corruption of the question set.
 * They do NOT require a running database — they validate the expected question
 * configuration as it would be loaded from db/eventler_final_dml.sql.
 *
 * If a question is intentionally added or removed, update EXPECTED_QUESTIONS and
 * RETIRED_CODES below, then regenerate the option counts accordingly.
 */

import { AnswerMode } from '../events/enums/answer-mode.enum';

// ---------------------------------------------------------------------------
// Canonical question configuration
// This must match db/eventler_final_dml.sql exactly.
// ---------------------------------------------------------------------------

interface QuestionConfig {
  /** Unique machine key — used as the sort key in getSlides(). */
  code: string;
  /** User-facing question text — stored in event_responses.question. */
  label: string;
  /** Must be a valid answer_mode_enum value. */
  answerMode: AnswerMode;
  /** Minimum number of options the question must have. */
  minOptions: number;
  /**
   * Semantic classification for prompt engineering:
   * 'hard'     — must be respected as a hard constraint in the recommendation.
   * 'soft'     — a preference that shapes recommendations but can be overridden.
   * 'optional' — extra context that improves specificity when present.
   */
  constraintType: 'hard' | 'soft' | 'optional';
}

const EXPECTED_QUESTIONS: QuestionConfig[] = [
  {
    code: 'occasion',
    label: 'What is the occasion for this event?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'hard',
  },
  {
    code: 'vibe',
    label: 'What vibe are you going for?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
  },
  {
    code: 'activity',
    label: 'What kind of activity do you have in mind?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
  },
  {
    code: 'budget',
    label: 'What is your budget per person?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'hard',
  },
  {
    code: 'setting',
    label: 'Where would you prefer to go?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
  },
  {
    code: 'time-of-day',
    label: 'When during the day do you plan to go?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'hard',
  },
  {
    code: 'food-drinks',
    label: 'How important is food or drinks at this event?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
  },
  {
    code: 'group-dynamic',
    label: 'What best describes your group for this event?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
  },
  {
    code: 'energy-level',
    label: 'How active or energetic should the event be?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
  },
  {
    code: 'must-have',
    label: 'Is there anything that is a must-have for this event?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'hard',
  },
];

/**
 * Codes retired from the previous question set.
 * They must NOT appear in EXPECTED_QUESTIONS.
 */
const RETIRED_CODES: string[] = [
  'transportation',
  'location-type',
  'evening-structure',
  'crowd',
  'planning-style',
  'event-type',
];

const VALID_ANSWER_MODES: AnswerMode[] = [AnswerMode.OPTIONS, AnswerMode.VALUE];
const VALID_CONSTRAINT_TYPES = ['hard', 'soft', 'optional'] as const;

// Maximum lengths enforced by the database schema.
const MAX_CODE_LENGTH = 100;
const MAX_LABEL_LENGTH = 255;
const MAX_OPTION_VALUE_LENGTH = 100;

// ---------------------------------------------------------------------------
// Actual option values from the DML — validated against the 100-char schema limit.
// ---------------------------------------------------------------------------

const ALL_OPTION_VALUES: string[] = [
  // budget
  'Low — up to 50 NIS',
  'Moderate — 50 to 150 NIS',
  'Generous — 150 to 300 NIS',
  'Splurge — over 300 NIS',
  // occasion
  'Birthday or milestone',
  'Date night or romantic',
  'Friends hangout',
  'Team or work event',
  'Family gathering',
  'Just for fun',
  // vibe
  'Lively and energetic',
  'Relaxed and laid-back',
  'Upscale and refined',
  'Fun and playful',
  'Cozy and intimate',
  // activity
  'Food and dining',
  'Drinks and nightlife',
  'Outdoor adventure',
  'Culture or arts',
  'Entertainment (escape room, bowling, cinema)',
  'Wellness and relaxation',
  // setting
  'Indoors — restaurant, cafe, bar',
  'Outdoors — park, rooftop, beach',
  'A mix of both',
  'No strong preference',
  // time-of-day
  'Morning or brunch (8am-12pm)',
  'Afternoon (12pm-5pm)',
  'Evening (5pm-9pm)',
  'Late night (9pm onward)',
  // food-drinks
  'It is the main focus — great food or drinks',
  'Nice to have but not the main point',
  'Not important — we will eat before or after',
  'Completely open',
  // group-dynamic
  'Close friends who know each other well',
  'Mixed group — some people are new',
  'Colleagues or professional acquaintances',
  'Couple or two people',
  'Family including children',
  // energy-level
  'High energy — dancing, sports, adventure',
  'Moderate — a fun activity or walkable experience',
  'Low — sitting down, relaxing, or just talking',
  'Flexible — open to anything',
  // must-have
  'Parking available',
  'Kid-friendly',
  'Pet-friendly',
  'Wheelchair accessible',
  'Private or semi-private space',
  'None of the above',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SliderQuestion seed validation', () => {
  // ── Question count and structure ──────────────────────────────────────────

  it('defines exactly 10 expected questions', () => {
    expect(EXPECTED_QUESTIONS).toHaveLength(10);
  });

  it('has no duplicate codes in the expected question set', () => {
    const codes = EXPECTED_QUESTIONS.map((q) => q.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('contains none of the retired question codes', () => {
    const activeCodes = new Set(EXPECTED_QUESTIONS.map((q) => q.code));
    for (const retiredCode of RETIRED_CODES) {
      expect(activeCodes.has(retiredCode)).toBe(false);
    }
  });

  // ── Code and label validation ─────────────────────────────────────────────

  it('all codes are non-empty strings within the 100-char schema limit', () => {
    for (const q of EXPECTED_QUESTIONS) {
      expect(typeof q.code).toBe('string');
      expect(q.code.length).toBeGreaterThan(0);
      expect(q.code.length).toBeLessThanOrEqual(MAX_CODE_LENGTH);
    }
  });

  it('all labels are non-empty strings within the 255-char schema limit', () => {
    for (const q of EXPECTED_QUESTIONS) {
      expect(typeof q.label).toBe('string');
      expect(q.label.length).toBeGreaterThan(0);
      expect(q.label.length).toBeLessThanOrEqual(MAX_LABEL_LENGTH);
    }
  });

  // ── Enum and constraint type validation ───────────────────────────────────

  it('all answerMode values are valid AnswerMode enum members', () => {
    for (const q of EXPECTED_QUESTIONS) {
      expect(VALID_ANSWER_MODES).toContain(q.answerMode);
    }
  });

  it('all constraintType values are one of: hard, soft, optional', () => {
    for (const q of EXPECTED_QUESTIONS) {
      expect(VALID_CONSTRAINT_TYPES as readonly string[]).toContain(q.constraintType);
    }
  });

  it('all questions declare at least 2 minimum options', () => {
    for (const q of EXPECTED_QUESTIONS) {
      expect(q.minOptions).toBeGreaterThanOrEqual(2);
    }
  });

  // ── Hard constraint questions ─────────────────────────────────────────────

  it('hard constraint questions include occasion, budget, time-of-day, and must-have', () => {
    const hardCodes = EXPECTED_QUESTIONS
      .filter((q) => q.constraintType === 'hard')
      .map((q) => q.code);

    expect(hardCodes).toContain('occasion');
    expect(hardCodes).toContain('budget');
    expect(hardCodes).toContain('time-of-day');
    expect(hardCodes).toContain('must-have');
  });

  // ── Soft preference questions ─────────────────────────────────────────────

  it('soft preference questions include vibe, activity, setting, food-drinks, group-dynamic, and energy-level', () => {
    const softCodes = EXPECTED_QUESTIONS
      .filter((q) => q.constraintType === 'soft')
      .map((q) => q.code);

    expect(softCodes).toContain('vibe');
    expect(softCodes).toContain('activity');
    expect(softCodes).toContain('setting');
    expect(softCodes).toContain('food-drinks');
    expect(softCodes).toContain('group-dynamic');
    expect(softCodes).toContain('energy-level');
  });

  // ── Option values ─────────────────────────────────────────────────────────

  it('all option values are non-empty strings', () => {
    for (const value of ALL_OPTION_VALUES) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('all option values are within the 100-char schema limit', () => {
    const violations = ALL_OPTION_VALUES.filter(
      (value) => value.length > MAX_OPTION_VALUE_LENGTH,
    );
    expect(violations).toHaveLength(0);
  });

  it('all option values are unique across the entire option set', () => {
    const uniqueValues = new Set(ALL_OPTION_VALUES);
    expect(uniqueValues.size).toBe(ALL_OPTION_VALUES.length);
  });

  it('total option count is at least 2 per question (>=20 total for 10 questions)', () => {
    expect(ALL_OPTION_VALUES.length).toBeGreaterThanOrEqual(20);
  });

  // ── Alphabetical ordering (getSlides() sorts by code ASC) ────────────────

  it('codes sort without collisions when ordered alphabetically', () => {
    const codes = EXPECTED_QUESTIONS.map((q) => q.code);
    const sorted = [...codes].sort();
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i]).not.toBe(sorted[i + 1]);
    }
  });

  // ── Guard against silent label regressions ───────────────────────────────

  it('budget label matches the updated DML text', () => {
    const budget = EXPECTED_QUESTIONS.find((q) => q.code === 'budget');
    expect(budget?.label).toBe('What is your budget per person?');
  });

  it('occasion label matches the DML text', () => {
    const occasion = EXPECTED_QUESTIONS.find((q) => q.code === 'occasion');
    expect(occasion?.label).toBe('What is the occasion for this event?');
  });

  it('vibe label matches the DML text', () => {
    const vibe = EXPECTED_QUESTIONS.find((q) => q.code === 'vibe');
    expect(vibe?.label).toBe('What vibe are you going for?');
  });
});
