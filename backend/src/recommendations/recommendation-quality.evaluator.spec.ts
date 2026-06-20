import { RecommendationQualityEvaluator } from './recommendation-quality.evaluator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeValidOutput = (overrides: { recommendedEvents?: any[] } = {}) =>
  JSON.stringify({
    recommendedEvents: overrides.recommendedEvents ?? [
      { title: 'Event A', description: 'Desc A', address: 'Addr A' },
      { title: 'Event B', description: 'Desc B', address: 'Addr B' },
      { title: 'Event C', description: 'Desc C', address: 'Addr C' },
    ],
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RecommendationQualityEvaluator', () => {
  let evaluator: RecommendationQualityEvaluator;

  beforeEach(() => {
    evaluator = new RecommendationQualityEvaluator();
  });

  // ─── json_validity ───────────────────────────────────────────────────────

  describe('json_validity', () => {
    it('scores 1 for valid JSON', () => {
      const scores = evaluator.evaluate(makeValidOutput());
      expect(scores.json_validity).toBe(1);
    });

    it('scores 0 for completely invalid JSON', () => {
      const scores = evaluator.evaluate('not json at all {{{{');
      expect(scores.json_validity).toBe(0);
    });

    it('scores 0 for an empty string', () => {
      const scores = evaluator.evaluate('');
      expect(scores.json_validity).toBe(0);
    });

    it('returns all zeros when JSON is invalid', () => {
      const scores = evaluator.evaluate('{broken');
      expect(scores).toEqual({
        json_validity: 0,
        schema_compliance: 0,
        recommendations_count: 0,
        has_duplicate_recommendations: 0,
        has_empty_required_fields: 0,
      });
    });
  });

  // ─── schema_compliance ───────────────────────────────────────────────────

  describe('schema_compliance', () => {
    it('scores 1 when recommendedEvents is a valid array', () => {
      expect(evaluator.evaluate(makeValidOutput()).schema_compliance).toBe(1);
    });

    it('scores 0 when recommendedEvents key is absent', () => {
      const raw = JSON.stringify({ someOtherKey: [] });
      const scores = evaluator.evaluate(raw);
      expect(scores.schema_compliance).toBe(0);
    });

    it('scores 0 when recommendedEvents is not an array', () => {
      const raw = JSON.stringify({ recommendedEvents: 'oops' });
      const scores = evaluator.evaluate(raw);
      expect(scores.schema_compliance).toBe(0);
    });

    it('scores 0 when recommendedEvents is null', () => {
      const raw = JSON.stringify({ recommendedEvents: null });
      const scores = evaluator.evaluate(raw);
      expect(scores.schema_compliance).toBe(0);
    });

    it('returns json_validity=1, schema_compliance=0 for valid JSON with wrong shape', () => {
      const raw = JSON.stringify({ wrong: 'shape' });
      const scores = evaluator.evaluate(raw);
      expect(scores.json_validity).toBe(1);
      expect(scores.schema_compliance).toBe(0);
      expect(scores.recommendations_count).toBe(0);
    });
  });

  // ─── recommendations_count ───────────────────────────────────────────────

  describe('recommendations_count', () => {
    it('returns 3 for a valid 3-item output', () => {
      expect(evaluator.evaluate(makeValidOutput()).recommendations_count).toBe(3);
    });

    it('returns 0 when the array is empty', () => {
      const scores = evaluator.evaluate(makeValidOutput({ recommendedEvents: [] }));
      expect(scores.recommendations_count).toBe(0);
    });

    it('returns the actual count when it differs from 3', () => {
      const raw = makeValidOutput({
        recommendedEvents: [{ title: 'Only One', description: 'Desc', address: 'Addr' }],
      });
      expect(evaluator.evaluate(raw).recommendations_count).toBe(1);
    });
  });

  // ─── has_duplicate_recommendations ───────────────────────────────────────

  describe('has_duplicate_recommendations', () => {
    it('scores 0 when all titles are unique', () => {
      expect(evaluator.evaluate(makeValidOutput()).has_duplicate_recommendations).toBe(0);
    });

    it('scores 1 when two items share the same title (exact match)', () => {
      const raw = makeValidOutput({
        recommendedEvents: [
          { title: 'Dupe', description: 'D1', address: 'A1' },
          { title: 'Dupe', description: 'D2', address: 'A2' },
          { title: 'Unique', description: 'D3', address: 'A3' },
        ],
      });
      expect(evaluator.evaluate(raw).has_duplicate_recommendations).toBe(1);
    });

    it('detects duplicates case-insensitively', () => {
      const raw = makeValidOutput({
        recommendedEvents: [
          { title: 'Coffee Shop', description: 'D1', address: 'A1' },
          { title: 'COFFEE SHOP', description: 'D2', address: 'A2' },
          { title: 'Unique', description: 'D3', address: 'A3' },
        ],
      });
      expect(evaluator.evaluate(raw).has_duplicate_recommendations).toBe(1);
    });

    it('detects duplicates with leading/trailing whitespace', () => {
      const raw = makeValidOutput({
        recommendedEvents: [
          { title: '  Jazz Night  ', description: 'D1', address: 'A1' },
          { title: 'Jazz Night', description: 'D2', address: 'A2' },
          { title: 'Other', description: 'D3', address: 'A3' },
        ],
      });
      expect(evaluator.evaluate(raw).has_duplicate_recommendations).toBe(1);
    });
  });

  // ─── has_empty_required_fields ───────────────────────────────────────────

  describe('has_empty_required_fields', () => {
    it('scores 0 when all required fields are present and non-empty', () => {
      expect(evaluator.evaluate(makeValidOutput()).has_empty_required_fields).toBe(0);
    });

    it('scores 1 when description is an empty string', () => {
      const raw = makeValidOutput({
        recommendedEvents: [
          { title: 'A', description: '', address: 'Addr' },
          { title: 'B', description: 'Desc B', address: 'Addr B' },
          { title: 'C', description: 'Desc C', address: 'Addr C' },
        ],
      });
      expect(evaluator.evaluate(raw).has_empty_required_fields).toBe(1);
    });

    it('scores 1 when address field is missing entirely', () => {
      const raw = JSON.stringify({
        recommendedEvents: [
          { title: 'A', description: 'Desc A' }, // no address
          { title: 'B', description: 'Desc B', address: 'Addr B' },
          { title: 'C', description: 'Desc C', address: 'Addr C' },
        ],
      });
      expect(evaluator.evaluate(raw).has_empty_required_fields).toBe(1);
    });

    it('scores 1 when title is whitespace-only', () => {
      const raw = makeValidOutput({
        recommendedEvents: [
          { title: '   ', description: 'Desc A', address: 'Addr A' },
          { title: 'B', description: 'Desc B', address: 'Addr B' },
          { title: 'C', description: 'Desc C', address: 'Addr C' },
        ],
      });
      expect(evaluator.evaluate(raw).has_empty_required_fields).toBe(1);
    });

    it('scores 1 when a field value is not a string (e.g. number)', () => {
      const raw = JSON.stringify({
        recommendedEvents: [
          { title: 123, description: 'Desc A', address: 'Addr A' },
          { title: 'B', description: 'Desc B', address: 'Addr B' },
          { title: 'C', description: 'Desc C', address: 'Addr C' },
        ],
      });
      expect(evaluator.evaluate(raw).has_empty_required_fields).toBe(1);
    });
  });

  // ─── Full happy-path scores ───────────────────────────────────────────────

  describe('full valid output produces correct composite scores', () => {
    it('returns all expected high-quality scores for a perfect 3-item output', () => {
      const scores = evaluator.evaluate(makeValidOutput());
      expect(scores).toEqual({
        json_validity: 1,
        schema_compliance: 1,
        recommendations_count: 3,
        has_duplicate_recommendations: 0,
        has_empty_required_fields: 0,
      });
    });
  });
});
