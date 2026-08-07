# Group Questionnaire Lifecycle — Audit & Implementation Plan

## Phase 1: Read-Only Audit Results

### 1. How group questionnaires/events are currently created

Group events are created via `POST /events` → `EventsService.create()`.  
The caller provides `eventType: 'group'` and a `groupId` in the body (`CreateEventDto`).  
`createdById` is set from the JWT (`req.user.sub`).  
**There is no dedicated "group questionnaire create" endpoint** — it re-uses the generic event creation flow.  
The DDL enforces `CHECK (event_type = 'group' AND group_id IS NOT NULL)`.

### 2. Where group members are stored

`group_members` table (TypeORM entity: `GroupMember`).  
PK: `(group_id, user_id)`.  
Columns: `group_id`, `user_id`, `role` (`group_role_enum`: `'owner'` | `'member'`), `joined_at`.  
The group creator is auto-inserted as a member (no explicit `role = 'owner'` assigned in `GroupsService.create()` — the insert uses the entity default `'member'`, although the DB enum includes `'owner'`).

### 3. How the questionnaire creator/owner is represented

`events.created_by` → `Event.createdById` (FK to `users.id`).  
The group creator is tracked in `groups.created_by` → `Group.createdById`.  
**There is no `ownerUserId` on the event itself** — ownership is implicit via `created_by`.  
Authorization checks in `EventsService` compare `event.creator.id !== userId`.

### 4. Where group member answers are stored

`event_responses` table (TypeORM entity: `EventResponse`).  
Unique constraint: `(event_id, user_id, question)`.  
Written by `SlidesService.submitAnswers()`.  
Individual answer rows store `question`, `answer_value`, `min_value`, `max_value`, `weight`.

### 5. How the system determines whether a member has answered

`SlidesService.submitAnswers()` (lines 196–223):  
After saving answers, queries all `event_responses` for the `event_id`, extracts distinct `user_id`s, then checks whether every `group_members.user_id` for the group is in the answered set.

### 6. Whether there is currently a questionnaire/event status field

**Yes.** `events.status` (TypeORM: `Event.status`, default `'draft'`).  
Enum `EventStatus` (TypeScript):
```
DRAFT = 'draft'
COLLECTING_RESPONSES = 'collecting_responses'
RECOMMENDED = 'recommended'
FINALIZED = 'finalized'
CANCELLED = 'cancelled'
```
DB enum `event_status_enum` has the same 5 values.

### 7. Existing lifecycle concept mapping

| Required concept | Existing status | Gap |
|---|---|---|
| Open questionnaire | `collecting_responses` | Partially — no `OPEN` status, but functionally equivalent |
| Closed questionnaire | None explicitly | ❌ Missing |
| Recommendation generation started | None | ❌ Missing |
| Recommendations ready | `recommended` (misused — set before generation!) | ❌ Misused |
| Final recommendation selected | `finalized` | ✅ Exists |

### 8. How recommendations are currently triggered for group events

**Critical bug**: `SlidesService.submitAnswers()` transitions the event to `RECOMMENDED` (status) when all members answered — **but does NOT call `RecommendationsService.generateRecommendation()`**. No recommendation generation is ever triggered automatically.  
Manually: `POST /recommendations/events/:eventId/generate` calls `generateRecommendation(eventId)` — no status check, no auth check on the event owner, works for any event type regardless of status.

### 9. Whether recommendations can be generated before everyone answers

**Yes — currently possible.** `RecommendationsService.generateRecommendation()` has no guard checking `event.status` or whether all group members have answered. Any user with event access can call `POST /recommendations/events/:eventId/generate` at any time.

### 10. Whether any scheduled/background mechanism exists

**None.** No `@nestjs/schedule`, no cron job, no task queue, no background worker.

### 11. How manual actions are authorized

- `EventsService`: checks `event.creator.id !== userId` (throws `ForbiddenException`).
- `RecommendationsService.selectRecommendation()`: soft check — returns `{ success: false, message }` instead of throwing (not a proper HTTP 403).
- `RecommendationsService.generateRecommendation()`: **no auth check at all** — open to any authenticated user.
- Group-level: `GroupsService` checks `group.createdById !== requesterId`.

### 12. How final recommendation selection is currently stored

`RecommendationsService.selectRecommendation()` sets:
- `event.recommendation = recommendation` (FK `recommendation_id`)
- `event.status = EventStatus.FINALIZED`
- `event.finalizedAt = new Date()`

**Gap**: Does not validate that the recommendation belongs to this event (any recommendation UUID works), does not check that status is `RECOMMENDED` first, does not prevent re-selection.

### 13. Which services/controllers/entities/DML/tests are involved

**Services**: `EventsService`, `GroupsService`, `SlidesService`, `RecommendationsService`, `RecommendationHistoryService`, `RecommendationJudgeService`, `RecommendationPromptContextBuilder`, `RecommendationQualityEvaluator`  
**Controllers**: `EventsController`, `GroupsController`, `SlidesController`, `RecommendationsController`  
**Entities**: `Event`, `EventResponse`, `EventParticipant`, `Group`, `GroupMember`, `Recommendation`, `Venue`, `User`  
**Enums**: `EventStatus`, `EventType`, `GroupRole`, `ParticipantStatus`  
**DML**: `eventler_final_dml.sql` (seed data)  
**DDL**: `eventler_final_ddl.sql`  
**Tests**: `recommendations.service.spec.ts`, `recommendation-history.service.spec.ts`, `recommendation-judge.service.spec.ts`, `recommendation-prompt-context.builder.spec.ts`, `recommendation-quality.evaluator.spec.ts`, `slides.service.spec.ts`, `slider-question-seed.spec.ts`

---

## Current Group Flow Summary

```
POST /events (type=group, groupId)
  → Event created with status=DRAFT (no automatic transition to OPEN/COLLECTING_RESPONSES)
  
POST /slides/submit-answers/:eventId (by any group member)
  → Answers saved to event_responses
  → If all members answered → event.status = RECOMMENDED (no generation triggered)
  → If not all answered → no status change

POST /recommendations/events/:eventId/generate (any auth user, no checks)
  → Generates recommendations regardless of status
  → Does NOT link recommendations to the event
  → Does NOT update event status

POST /recommendations/events/:eventId/select/:recommendationId
  → Sets event.status = FINALIZED, event.recommendation_id
  → Does NOT validate recommendation belongs to this event
  → Only soft-checks creator
```

---

## Current Data Model Summary

```
events
  id, title, description, event_type, status (draft|collecting_responses|recommended|finalized|cancelled)
  created_by (→ users.id)          ← implicit owner
  group_id (→ groups.id)
  deadline_at TIMESTAMP            ← exists but unused in group lifecycle
  recommendation_id (→ recommendations.id)  ← single FK, not event-scoped
  finalized_at TIMESTAMP
  
event_responses
  (event_id, user_id, question)    ← per-member answers
  
groups
  created_by                       ← group owner

group_members
  (group_id, user_id, role)        ← role='owner'|'member', but creator inserted as 'member'

recommendations
  id, title, description, address  ← NOT linked back to event_id
```

---

## Missing Lifecycle Pieces

| # | Missing | Impact |
|---|---|---|
| 1 | `OPEN` status (map to `collecting_responses`) | Answers rejected after close |
| 2 | `CLOSED` status | Gate for recommendation generation |
| 3 | `GENERATING_RECOMMENDATIONS` status | Prevent duplicate generation |
| 4 | `RECOMMENDATIONS_READY` status | Gate for final selection |
| 5 | `FINAL_SELECTION_MADE` status | Explicit terminal state |
| 6 | `closeAt` / `closedAt` / `closedByUserId` / `closeReason` fields on `events` | Closing config & audit |
| 7 | `event_id` on `recommendations` | Scope recommendations to an event |
| 8 | Auto-trigger generation after questionnaire closes | Core lifecycle |
| 9 | Guard on generation endpoint (status = CLOSED/GENERATING) | Prevent premature generation |
| 10 | Auth check on generation endpoint | Security |
| 11 | Validate recommendation belongs to event in selection | Data integrity |
| 12 | Deadline-based closing mechanism | Scheduler or lazy-close |
| 13 | Creator correctly inserted as `role='owner'` in `group_members` | Ownership model |

---

## User Review Required

> [!IMPORTANT]
> **Status field strategy**: The existing `EventStatus` enum (`DRAFT`, `COLLECTING_RESPONSES`, `RECOMMENDED`, `FINALIZED`, `CANCELLED`) must be extended. The DB `event_status_enum` will need an `ALTER TYPE` migration. Since this is a PostgreSQL enum, we must add values with `ALTER TYPE event_status_enum ADD VALUE IF NOT EXISTS`.
>
> New statuses to add:
> - `OPEN` (maps conceptually to `collecting_responses` — we can **reuse** `collecting_responses` as `OPEN` to avoid breaking existing data, or add a new `OPEN` value)
> - `CLOSED`
> - `GENERATING_RECOMMENDATIONS`  
> - `RECOMMENDATIONS_READY`
> - `FINAL_SELECTION_MADE`
>
> **Recommendation**: reuse `collecting_responses` as the `OPEN` state (they are semantically identical), and add the 4 new statuses. This preserves existing data.

> [!IMPORTANT]
> **Recommendations table**: Currently `recommendations` has no `event_id` FK. We need to add `event_id UUID REFERENCES events(id)` to scope recommendations to an event. This is the minimal schema change required for final-selection validation and lifecycle gating.

> [!WARNING]
> **`deadline_at` vs `closeAt`**: The `events` table already has `deadline_at TIMESTAMP`. We can **reuse** `deadline_at` as `closeAt` instead of adding a new column, since it is currently unused in the lifecycle. This avoids a schema change.

> [!CAUTION]
> **No scheduler exists.** For Phase 6 (deadline close), we will implement a **lazy-close check** (checked when answers are submitted and when the event is read), with a clear TODO for a proper scheduled job. This avoids adding `@nestjs/schedule` as a new dependency.

---

## Open Questions

> [!NOTE]
> 1. Should `OPEN` be a brand-new DB enum value, or should we reuse `collecting_responses` as the OPEN state? (Recommendation: reuse `collecting_responses`)
> 2. Should `deadline_at` be reused as `closeAt`, or should a new column `close_at` be added? (Recommendation: reuse `deadline_at`)
> 3. Should `group_members.role` be enforced as `'owner'` for the group creator at insert time, or is the `groups.created_by` field sufficient as the canonical owner check? (Recommendation: use `groups.created_by` / `events.created_by` as the canonical owner check — do not change group_members insert)

---

## Proposed Changes

### Component 1: Database Schema

#### [MODIFY] [eventler_final_ddl.sql](file:///C:/Users/daber/Desktop/Eventler/db/eventler_final_ddl.sql)
- Add new enum values: `'closed'`, `'generating_recommendations'`, `'recommendations_ready'`, `'final_selection_made'` to `event_status_enum` via `ALTER TYPE ... ADD VALUE IF NOT EXISTS`.
- Add columns to `events`: `close_at TIMESTAMP`, `closed_at TIMESTAMP`, `closed_by_user_id UUID REFERENCES users(id)`, `close_reason VARCHAR(50)`.
- Add `event_id UUID REFERENCES events(id) ON DELETE CASCADE` to `recommendations`.
- Add index on `events(status, event_type)` for deadline-close queries.

---

### Component 2: TypeScript Enums

#### [MODIFY] [event-status.enum.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/events/enums/event-status.enum.ts)
Add:
```typescript
OPEN = 'collecting_responses'   // reuse existing DB value as the canonical OPEN state
CLOSED = 'closed'
GENERATING_RECOMMENDATIONS = 'generating_recommendations'
RECOMMENDATIONS_READY = 'recommendations_ready'
FINAL_SELECTION_MADE = 'final_selection_made'
```

#### [NEW] [close-reason.enum.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/events/enums/close-reason.enum.ts)
```typescript
export enum CloseReason {
  ALL_MEMBERS_ANSWERED = 'ALL_MEMBERS_ANSWERED',
  DEADLINE_REACHED = 'DEADLINE_REACHED',
  OWNER_MANUAL_CLOSE = 'OWNER_MANUAL_CLOSE',
}
```

---

### Component 3: Event Entity

#### [MODIFY] [event.entity.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/events/entities/event.entity.ts)
Add columns:
- `closeAt: Date | null` — maps to `deadline_at` (reuse existing column) OR new `close_at` column
- `closedAt: Date | null` — new column
- `closedByUserId: string | null` — new column
- `closeReason: CloseReason | null` — new column

Add optional relation: `generatedRecommendations: Recommendation[]` (one event → many recommendations via new `recommendations.event_id`)

---

### Component 4: Recommendation Entity

#### [MODIFY] [recommendation.entity.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/recommendations/entities/recommendation.entity.ts)
Add: `eventId: string | null` (FK → events.id, nullable for backward compat with individual events if needed, or non-null)

---

### Component 5: DTOs

#### [MODIFY] [create-event.dto.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/events/dto/create-event.dto.ts)
- Add optional `closeAt?: string` (ISO date string, validated as future date for group events)
- Make `status` optional with default `DRAFT` (currently required from client — that's a design smell)

#### [NEW] [close-group-event.dto.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/events/dto/close-group-event.dto.ts)
Empty DTO (manual close has no body fields; all data comes from the JWT and event state).

---

### Component 6: SlidesService — Answer Submission (Phase 4)

#### [MODIFY] [slides.service.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/slides/slides.service.ts)
**`submitAnswers()`**:
1. After loading event, check `event.status`. If not `OPEN` (`collecting_responses`), throw `BadRequestException('Questionnaire is closed. No new answers are accepted.')`.
2. After saving answers, run lazy-close check: if `event.closeAt && event.closeAt <= new Date()` and event is still OPEN → close with `DEADLINE_REACHED`.
3. After the all-members check: if all answered → close with `ALL_MEMBERS_ANSWERED` → trigger generation.
4. **Remove** the `eventRepository.update({ status: RECOMMENDED })` call for group events (it must not set RECOMMENDED directly — that belongs to the new lifecycle).
5. **Preserve** individual event flow: individual events still transition immediately (but use the new status `RECOMMENDATIONS_READY` or keep `recommended` for backward compat).
6. Inject `RecommendationsService` (circular dep avoidance: use a forwardRef or extract a shared `GroupLifecycleService`).

---

### Component 7: GroupLifecycleService — Core Lifecycle (Phases 2, 3, 5, 6, 7)

#### [NEW] [group-lifecycle.service.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/events/group-lifecycle.service.ts)
Responsibilities:
- `closeQuestionnaire(eventId, closeReason, closedByUserId?)`: idempotent close, sets `status=CLOSED`, `closedAt`, `closedByUserId`, `closeReason`, then triggers generation.
- `triggerRecommendationGeneration(eventId)`: transitions to `GENERATING_RECOMMENDATIONS`, calls `RecommendationsService.generateRecommendation()`, then sets `RECOMMENDATIONS_READY` or handles failure.
- `checkAndCloseIfDeadlinePassed(event)`: lazy deadline check.
- `checkAndCloseIfAllMembersAnswered(event, groupId)`: used by answer submission.

This service avoids circular dependencies by being in the `events` module and only importing from `recommendations` via a shared service interface or `forwardRef`.

---

### Component 8: EventsController — New Endpoints (Phases 5, 8)

#### [MODIFY] [events.controller.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/events/events.controller.ts)
Add:
- `POST /events/:id/close` — owner manual close (Phase 5)
- `POST /events/:id/select-recommendation/:recommendationId` — final recommendation selection (Phase 8)

---

### Component 9: EventsService (Phases 5, 8)

#### [MODIFY] [events.service.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/events/events.service.ts)
Add:
- `closeQuestionnaire(eventId, userId)`: validates owner, OPEN status, delegates to `GroupLifecycleService`.
- `selectFinalRecommendation(eventId, recommendationId, userId)`: validates owner, `RECOMMENDATIONS_READY` status, validates recommendation belongs to event, sets `FINAL_SELECTION_MADE`.

---

### Component 10: RecommendationsService (Phases 7, 8)

#### [MODIFY] [recommendations.service.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/recommendations/recommendations.service.ts)
- `generateRecommendation()`: add guard — if `event.eventType === GROUP` and `event.status !== CLOSED && event.status !== GENERATING_RECOMMENDATIONS`, return early with error.
- Link saved recommendations to `eventId` via `recommendations.event_id`.
- After saving, update event status to `RECOMMENDATIONS_READY`.
- `selectRecommendation()`: move to `EventsService.selectFinalRecommendation()` or keep but add proper status guard (must be `RECOMMENDATIONS_READY`), validate recommendation `eventId` matches `eventId`, throw proper HTTP errors.
- Add safe lifecycle Langfuse metadata: `questionnaireStatus`, `closeReason`, `answeredMembersCount`, `expectedMembersCount`, `hasCloseAt`.

---

### Component 11: RecommendationsController (Phase 7)

#### [MODIFY] [recommendations.controller.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/recommendations/recommendations.controller.ts)
- Add auth check on `generateRecommendation` — only owner can call it (or remove this endpoint if generation is now only triggered internally).
- **Preferred**: keep the endpoint but add event-owner guard + status guard.

---

### Component 12: Tests (Phase 11)

#### [NEW] [group-lifecycle.service.spec.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/events/group-lifecycle.service.spec.ts)
Full test suite per Phase 11 spec:
- Group creation (owner stored, closeAt stored, starts OPEN)
- Answer submission (OPEN accepts, CLOSED rejects, all-members triggers close + generation once)
- Manual close (owner can, non-owner cannot, sets OWNER_MANUAL_CLOSE, triggers generation once, idempotent)
- Deadline close (overdue closes, DEADLINE_REACHED, generation once, non-overdue stays OPEN, individual not affected)
- Recommendation generation (not while OPEN, generated after CLOSED, no duplicate, moves to RECOMMENDATIONS_READY)
- Final selection (owner after READY, non-owner blocked, not before READY, invalid rec id, no double selection)
- Privacy/Langfuse (raw answers not in spans)
- Existing behavior (individual flow, prompt management, scores, history)

#### [MODIFY] [slides.service.spec.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/slides/slides.service.spec.ts)
Update existing tests to reflect new OPEN-gate behavior.

#### [MODIFY] [recommendations.service.spec.ts](file:///C:/Users/daber/Desktop/Eventler/backend/src/recommendations/recommendations.service.spec.ts)
Add tests for status guards (group not generated while OPEN).

---

### Component 13: README/Docs (Phase 12)

#### [MODIFY] [README.md](file:///C:/Users/daber/Desktop/Eventler/backend/README.md)
Add Group Questionnaire Lifecycle section per Phase 12 spec.

---

## Migration Strategy (No ORM Auto-Migration)

Since there is no `TypeORM` migration runner configured (raw SQL DDL files used instead), all schema changes go into the DDL file as `ALTER` statements + updated DDL, and a separate migration script.

New SQL (to be applied to existing DB):
```sql
-- 1. Add new enum values
ALTER TYPE event_status_enum ADD VALUE IF NOT EXISTS 'closed';
ALTER TYPE event_status_enum ADD VALUE IF NOT EXISTS 'generating_recommendations';
ALTER TYPE event_status_enum ADD VALUE IF NOT EXISTS 'recommendations_ready';
ALTER TYPE event_status_enum ADD VALUE IF NOT EXISTS 'final_selection_made';

-- 2. Add close lifecycle columns to events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS close_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS closed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS close_reason VARCHAR(50);

-- 3. Add event_id FK to recommendations
ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- 4. Index for deadline-close queries
CREATE INDEX IF NOT EXISTS index_events_status_type ON events(status, event_type);
CREATE INDEX IF NOT EXISTS index_events_close_at ON events(close_at) WHERE close_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS index_recommendations_event_id ON recommendations(event_id);
```

---

## Verification Plan

### Automated Tests
```
cd backend
npm run test
npm run build
```

### Manual Verification
1. Create group event with `closeAt` in future — verify `status = collecting_responses`.
2. Submit answers as non-owner member — verify accepted while OPEN.
3. Verify `POST /recommendations/events/:id/generate` blocked if status is OPEN.
4. Trigger manual close as owner — verify `status = CLOSED` → `GENERATING_RECOMMENDATIONS` → `RECOMMENDATIONS_READY`.
5. Attempt manual close as non-owner — verify 403.
6. Submit answer after close — verify 400.
7. Select recommendation as owner after READY — verify `FINAL_SELECTION_MADE`.
8. Attempt selection as non-owner — verify 403.
9. Attempt selection before READY — verify 400.
10. Verify individual flow still works end-to-end.

---

## Status Transition Diagram

```
                  [GROUP EVENT CREATED]
                          │
                          ▼
                ┌─────────────────┐
                │  collecting_    │  ◄── OPEN state
                │  responses      │      (members can submit answers)
                └─────────────────┘
                   │      │      │
        all members │      │ owner │ closeAt
          answered  │      │ closes│ passed
                   ▼      ▼      ▼
                ┌─────────────────┐
                │    CLOSED       │  ← closedAt, closedByUserId, closeReason set
                └─────────────────┘
                          │
                          ▼ (auto-triggered)
                ┌─────────────────────────────┐
                │ GENERATING_RECOMMENDATIONS  │
                └─────────────────────────────┘
                          │
                          ▼
                ┌──────────────────────┐
                │ RECOMMENDATIONS_READY│  ◄── owner can select
                └──────────────────────┘
                          │ owner selects
                          ▼
                ┌──────────────────────┐
                │ FINAL_SELECTION_MADE │  ◄── terminal
                └──────────────────────┘
```

---

## Limitations & Follow-Up

1. **No scheduler**: Deadline-close is lazy (checked on answer submission and event reads). A proper `@nestjs/schedule` cron job should be added as a follow-up to guarantee timely closing without a member trigger.
2. **Circular dependency**: `SlidesService` needs to trigger generation → `RecommendationsService`. This is resolved via `GroupLifecycleService` in the `events` module acting as the coordinator, with `RecommendationsService` imported via `forwardRef` or by having `SlidesService` emit an event that `RecommendationsService` handles.
3. **`recommendations.event_id` backward compat**: Individual-event recommendations currently have no `event_id` linkage. The column is added as nullable so existing data is unaffected.
4. **Existing `status` client contract**: If the frontend reads `event.status`, adding new values is backward-compatible as long as the frontend handles unknown values gracefully.
