import { Injectable } from '@nestjs/common';

/**
 * Scores produced by a single deterministic evaluation pass.
 * All binary flags use 0 | 1 so they can be sent directly as Langfuse numeric scores.
 *
 * Interpretation guide:
 *  - json_validity                   1 = parseable JSON, 0 = not
 *  - schema_compliance               1 = has recommendedEvents array, 0 = not
 *  - recommendations_count           actual count (expected: 3)
 *  - has_duplicate_recommendations   1 = duplicates found (bad), 0 = clean
 *  - has_empty_required_fields       1 = missing/empty title|description|address (bad), 0 = all present
 */
export interface QualityScores {
  json_validity: 0 | 1;
  schema_compliance: 0 | 1;
  recommendations_count: number;
  has_duplicate_recommendations: 0 | 1;
  has_empty_required_fields: 0 | 1;
}

const REQUIRED_FIELDS = ['title', 'description', 'address'] as const;

/**
 * Deterministic, stateless quality evaluator for recommendation model output.
 *
 * All checks are O(n) over the recommendation list and contain no I/O,
 * making them safe to call inline in the generation flow without risk of
 * adding latency or side-effects.
 */
@Injectable()
export class RecommendationQualityEvaluator {
  /**
   * Evaluate the raw JSON string returned by the model.
   *
   * Always returns a complete QualityScores object even when the input is
   * completely invalid — downstream callers never need to handle exceptions.
   */
  evaluate(rawJson: string): QualityScores {
    // ── 1. JSON validity ──────────────────────────────────────────────────
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson.trim());
    } catch {
      return {
        json_validity: 0,
        schema_compliance: 0,
        recommendations_count: 0,
        has_duplicate_recommendations: 0,
        has_empty_required_fields: 0,
      };
    }

    // ── 2. Schema compliance ──────────────────────────────────────────────
    const items: any[] = parsed?.recommendedEvents;
    if (!Array.isArray(items)) {
      return {
        json_validity: 1,
        schema_compliance: 0,
        recommendations_count: 0,
        has_duplicate_recommendations: 0,
        has_empty_required_fields: 0,
      };
    }

    // ── 3. Count ──────────────────────────────────────────────────────────
    const recommendations_count = items.length;

    // ── 4. Duplicate detection (case-insensitive title comparison) ────────
    const titles = items.map((item) =>
      typeof item?.title === 'string' ? item.title.trim().toLowerCase() : '',
    );
    const uniqueTitles = new Set(titles);
    const has_duplicate_recommendations: 0 | 1 =
      uniqueTitles.size < titles.length ? 1 : 0;

    // ── 5. Empty required fields ─────────────────────────────────────────
    const has_empty_required_fields: 0 | 1 = items.some((item) =>
      REQUIRED_FIELDS.some(
        (field) => typeof item?.[field] !== 'string' || item[field].trim() === '',
      ),
    )
      ? 1
      : 0;

    return {
      json_validity: 1,
      schema_compliance: 1,
      recommendations_count,
      has_duplicate_recommendations,
      has_empty_required_fields,
    };
  }
}
