# Eventler Server

A NestJS-based backend server for the Eventler event recommendation platform.

## Features

- **Authentication**: JWT-based authentication with access and refresh tokens
- **User Management**: User profiles and preferences
- **Group Management**: Create and manage event groups
- **Event Management**: Create single or group events
- **Slide Answers**: Collect user preferences through interactive slides
- **Recommendations**: AI-powered event recommendations (stub implementation)

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

## Testing

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## License

MIT

---

Built with [NestJS](https://nestjs.com/) - A progressive Node.js framework for building efficient and scalable server-side applications.
