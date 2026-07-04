# Historical Personalization Signal — Implementation Plan

## Phase 1: Audit Findings

### 1. Where Events Are Stored

Table: `events`. Entity: [`event.entity.ts`](file:///c:/Users/daber/Desktop/Eventler/backend/src/events/entities/event.entity.ts).

Key fields:
- `id`, `created_by` (→ `createdById` in entity), `event_type`, `status`, `location_city`, `location_country`, `participant_count`, `target_date`, `recommendation_id`, `finalized_at`, `created_at`

### 2. Where Generated Recommendations Are Stored

Table: `recommendations`. Entity: [`recommendation.entity.ts`](file:///c:/Users/daber/Desktop/Eventler/backend/src/recommendations/entities/recommendation.entity.ts).

Fields: `id`, `title`, `description`, `address`, `created_at`

The `events` table has `recommendation_id UUID REFERENCES recommendations(id)` — a FK back to the chosen recommendation.

### 3. Does a "User Selected / Accepted / Chosen" Concept Exist?

**YES.** The `selectRecommendation()` method in [`recommendations.service.ts`](file:///c:/Users/daber/Desktop/Eventler/backend/src/recommendations/recommendations.service.ts#L354-L392) sets `event.recommendation = recommendation` and saves the event. This writes the FK `recommendation_id` on the `events` row.

### 4. Which Field Indicates a User Chose a Recommendation?

`events.recommendation_id` (mapped as `event.recommendation` relation in the entity). When this field is **not null**, the user has actively selected that recommendation for that event. This is the authoritative "chosen" signal.

### 5. How to Map `userId` → Previous Events / Recommendations

Query: `events` WHERE `created_by = :userId` AND `recommendation_id IS NOT NULL`. The entity field is `createdById`. Join / load `recommendation` relation to get the selected recommendation's `title`, `description`, `address`.

### 6. How to Exclude the Current Event

Add `id != :currentEventId` to the WHERE clause.

### 7. Which Historical Fields Carry Useful Signals?

| Field | Signal | Sensitivity |
|---|---|---|
| `event_type` | Preferred event type | Low (enumerable) |
| `location_city` | Preferred city | Medium (indirectly PII) |
| `location_country` | Preferred country | Low |
| `participant_count` | Group size preference | Low |
| `recommendation.title` | Category hint | Medium (user-selected) |
| `recommendation.description` | Rich category hint | High (avoid raw dump) |
| `recommendation.address` | Location preference | High (avoid raw dump) |
| `target_date` | Seasonality / recency | Low |
| `finalized_at` | Recency | Low |

### 8. Which Fields Are Safe to Use Internally for Prompt Personalization?

Safe **after aggregation** (never raw):
- `eventType` — safe as a category label
- `locationCity`, `locationCountry` — safe as a frequency-based preference (e.g., "Often in Tel Aviv")
- `participantCount` — safe as a range/bucket (e.g., "small-group events")
- `recommendation.title` — safe only as a category/type hint, not verbatim dump

### 9. Which Fields Must NOT Go to Langfuse Spans or Logs?

- Raw `recommendation.title` / `.description` / `.address`
- Raw `event_responses.question` / `.answerValue`
- Raw `recommendation_id` linked to raw recommendation content
- Full event objects
- Any individual event data that could be directly linked to a person

### 10. Files / Services That Need to Change

| File | Change |
|---|---|
| `recommendations/` **[NEW]** `recommendation-history.service.ts` | New service |
| `recommendations/` **[NEW]** `recommendation-history.service.spec.ts` | New spec |
| [`recommendations.module.ts`](file:///c:/Users/daber/Desktop/Eventler/backend/src/recommendations/recommendations.module.ts) | Register new service |
| [`recommendation-prompt-context.builder.ts`](file:///c:/Users/daber/Desktop/Eventler/backend/src/recommendations/recommendation-prompt-context.builder.ts) | Accept + render history signal |
| [`recommendation-prompt-context.builder.spec.ts`](file:///c:/Users/daber/Desktop/Eventler/backend/src/recommendations/recommendation-prompt-context.builder.spec.ts) | New builder tests for history |
| [`recommendations.service.ts`](file:///c:/Users/daber/Desktop/Eventler/backend/src/recommendations/recommendations.service.ts) | Call history service, wire to builder + Langfuse span |
| [`recommendations.service.spec.ts`](file:///c:/Users/daber/Desktop/Eventler/backend/src/recommendations/recommendations.service.spec.ts) | New service-level history tests |
| [`recommendation-judge.service.ts`](file:///c:/Users/daber/Desktop/Eventler/backend/src/recommendations/recommendation-judge.service.ts) | Update judge prompt to acknowledge history priority |
| [`recommendation-judge.service.spec.ts`](file:///c:/Users/daber/Desktop/Eventler/backend/src/recommendations/recommendation-judge.service.spec.ts) | Update judge tests |
| [`README.md`](file:///c:/Users/daber/Desktop/Eventler/backend/README.md) | Add Historical Personalization Signal section |

### 11. Does `optionalSignalsSummary` Already Fit?

**YES — perfectly.** The builder's [`buildOptionalSignalsSummary()`](file:///c:/Users/daber/Desktop/Eventler/backend/src/recommendations/recommendation-prompt-context.builder.ts#L147-L152) is currently a stub with the exact comment: _"user history... will be appended here as they become available."_ This is our insertion point. No new template variables needed.

---

## Current Data Model Summary

```
users ──< events >── recommendation_id ──> recommendations
              │
              └── event_type, location_city, participant_count,
                  status, finalized_at, recommendation_id (FK)
```

- **Selection signal**: `events.recommendation_id IS NOT NULL` → user chose this recommendation
- **Ownership**: `events.created_by = userId`
- **No dedicated "liked/selected" table** — the event's `recommendation_id` FK is the sole signal
- **No embedding/vector infrastructure** exists

### Blocker Analysis

**No blockers.** The Event entity already has:
- `createdById` field ✅
- `recommendation` ManyToOne relation ✅
- `eventType`, `locationCity`, `locationCountry`, `participantCount` ✅
- `status` enum (can filter `finalized` or `recommended`) ✅

The `Recommendation` entity is already registered in the `RecommendationsModule` via TypeOrmModule.

---

## Proposed Changes

---

### Phase 2 — New History Service

#### [NEW] recommendation-history.service.ts

```
src/recommendations/recommendation-history.service.ts
```

Responsibilities:
1. Accept `userId` and `currentEventId`
2. Query `events` WHERE `created_by = userId AND recommendation_id IS NOT NULL AND id != currentEventId`
3. Load `recommendation` relation (for title)
4. Limit to last 20 records (ordered by `finalized_at DESC NULLS LAST, created_at DESC`)
5. Aggregate into a safe summary struct:
   ```ts
   {
     historyItemsCount: number;
     historySignalUsed: boolean;
     dominantEventTypes: string[];
     preferredLocations: string[];    // city-level only
     preferredCategories: string[];   // derived from recommendation titles (word frequency)
     summaryText: string;
   }
   ```
6. Derive `summaryText` from aggregated fields — never raw content

**Aggregation logic:**
- `dominantEventTypes`: group by `eventType`, take top-2 if ≥ 2 occurrences
- `preferredLocations`: group by `locationCity`, take top-3 with ≥ 2 occurrences
- `preferredCategories`: crude keyword extraction from `recommendation.title` (e.g., "restaurant", "outdoor", "museum") — only use if title is 1-5 words; otherwise skip
- `summaryText`: composed from the above aggregates; if no signal is dominant, returns the no-history fallback

**Error handling**: All DB failures return the no-history fallback struct and log a warning via `Logger`. Never throws.

#### [NEW] recommendation-history.service.spec.ts

Full unit tests covering all scenarios (see Phase 7).

---

### Phase 3 — Prompt Context Builder Update

#### [MODIFY] recommendation-prompt-context.builder.ts

- Add `HistorySignalSummary` interface (imported from history service or duplicated as a lean local type)
- Update `build()` signature: `build(eventInput, eventAnswers, historySummary?)`
- Update `buildOptionalSignalsSummary(historySummary?)` to render history when present
- Fallback text when no history: `"No historical user selection data is available."`

Example output when history exists:
```
Historical user preference signals (secondary — must not override current-event preferences):
- User often selected food-related recommendations.
- User frequently chose small-group or intimate experiences.
- User has previously preferred Tel Aviv-based options.
```

---

### Phase 4 — Recommendation Policy Update

#### [MODIFY] recommendation-prompt-context.builder.ts — `buildRecommendationPolicy()`

Update to include explicit priority order sentence:

```
Historical preferences are only a soft secondary signal.
They must never override explicit preferences or hard constraints provided for the current event.
Priority: (1) hard constraints → (2) current-event explicit preferences → (3) historical signals → (4) diversity and quality.
If the user's current-event answers conflict with historical behavior, current-event preferences win.
Avoid overfitting to historical behavior. Avoid assuming the user always wants the same experience.
```

---

### Phase 5 — Langfuse Observability Span

#### [MODIFY] recommendations.service.ts

Add `retrieve-user-history` span **before** the prompt build step (after the existing `retrieve-user-preferences` span).

The span's `output` must include **only**:
```json
{
  "historyItemsCount": 5,
  "historySignalUsed": true,
  "dominantEventTypes": ["casual"],
  "latencyMs": 42
}
```

**Never include**: raw titles, raw descriptions, raw answers.

History lookup failure path:
- Catch the error in `RecommendationsService`
- End the span with `level: 'ERROR'`
- Continue with `historySignalUsed: false` (fallback text in prompt)
- Never fail the recommendation generation

---

### Phase 6 — LLM Judge Update

#### [MODIFY] recommendation-judge.service.ts

**Do not add a new `judge_history_alignment` score** (too large for this PR).

Instead, update `buildJudgePrompt()` to extend the existing `preference_alignment` criterion to cover both:
1. Current-event explicit preferences
2. Historical signals (secondary)

Add a sentence to the judge prompt:

```
Note: The recommendations were generated with access to historical user preference signals as a
SECONDARY signal. The priority order was: (1) hard constraints, (2) current-event explicit
preferences, (3) historical signals. Score preference_alignment LOWER if recommendations appear
to ignore current-event explicit preferences in favor of historical behavior.
```

Also update `JudgeInput` to optionally accept `historySummaryText?: string` (the safe aggregated summary string), and include it in the judge prompt **only** if non-empty.

---

### Phase 7 — Tests

#### [NEW] recommendation-history.service.spec.ts

Covers:
- Retrieves previous selected recommendations for same user
- Excludes current event
- Uses only events where `recommendation_id IS NOT NULL`
- Limits to 20 items
- Returns no-history fallback when no records
- Returns no-history fallback on DB failure
- Dominant event types computed correctly
- Preferred locations computed correctly
- `summaryText` does not contain raw titles / addresses
- `historySignalUsed: false` when `historyItemsCount === 0`

#### [MODIFY] recommendation-prompt-context.builder.spec.ts

New tests:
- `optionalSignalsSummary` includes history summary when `historySummary` is provided
- `optionalSignalsSummary` returns `"No historical user selection data is available."` when no summary
- `recommendationPolicy` explicitly says history is secondary
- `recommendationPolicy` says current-event preferences override history
- `recommendationPolicy` contains priority order: constraints → preferences → history
- `userPreferencesSummary` is still present when history is also present
- `undefined`/`null` do not appear in final context when history is provided

#### [MODIFY] recommendations.service.spec.ts

New tests:
- `retrieve-user-history` span is created
- History span output only contains aggregate metadata (not raw titles)
- Gemini receives prompt including historical signals when available
- Gemini receives fallback text when no history
- Generation succeeds when history lookup throws
- Deterministic scores still attach after history is added
- Judge still runs when enabled
- `promptSource`/`promptVersion` metadata still works
- Retries still create separate generations
- Persistence span still works
- API response shape is unchanged

#### [MODIFY] recommendation-judge.service.spec.ts

New tests:
- Judge prompt includes priority order note
- Judge prompt includes historical summary text when provided
- Judge prompt falls back cleanly when no historical summary

---

### Phase 8 — README Update

#### [MODIFY] README.md

Add a new section `## Historical Personalization Signal` (see Phase 8 in requirements).

---

## Verification Plan

### Automated Tests
```bash
npm run test
npm run build
```

### Manual Verification (Langfuse)
1. Open `generate-recommendations` trace
2. Look for `retrieve-user-history` span — confirm only aggregate metadata
3. Open `event-recommendation-planner` generation — verify `optionalSignalsSummary` includes history signal or fallback
4. Verify all scores still appear

---

## Open Questions

> [!IMPORTANT]
> **Judge input with history**: The `JudgeInput` interface in `recommendation-judge.service.ts` currently takes `userPreferences` as raw `{ question, answerValue }[]` pairs (this is an existing design decision for judge evaluation). The new `historySummaryText` added to `JudgeInput` will be **only** the safe aggregated summary string — never raw history. Confirm this is acceptable.

> [!NOTE]
> **Category extraction from titles**: The `preferredCategories` heuristic uses simple word-frequency on `recommendation.title`. This is intentionally naive (no embeddings, no external API). If titles are very long or ambiguous, categories may be sparse or empty — the code handles this gracefully by omitting that section from `summaryText`.

> [!NOTE]
> **No `finalized_at` on events currently saved**: Looking at `EventStatus` enum, events go to `recommended` status but `finalized_at` may be null in practice (it is set to null by default). The history query falls back to ordering by `created_at DESC` when `finalized_at` is null. This is safe.
