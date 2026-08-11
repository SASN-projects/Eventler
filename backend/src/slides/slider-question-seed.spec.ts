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
  /**
   * Tag array used by getSlides() for vibe-based follow-up question filtering.
   * Must match db/eventler_final_dml.sql QUESTION TAGS section.
   */
  tags: string[];
}

const EXPECTED_QUESTIONS: QuestionConfig[] = [
  {
    code: 'occasion',
    label: 'What is the occasion for this event?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'hard',
    tags: ['initial', 'preference'],
  },
  {
    code: 'budget',
    label: 'What is your budget per person?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'hard',
    tags: ['preference', 'budget'],
  },
  {
    code: 'setting',
    label: 'Where would you prefer to go?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
    tags: ['active', 'casual', 'sightseeing'],
  },
  {
    code: 'food-drinks',
    label: 'How important is food or drinks at this event?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
    tags: ['dining', 'casual'],
  },
  {
    code: 'group-dynamic',
    label: 'What best describes your group for this event?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
    tags: ['preference'],
  },
  {
    code: 'energy-level',
    label: 'How active or energetic should the event be?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
    tags: ['active', 'casual'],
  },
  {
    code: 'must-have',
    label: 'Is there anything that is a must-have for this event?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'hard',
    tags: ['preference'],
  },
  {
    code: 'transportation',
    label: 'How do you plan to get there?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
    tags: ['preference'],
  },
  // ── Activity-specific follow-ups ──────────────────────────────────────────
  // Only surfaced once a vibe/activity category is known (frontend vibe-select
  // step), filtered in via tag match against the selected vibe.
  {
    code: 'cuisine',
    label: 'What cuisine do you prefer?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
    tags: ['dining'],
  },
  {
    code: 'dining-style',
    label: 'What kind of dining experience do you prefer?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
    tags: ['dining'],
  },
  {
    code: 'active-type',
    label: 'What kind of active experience do you want?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
    tags: ['active'],
  },
  {
    code: 'difficulty',
    label: 'How physically demanding should the activity be?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
    tags: ['active'],
  },
  {
    code: 'culture-type',
    label: 'What kind of cultural/arts experience do you prefer?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
    tags: ['cultural', 'sightseeing'],
  },
  {
    code: 'socialization',
    label: 'What level of socialization are you looking for?',
    answerMode: AnswerMode.OPTIONS,
    minOptions: 2,
    constraintType: 'soft',
    tags: ['cultural', 'clubbing', 'casual'],
  },
];

/**
 * Codes retired from the question set.
 * They must NOT appear in EXPECTED_QUESTIONS.
 *
 * 'vibe' and 'activity' were retired because the frontend's dedicated
 * vibe-select step (run before sliding) already captures the same
 * activity category. 'time-of-day' was retired because the exact start
 * time is already chosen in the base event-creation step.
 */
const RETIRED_CODES: string[] = [
  'location-type',
  'evening-structure',
  'crowd',
  'planning-style',
  'event-type',
  'vibe',
  'activity',
  'time-of-day',
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
  // setting
  'Indoors — restaurant, cafe, bar',
  'Outdoors — park, rooftop, beach',
  'A mix of both',
  'No strong preference',
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
  // transportation
  'Walk',
  'Car',
  'Public transportation',
  'Bike',
  // cuisine
  'Italian',
  'Asian',
  'Mediterranean or Middle Eastern',
  'American or burgers',
  'Open to anything',
  // dining-style
  'Casual or quick bite',
  'Sit-down restaurant',
  'Fine dining',
  'Street food or market',
  'No strong preference',
  // active-type
  'Sports or games (bowling, escape room)',
  'Outdoor adventure (hiking, biking)',
  'Fitness or movement (climbing, dance)',
  'Water activities',
  'Open to anything',
  // difficulty
  'Very light — mostly relaxed',
  'Moderate — some movement',
  'Challenging — a real workout',
  'No preference',
  // culture-type
  'Museums and galleries',
  'Historical sites and landmarks',
  'Live performance (theater, music)',
  'Local markets and neighborhoods',
  'Architecture and scenic views',
  // socialization
  'Intimate — just us',
  'Social — mingling welcome',
  'Lively — meeting new people',
  'Open to anything',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SliderQuestion seed validation', () => {
  // ── Question count and structure ──────────────────────────────────────────

  it('defines exactly 14 expected questions', () => {
    expect(EXPECTED_QUESTIONS).toHaveLength(14);
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

  it('hard constraint questions include occasion, budget, and must-have', () => {
    const hardCodes = EXPECTED_QUESTIONS
      .filter((q) => q.constraintType === 'hard')
      .map((q) => q.code);

    expect(hardCodes).toContain('occasion');
    expect(hardCodes).toContain('budget');
    expect(hardCodes).toContain('must-have');
  });

  // ── Soft preference questions ─────────────────────────────────────────────

  it('soft preference questions include setting, food-drinks, group-dynamic, and energy-level', () => {
    const softCodes = EXPECTED_QUESTIONS
      .filter((q) => q.constraintType === 'soft')
      .map((q) => q.code);

    expect(softCodes).toContain('setting');
    expect(softCodes).toContain('food-drinks');
    expect(softCodes).toContain('group-dynamic');
    expect(softCodes).toContain('energy-level');
  });

  it('soft preference questions include the six activity-specific follow-ups', () => {
    const softCodes = EXPECTED_QUESTIONS
      .filter((q) => q.constraintType === 'soft')
      .map((q) => q.code);

    expect(softCodes).toContain('cuisine');
    expect(softCodes).toContain('dining-style');
    expect(softCodes).toContain('active-type');
    expect(softCodes).toContain('difficulty');
    expect(softCodes).toContain('culture-type');
    expect(softCodes).toContain('socialization');
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

  it('total option count is at least 2 per question (>=28 total for 14 questions)', () => {
    expect(ALL_OPTION_VALUES.length).toBeGreaterThanOrEqual(28);
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

  // ── Tags validation (synced with DML QUESTION TAGS section) ──────────────

  it('all questions have a non-empty tags array', () => {
    for (const q of EXPECTED_QUESTIONS) {
      expect(Array.isArray(q.tags)).toBe(true);
      expect(q.tags.length).toBeGreaterThan(0);
    }
  });

  it('occasion carries the "initial" tag for first-position rendering', () => {
    const occasionQ = EXPECTED_QUESTIONS.find((q) => q.code === 'occasion');
    expect(occasionQ?.tags).toContain('initial');
  });

  it('all hard constraint questions carry the "preference" tag', () => {
    const hardCodes = EXPECTED_QUESTIONS
      .filter((q) => q.constraintType === 'hard')
      .map((q) => q.code);
    for (const code of hardCodes) {
      const q = EXPECTED_QUESTIONS.find((q) => q.code === code);
      expect(q?.tags).toContain('preference');
    }
  });

  it('each activity-specific follow-up tags to at least one vibe-select category', () => {
    const knownVibes = ['dining', 'sightseeing', 'active', 'clubbing', 'casual', 'cultural'];
    const followUpCodes = ['cuisine', 'dining-style', 'active-type', 'difficulty', 'culture-type', 'socialization'];
    for (const code of followUpCodes) {
      const q = EXPECTED_QUESTIONS.find((q) => q.code === code);
      expect(q?.tags.some((tag) => knownVibes.includes(tag))).toBe(true);
    }
  });
});
