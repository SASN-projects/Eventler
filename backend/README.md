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

## License

MIT

---

Built with [NestJS](https://nestjs.com/) - A progressive Node.js framework for building efficient and scalable server-side applications.
