# Eventler Server - Quick Start Guide

## ✅ Project Created Successfully!

Your NestJS backend server for Eventler has been created with all the requested modules and features.

## 📁 Project Location
```
c:\Users\daber\OneDrive\שולחן העבודה\eventler\eventler-server
```

## 🚀 What's Been Implemented

### ✅ Core Infrastructure
- **NestJS Framework**: Latest version with TypeScript
- **PostgreSQL Database**: TypeORM integration configured
- **JWT Authentication**: Access & refresh tokens
- **Environment Configuration**: dotenv setup
- **Validation**: class-validator & class-transformer
- **CORS**: Enabled for frontend integration

### ✅ Modules Implemented

#### 1. Authentication Module (`/auth`)
- ✅ POST `/auth/register` - User registration
- ✅ POST `/auth/login` - Login with email OR username + password
- ✅ GET `/auth/me` - Get current user (protected)
- ✅ POST `/auth/refresh` - Refresh access token
- ✅ POST `/auth/logout` - Logout

#### 2. Users Module (`/users`)
- ✅ GET `/users/me` - Get user profile
- ✅ PUT `/users/me` - Update user profile
- ✅ GET `/users/preferences` - Get user preferences
- ✅ PUT `/users/preferences` - Update preferences
- ✅ GET `/users/events` - Get user's events

#### 3. Groups Module (`/groups`)
- ✅ POST `/groups` - Create group
- ✅ GET `/groups` - Get all user's groups
- ✅ GET `/groups/:id` - Get group details
- ✅ PUT `/groups/:id` - Update group
- ✅ UUID-based invite links

#### 4. Events Module (`/events`)
- ✅ POST `/events` - Create event (SINGLE or GROUP)
- ✅ GET `/events/:id` - Get event details
- ✅ PUT `/events/:id` - Update event
- ✅ DELETE `/events/:id` - Delete event
- ✅ POST `/events/recommendations/:id` - Generate recommendations
- ✅ GET `/events/recommendations/:id` - Get recommendations

#### 5. Slides Module (`/slides`)
- ✅ GET `/slides` - Get slide questions
- ✅ POST `/slides/:eventId` - Submit answers

#### 6. Recommendations Module (`/recommendations`)
- ✅ GET `/recommendations/feed` - Personalized feed
- ✅ POST `/recommendations/events/:eventId` - Generate for event
- ✅ Stub implementation with mocked data

### ✅ Database
- ✅ Complete DDL schema (`database/ddl.sql`)
- ✅ Sample DML data (`database/dml.sql`)
- ✅ TypeORM entities for all tables
- ✅ Relationships configured

## 🔧 Next Steps

### 1. Set Up PostgreSQL Database

```bash
# Create the database
createdb eventler

# Or using psql
psql -U postgres
CREATE DATABASE eventler;
\q

# Run the DDL script
psql -U postgres -d eventler -f database/ddl.sql

# (Optional) Load sample data
psql -U postgres -d eventler -f database/dml.sql
```

### 2. Configure Environment Variables

The `.env` file has been created with default values. Update it with your actual database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password_here
DB_NAME=eventler

JWT_SECRET=change-this-to-a-random-secret
JWT_REFRESH_SECRET=change-this-to-another-random-secret
```

### 3. Start the Server

```bash
# Development mode with hot reload
npm run start:dev

# Production build
npm run build
npm run start:prod
```

The server will start on `http://localhost:3000`

### 4. Test the API

You can test with curl, Postman, or any API client:

```bash
# Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "testuser",
    "password": "password123"
  }'

# Use the returned accessToken for protected endpoints
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📋 Project Structure Overview

```
eventler-server/
├── src/
│   ├── auth/              # Authentication & User entity
│   ├── users/             # User profile & preferences
│   ├── groups/            # Group management
│   ├── events/            # Event management
│   ├── slides/            # Slide answers
│   ├── recommendations/   # Recommendation engine
│   ├── config/            # Configuration files
│   ├── app.module.ts      # Root module
│   └── main.ts            # Application entry point
├── database/
│   ├── ddl.sql           # Database schema
│   └── dml.sql           # Sample data
├── .env                   # Environment variables
├── .env.example          # Environment template
└── README.md             # Full documentation
```

## 🎯 Features Implemented

### Authentication & Security
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Access & refresh token mechanism
- ✅ Protected routes with guards
- ✅ Login with email OR username

### Data Validation
- ✅ DTOs for all requests
- ✅ class-validator decorators
- ✅ Automatic validation pipe
- ✅ Whitelist & transform enabled

### Database
- ✅ TypeORM configured
- ✅ PostgreSQL connection
- ✅ Entities with relationships
- ✅ Migration-ready structure

### Best Practices
- ✅ Service-based architecture
- ✅ Controllers only handle HTTP
- ✅ Async/await everywhere
- ✅ Proper HTTP status codes
- ✅ Error handling
- ✅ CORS enabled

## 🔍 What's Stubbed (To Be Implemented)

1. **Recommendation Engine**: Currently returns mocked data
   - Location: `src/recommendations/recommendations.service.ts`
   - Lines with `// This is a stub implementation`

2. **Group Member Verification**: Some access control checks
   - Location: `src/events/events.service.ts`
   - Comment: `// TODO: Check if user is a member of the group`

3. **User Events Integration**: Returns empty array
   - Location: `src/users/users.service.ts`
   - Method: `getUserEvents()`

## 📚 Documentation

See the full [README.md](README.md) for:
- Complete API endpoint documentation
- Database schema details
- Authentication flow
- Development guidelines
- Testing instructions

## 🐛 Troubleshooting

### Build completed successfully ✅
The project has been built and verified to compile without errors.

### Common Issues

**Database Connection Error:**
- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure database exists

**Port Already in Use:**
- Change `PORT` in `.env` file
- Or stop the process using port 3000

**Module Not Found:**
- Run `npm install` to ensure all dependencies are installed

## 📞 Support

For questions or issues, refer to:
- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- Project README.md

---

**Status**: ✅ Ready for Development
**Build**: ✅ Passing
**Dependencies**: ✅ Installed

Happy coding! 🚀
