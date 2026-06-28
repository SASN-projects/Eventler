# Eventler Server

A NestJS-based backend server for the Eventler event recommendation platform.

## Features

- **Authentication**: JWT-based authentication with access and refresh tokens
- **User Management**: User profiles and preferences
- **Group Management**: Create and manage event groups
- **Event Management**: Create single or group events
- **Slide Answers**: Collect user preferences through interactive slides
- **Recommendations**: AI-powered event recommendations using Google Gemini with Langfuse observability

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT (passport-jwt)
- **Validation**: class-validator, class-transformer
- **Environment**: dotenv

## Project Structure

```
src/
├── auth/                   # Authentication module
│   ├── dto/               # Data transfer objects
│   ├── entities/          # User entity
│   ├── guards/            # JWT auth guard
│   ├── strategies/        # JWT strategy
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/                 # Users module
│   ├── dto/
│   ├── entities/          # UserPreferences entity
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── groups/                # Groups module
│   ├── dto/
│   ├── entities/          # Group, GroupMember entities
│   ├── groups.controller.ts
│   ├── groups.service.ts
│   └── groups.module.ts
├── events/                # Events module
│   ├── dto/
│   ├── entities/          # Event entity
│   ├── enums/             # Event types and statuses
│   ├── events.controller.ts
│   ├── events.service.ts
│   └── events.module.ts
├── slides/                # Slides module
│   ├── dto/
│   ├── entities/          # SlideAnswer entity
│   ├── slides.controller.ts
│   ├── slides.service.ts
│   └── slides.module.ts
├── recommendations/       # Recommendations module
│   ├── dto/
│   ├── entities/          # Recommendation entity
│   ├── recommendations.controller.ts
│   ├── recommendations.service.ts
│   └── recommendations.module.ts
├── config/               # Configuration files
│   └── database.config.ts
├── app.module.ts
└── main.ts

database/
├── ddl.sql              # Database schema
└── dml.sql              # Sample data
```

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   
   Copy `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```

3. **Set up PostgreSQL database**
   
   Create a PostgreSQL database and run the DDL script:
   ```bash
   psql -U postgres -d eventler < database/ddl.sql
   ```

   Optionally, load sample data:
   ```bash
   psql -U postgres -d eventler < database/dml.sql
   ```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=eventler

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Application
PORT=3000
NODE_ENV=development
```

## Running the Application

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login (email/username + password)
- `GET /auth/me` - Get current user (protected)
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout

### Users (`/users`)
- `GET /users/me` - Get user profile (protected)
- `PUT /users/me` - Update user profile (protected)
- `GET /users/preferences` - Get user preferences (protected)
- `PUT /users/preferences` - Update user preferences (protected)
- `GET /users/events` - Get user's events (protected)

### Groups (`/groups`)
- `POST /groups` - Create a group (protected)
- `GET /groups` - Get user's groups (protected)
- `GET /groups/:id` - Get group details (protected)
- `PUT /groups/:id` - Update group (protected)

### Events (`/events`)
- `POST /events` - Create an event (protected)
- `GET /events/:id` - Get event details (protected)
- `PUT /events/:id` - Update event (protected)
- `DELETE /events/:id` - Delete event (protected)
- `POST /events/recommendations/:id` - Create recommendations for event (protected)
- `GET /events/recommendations/:id` - Get event recommendations (protected)

### Slides (`/slides`)
- `GET /slides` - Get slide questions (protected)
- `POST /slides/:eventId` - Submit slide answers (protected)

### Recommendations (`/recommendations`)
- `GET /recommendations/feed` - Get personalized feed (protected)
- `POST /recommendations/events/:eventId` - Generate recommendations for event (protected)

## Database Schema

### Users
- id (UUID, PK)
- email (unique)
- username (unique)
- password (hashed)
- created_at
- updated_at

### User Preferences
- id (UUID, PK)
- user_id (FK → users)
- budget, location, event_type, atmosphere, transportation
- created_at

### Groups
- id (UUID, PK)
- name, owner_id (FK → users)
- invite_link (unique)
- created_at

### Group Members
- id (UUID, PK)
- group_id (FK → groups)
- user_id (FK → users)

### Events
- id (UUID, PK)
- creator_id (FK → users)
- group_id (FK → groups, nullable)
- type (SINGLE | GROUP)
- budget, location, date
- created_at

### Slide Answers
- id (UUID, PK)
- event_id (FK → events)
- user_id (FK → users)
- question, answer, weight

### Recommendations
- id (UUID, PK)
- event_id (FK → events)
- title, score, rank

## Authentication

The API uses JWT tokens for authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Login Flow
1. Register or login to get access and refresh tokens
2. Use access token for protected endpoints
3. When access token expires, use refresh token to get a new one

## Development Guidelines

- **DTOs**: All request/response data uses Data Transfer Objects
- **Validation**: class-validator is used for input validation
- **Async/Await**: All operations use async/await
- **Controllers**: Only handle HTTP requests and call services
- **Services**: Contain all business logic
- **HTTP Status Codes**: Proper status codes for all responses

## Testing

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## Langfuse Observability

This project has production-grade integration with [Langfuse](https://langfuse.com/) for LLM/AI observability.

### Configuration Environment Variables
Add the following configuration settings to your `.env` file:

```env
# Enable/Disable Langfuse Tracing (true/false)
LANGFUSE_ENABLED=true

# Langfuse Project Credentials
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com # or self-hosted endpoint

# Optional Tracing Metadata
LANGFUSE_ENVIRONMENT=development
LANGFUSE_RELEASE=0.0.1
```

### Local Setup & Testing
1. Ensure `LANGFUSE_ENABLED=true` is set and you have supplied valid project keys.
2. Run the application locally in development/watch mode:
   ```bash
   npm run start:dev
   ```
3. Trigger the recommendations generation endpoint by submitting slide answers for an event in the UI or via POST call to `/recommendations/events/:eventId/generate`.
4. Log in to your Langfuse dashboard to view detailed traces, spans, latency, errors, prompts, and token counts.
5. In local development or environments where `LANGFUSE_ENABLED=false` or credentials are missing, Langfuse fallback mechanism operates silently in **Noop mode** without throwing exceptions or blocking the core application flow.

### What is Traced
- **Traces**: High-level event recommendations generation trace containing standard metadata (e.g. `environment`, `release`), event-owner mapped to `userId`, event-id mapped to `sessionId`, and overall request inputs/outputs/errors.
- **Retrieval Spans**: Database queries retrieving preferences (slide responses) for the event (our local preference RAG step).
- **Generations**: Prompt templates sent to the Gemini API, raw responses returned, model configurations, latency metrics, prompt management details (names & versions), and token usage (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`).

### Quality Evaluation Scores

In addition to raw tracing, the recommendation generation flow automatically computes **deterministic quality scores** and attaches them to the Langfuse trace after every model call.

#### Scores recorded

| Score name | Type | Good value | What it measures |
|---|---|---|---|
| `json_validity` | `0 \| 1` | `1` | Model output is parseable JSON |
| `schema_compliance` | `0 \| 1` | `1` | Parsed JSON contains a `recommendedEvents` array |
| `recommendations_count` | `number` | `3` | Number of recommendations returned (expected: 3) |
| `has_duplicate_recommendations` | `0 \| 1` | `0` | Duplicate titles detected (case-insensitive) |
| `has_empty_required_fields` | `0 \| 1` | `0` | Any item missing `title`, `description`, or `address` |

#### How to view scores in Langfuse

1. Open your [Langfuse dashboard](https://cloud.langfuse.com) and navigate to **Traces**.
2. Click on any `generate-recommendations` trace.
3. Open the **Scores** tab on the right-hand panel — all 5 metrics will appear with their numeric values.
4. Use the **Scores** overview page (`/scores`) to filter, aggregate, and chart score trends across all traces over time.

#### Why deterministic scores first

Deterministic evaluators are cheap, fast, and 100% reproducible — they run in microseconds with zero additional API calls or cost.
They provide an immediate quality baseline that catches structural regressions (malformed JSON, wrong field names, duplicates) before adding the complexity and latency of an LLM-as-a-Judge layer.
Once deterministic coverage is solid and score baselines are established in Langfuse, a model-based evaluator can be layered on top to assess semantic quality (relevance, novelty, coherence) without duplicating structural checks.

### Privacy & Data Security
To avoid leakage of sensitive production credentials, tokens, or PII:
- **Redaction Helper**: A recursive data sanitizer (`sanitizeData` in `backend/src/langfuse/utils/redact.ts`) runs automatically before any trace or generation is sent to Langfuse.
- **Redacted fields**: Keys containing keywords like `password`, `token`, `secret`, `authorization`, `cookie`, `key`, `apikey`, `credential`, `private` are stripped and logged as `[REDACTED]`.

### LLM-as-a-Judge Evaluation

In addition to deterministic scores, the recommendation flow supports an **optional** LLM-as-a-Judge layer that uses a language model to evaluate the semantic quality of generated recommendations.

> [!IMPORTANT]
> **Disabled by default.** Set `RECOMMENDATION_JUDGE_ENABLED=true` to activate it.

#### What it does

After recommendations are generated and deterministic scores are computed, the judge model receives a minimized summary of the event context and the generated recommendations. It returns a structured JSON evaluation covering semantic quality dimensions that deterministic checks cannot capture (relevance, coherence, diversity, etc.).

The judge evaluation is **best-effort**: if it fails, times out, or produces invalid JSON, the recommendation response is unaffected.

#### How to enable

Add to your `.env`:

```env
RECOMMENDATION_JUDGE_ENABLED=true
RECOMMENDATION_JUDGE_MODEL=gemini-2.5-flash        # defaults to GOOGLE_GEMINI_MODEL
RECOMMENDATION_JUDGE_TIMEOUT_MS=15000              # max wait for judge response
RECOMMENDATION_JUDGE_SAMPLE_RATE=1                 # 1 = 100%, 0.5 = 50%, 0 = never
RECOMMENDATION_JUDGE_MAX_INPUT_LENGTH=4000         # truncate judge prompt at this length
RECOMMENDATION_JUDGE_MAX_OUTPUT_LENGTH=2000        # truncate recommendation descriptions
```

#### Scores recorded

| Score name | Range | What it measures |
|---|---|---|
| `judge_relevance_to_event` | 0–1 | Are recommendations relevant to the event type? |
| `judge_preference_alignment` | 0–1 | Do recommendations reflect user preferences? |
| `judge_location_fit` | 0–1 | Suitable for the requested location? |
| `judge_date_time_fit` | 0–1 | Plausible for the requested date/time? |
| `judge_specificity` | 0–1 | Concrete and useful rather than vague? |
| `judge_diversity` | 0–1 | Meaningfully different from each other? |
| `judge_hallucination_risk` | 0/0.5/1 | Invented facts: high=0, medium=0.5, low=1 |
| `judge_overall_quality` | 0–1 | Overall quality of the output |
| `judge_latency_ms` | ms | Time taken by the judge model call |
| `judge_failed` | 0/1 | 1 if judge call failed for any reason |

#### Privacy and cost notes

- **Raw user answers are never sent to the judge.** Only the count of preferences collected is included in the judge prompt.
- **Cost**: enabling the judge adds one extra model call per recommendation generation (subject to `RECOMMENDATION_JUDGE_SAMPLE_RATE`). Use sampling to control cost in high-traffic environments.
- All judge inputs pass through the existing `sanitizeData()` redaction layer before reaching Langfuse.

### Langfuse Quality Monitoring

This section details how to monitor and evaluate the quality of recommendation generation runs in the Langfuse dashboard.

#### Where to View Traces
1. Go to your Langfuse dashboard.
2. Select **Tracing** from the left sidebar and click on the **Traces** tab.
3. Look for traces named `generate-recommendations`. Clicking a trace opens the detail view showing the chronological timeline of steps (`retrieve-user-preferences` span, model call attempt generation, and optional `recommendation-llm-judge` generation).

#### Where to View Scores
1. In a single trace's detail view, click the **Scores** tab in the right-hand panel to view all deterministic and judge scores assigned to that trace.
2. For aggregate statistics, click **Scores** in the left sidebar to navigate to the **Score Analytics** dashboard. Here, you can monitor average quality trends over time and filter metrics by environment or release version.

#### Which Scores to Monitor & Suggested Thresholds
To ensure the recommendation system remains healthy and doesn't degrade, track these scores and follow the suggested evaluation thresholds:

* **Structural Integrity (Deterministic)**
  * `json_validity`: Must remain `1.0`. Any drop to `0` means the model returned unparseable JSON.
  * `schema_compliance`: Must remain `1.0`. Any drop to `0` indicates missing required arrays (e.g., `recommendedEvents`).
  * `has_duplicate_recommendations = 1`: Investigate. Represents a drop in output variety (model repeated itself).
  * `has_empty_required_fields = 1`: Investigate. Represents incomplete recommendations missing titles, descriptions, or addresses.

* **LLM-as-a-Judge Quality (When Enabled)**
  * `judge_overall_quality < 0.65`: Investigate. Quality is below normal parameters.
  * `judge_overall_quality < 0.5`: Critical. Significant quality drop.
  * `judge_failed > 0.05`: Investigate. More than 5% of judge evaluations are failing.
  * `judge_failed > 0.15`: Critical. Significant failure rate in the evaluator layer.

### Langfuse Prompt Management

This project uses [Langfuse Prompt Management](https://langfuse.com/docs/prompts) to manage prompt templates dynamically, decouple them from the application code, and track version updates.

#### Configuration
- **Prompt Name**: `event-recommendation-planner`
- **Prompt Type**: `text`
- **Dynamic placeholders**:
  - `{{eventCoreContext}}`: Structured key event metrics (date, location, type, participant count).
  - `{{userPreferencesSummary}}`: Summarized participant responses for personalized matches.
  - `{{constraintsSummary}}`: Absolute limits the model must respect (schema keys, exact counts).
  - `{{optionalSignalsSummary}}`: Hook for future signals.
  - `{{recommendationPolicy}}`: Strict execution priorities for recommendations.
  - `{{outputFormatInstructions}}`: Output schema layout.

#### Future-Proof Design
Instead of adding individual top-level variables for every new recommendation signal (such as budget, weather, maps, or history), additional signals are appended into the structured sections produced by `RecommendationPromptContextBuilder` (e.g. within `{{optionalSignalsSummary}}` or `{{constraintsSummary}}`). This keeps the Langfuse template simple and future-proof without requiring updates to template arguments or schema parsing.

#### Resiliency & Fallback Strategy
To prevent Langfuse outages, network drops, or missing credentials from disrupting users, the prompt retrieval uses a strict fallback strategy:
1. If the Langfuse client is disabled or credentials are omitted, it bypasses the API call.
2. If the API request fails, timed out, or the prompt does not exist, the error is safely caught and a warning is logged.
3. The flow transparently falls back to `RECOMMENDATION_FALLBACK_TEMPLATE` (a local copy of the prompt), using the exact same variable compilation.
4. The generation is successfully tracked with metadata: `{ promptVersion: 'fallback', promptSource: 'fallback' }`.

---

## Historical Personalization Signal

The recommendation engine incorporates a **soft secondary personalization signal** derived from the user's previous event selections. This improves recommendation relevance over time without building a heavy ML system.

### What historical data is used

- **Source**: The `events` table, filtered to records owned by the current user (`created_by = userId`) that have a non-null `recommendation_id` — meaning the user explicitly selected that recommendation.
- **Fields used (after aggregation)**: `event_type`, `location_city`, event participant count bucket, and keyword hints extracted from selected `recommendation.title` values against a fixed vocabulary (e.g., "restaurant", "outdoor", "museum").
- **Limit**: At most the last **20** selected events are considered, ordered by recency (`finalized_at DESC`, falling back to `created_at DESC`).
- **Current event is excluded**: The event currently being planned is never included in the history lookup.

### Priority rules (strict)

Historical preferences are a **soft secondary signal** only. The following strict priority order is enforced at every level (prompt, policy, judge):

```
1. Hard constraints from the current event   (location, date, participants, schema)
2. Explicit current-event user preferences   (slide answers for this event)
3. Historical user preference signals        (secondary — never override current preferences)
4. Diversity, specificity, and general quality
```

If the user's current-event answers conflict with their historical behaviour, **current-event answers win**. Example: a user who historically chose restaurants but explicitly asks for an outdoor adventure will receive outdoor recommendations.

### Privacy guarantees

- **Raw history is never sent to Langfuse spans or logs.** The `retrieve-user-history` span contains only aggregate metadata:
  - `historyItemsCount` (count)
  - `historySignalUsed` (boolean)
  - `dominantEventTypes` (top aggregated labels)
  - `latencyMs`
- Raw recommendation titles, descriptions, addresses, and previous user answers are **never** emitted to Langfuse or any log.
- The aggregated `summaryText` passed to the Gemini prompt contains only keyword-level category labels derived from a fixed vocabulary — no raw text from past recommendations.

### Where the signal appears in the prompt

The historical summary is placed in the `{{optionalSignalsSummary}}` section of the prompt template. When history exists:

```
Historical user preference signals (secondary — must not override current-event preferences):
- User often selected restaurant-related recommendations.
- User frequently organized individual-type events.
- User has previously preferred events in: Tel Aviv.
- These signals are SECONDARY. The current event's explicit preferences and constraints take priority.
```

When no history is available, the fallback text is:

```
No historical user selection data is available.
```

### How to verify in Langfuse

1. Open your [Langfuse dashboard](https://cloud.langfuse.com) and navigate to **Traces**.
2. Click on any `generate-recommendations` trace.
3. In the trace timeline, locate the **`retrieve-user-history`** span.
   - Confirm the span's output contains only aggregate fields: `historyItemsCount`, `historySignalUsed`, `dominantEventTypes`, `latencyMs`.
   - Confirm raw recommendation titles, descriptions, or addresses are **not present**.
4. Click on the **`event-recommendation-planner (attempt N)`** generation.
   - Open the **Input** tab and look at the `{{optionalSignalsSummary}}` section.
   - Verify it contains either the historical summary or the no-history fallback message.
   - Verify the `{{recommendationPolicy}}` section mentions: *"Historical preferences are only a soft secondary signal. They must never override explicit preferences or hard constraints provided for the current event."*
5. Open the **Scores** tab — confirm all deterministic and judge scores still appear.

### Implementation details

| Component | Role |
|---|---|
| `RecommendationHistoryService` | Queries history, aggregates into safe summary struct, never throws |
| `RecommendationPromptContextBuilder.build(…, historySummary?)` | Renders summary into `optionalSignalsSummary` |
| `recommendations.service.ts` | `retrieve-user-history` span + wires history into prompt + judge |
| `recommendation-judge.service.ts` | Updated `JudgeInput.historySummaryText?` + priority note in judge prompt |

---

## License

MIT

---

Built with [NestJS](https://nestjs.com/) - A progressive Node.js framework for building efficient and scalable server-side applications.

