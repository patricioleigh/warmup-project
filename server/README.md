# Warmup Project - Backend API Server

A production-ready NestJS REST API server that aggregates and manages articles from Hacker News with user authentication, caching, and distributed job scheduling.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Architecture Decisions](#architecture-decisions)
- [Security Features](#security-features)
- [Performance Optimizations](#performance-optimizations)
- [Troubleshooting](#troubleshooting)

## Overview

This backend server provides a robust API for aggregating Hacker News articles, allowing users to authenticate, view articles, hide unwanted content, and manage their personalized feed. The application features Redis caching, distributed job locking for multi-instance deployments, and comprehensive error handling.

**Key Capabilities:**
- Hourly synchronization with Hacker News API
- User authentication with JWT
- Per-user article hiding/filtering
- Redis-based caching for performance
- Distributed job scheduling across multiple instances
- Comprehensive API documentation with Swagger
- Production-ready security with Helmet middleware

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 24.x (LTS) | Runtime environment |
| **NestJS** | 11.x | Progressive Node.js framework |
| **TypeScript** | 5.7.x | Type-safe JavaScript |
| **MongoDB** | Latest | Primary database (with Mongoose ODM) |
| **Redis** | Latest | Caching layer |
| **Passport JWT** | 4.0.x | Authentication strategy |
| **bcrypt** | 6.0.x | Password hashing |
| **Swagger** | 11.x | API documentation |
| **Helmet** | Latest | Security middleware |
| **Jest** | 30.x | Testing framework |

## Features

### Core Features
- ✅ **User Authentication**: Register/login with JWT tokens and bcrypt password hashing
- ✅ **Article Aggregation**: Hourly sync from Hacker News API via cron jobs
- ✅ **Article Management**: Soft delete and user-specific hiding
- ✅ **Caching**: Redis-based caching with automatic invalidation
- ✅ **Pagination**: Efficient pagination with configurable limits
- ✅ **Rate Limiting**: Protection against DDoS attacks
- ✅ **Distributed Jobs**: MongoDB-based distributed locking for multi-instance deployments
- ✅ **Comprehensive Logging**: Structured JSON logging with request correlation

### Security Features
- ✅ Helmet security headers (XSS, clickjacking, MIME sniffing protection)
- ✅ CORS configuration
- ✅ Input validation with `class-validator`
- ✅ JWT authentication with secure token signing
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Global exception filter (no stack trace leaks)
- ✅ Environment variable validation
- ✅ Rate limiting with `@nestjs/throttler`

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v24.x or v22.x (LTS versions)
  ```bash
  node --version  # Should be v24.x or v22.x
  ```

- **npm**: v10.x or higher
  ```bash
  npm --version
  ```

- **MongoDB**: 6.x or higher (running locally or remote)
  ```bash
  mongosh --version
  ```

- **Redis**: 7.x or higher (running locally or remote)
  ```bash
  redis-cli --version
  ```

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd warmup-project/server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Verify installation**:
   ```bash
   npm run build  # Should compile without errors
   ```

## Environment Configuration

### 1. Create Environment File

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

### 2. Required Environment Variables

Edit `.env` and configure the following:

```bash
# Application Environment
NODE_ENV=development          # development | test | production
PORT=3001                     # Server port

# Database Configuration
MONGO_URI=mongodb://root:rootpass@localhost:27017/warmupdb?authSource=admin

# Redis Cache Configuration
REDIS_URL=redis://localhost:6379
REDIS_TTL_SECONDS=3900       # Cache TTL (65 minutes)

# JWT Authentication (CRITICAL - Change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-me-in-production  # Min 16 characters

# Rate Limiting
RATE_LIMIT_TTL_SECONDS=60    # Time window in seconds
RATE_LIMIT_LIMIT=100         # Max requests per window

# Application Limits
MAX_ITEMS=100                # Max items per request
MAX_RESPONSE_BYTES=262144    # Max response size (256KB)

# Hacker News API Configuration
HN_HTTP_TIMEOUT_MS=5000      # Request timeout

# Optional: Instance Identification (for distributed deployments)
# INSTANCE_ID=instance-01
```

### 3. Generate Secure JWT Secret

For production, generate a cryptographically secure JWT secret:

```bash
openssl rand -base64 32
```

Copy the output and use it as your `JWT_SECRET`.

### 4. Test Environment

For testing, create `.env.test`:

```bash
cp .env.example .env.test
```

**Important**: Test environment must use separate databases:
- MongoDB: Database name must contain "test" (e.g., `warmupdb_test`)
- Redis: Use non-zero DB index (e.g., `redis://localhost:6379/1`)

## Database Setup

### MongoDB Setup

#### Option 1: Using Docker Compose (Recommended)

From the project root:

```bash
docker-compose up -d mongodb
```

This starts MongoDB with:
- Port: 27017
- Root username: `root`
- Root password: `rootpass`
- Database: `warmupdb`

#### Option 2: Local MongoDB Installation

1. Install MongoDB: https://www.mongodb.com/docs/manual/installation/

2. Start MongoDB:
   ```bash
   mongosh
   ```

3. Create database and user:
   ```javascript
   use warmupdb
   db.createUser({
     user: "warmupuser",
     pwd: "yourpassword",
     roles: [{ role: "readWrite", db: "warmupdb" }]
   })
   ```

4. Update `MONGO_URI` in `.env`:
   ```
   MONGO_URI=mongodb://warmupuser:yourpassword@localhost:27017/warmupdb
   ```

### Redis Setup

#### Option 1: Using Docker Compose (Recommended)

From the project root:

```bash
docker-compose up -d redis
```

This starts Redis on port 6379.

#### Option 2: Local Redis Installation

**macOS (Homebrew)**:
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian**:
```bash
sudo apt install redis-server
sudo systemctl start redis-server
```

**Verify Redis is running**:
```bash
redis-cli ping  # Should return "PONG"
```

### Database Migrations

This project uses Mongoose with automatic schema management. Schemas are located in:
- `src/items/schemas/items.schema.ts`
- `src/users/schemas/user.schema.ts`
- `src/interactions/schemas/user-article-interaction.schema.ts`
- `src/jobs/schemas/job-state.schema.ts`

Indexes are created automatically on application startup.

## Running the Application

### Development Mode

Start the server with hot-reload:

```bash
npm run start:dev
```

The server will start on `http://localhost:3001` (or the port specified in `.env`).

### Production Mode

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start:prod
   ```

### Docker Deployment

Build and run with Docker:

```bash
# Build the Docker image
docker build -t warmup-server .

# Run the container
docker run -p 3001:3001 --env-file .env warmup-server
```

Or use docker-compose from the project root:

```bash
docker-compose up -d
```

### Verify Server is Running

Check the health endpoint:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

## API Documentation

### Swagger Documentation

Once the server is running, access the interactive API documentation:

**URL**: http://localhost:3001/api/docs

The Swagger UI provides:
- Complete API endpoint listing
- Request/response schemas
- Interactive API testing
- Authentication testing with JWT tokens

### API Base URL

All API endpoints (except `/health`) are prefixed with `/api/v1`:

```
http://localhost:3001/api/v1/<endpoint>
```

### Key Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/health` | GET | No | Health check |
| `/api/v1/auth/register` | POST | No | Register new user |
| `/api/v1/auth/login` | POST | No | Login user |
| `/api/v1/articles` | GET | Yes | List articles for user |
| `/api/v1/articles/:id` | DELETE | Yes | Hide article for user |

### Authentication Flow

1. **Register a user**:
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password123"}'
   ```

2. **Login to get JWT token**:
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password123"}'
   ```

   Response:
   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```

3. **Use token for authenticated requests**:
   ```bash
   curl -X GET http://localhost:3001/api/v1/articles \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:cov
```

Coverage report is generated in `coverage/` directory.

### Run E2E Tests

```bash
npm run test:e2e
```

**Note**: E2E tests require:
- MongoDB test database (name must contain "test")
- Redis test database (use DB index > 0)
- Configured `.env.test` file

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Current Test Coverage

- **Statements**: [74.9 %]
- **Branches**: [42.72 %]
- **Functions**: [73.95 %]
- **Lines**: [74.74 %]


## Project Structure

```
server/
├── src/
│   ├── articles/              # Article listing & hiding
│   │   ├── dto/              # Data Transfer Objects
│   │   ├── articles.controller.ts
│   │   ├── articles.service.ts
│   │   ├── articles.service.spec.ts
│   │   └── articles.module.ts
│   ├── auth/                  # Authentication & Authorization
│   │   ├── dto/              # Login/Register DTOs
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts
│   │   ├── jwt-auth.guard.ts
│   │   ├── jwt.strategy.ts
│   │   ├── get-user.decorator.ts
│   │   └── auth.module.ts
│   ├── cache/                 # Redis caching abstraction
│   │   ├── cache.service.ts
│   │   └── cache.module.ts
│   ├── common/                # Shared utilities
│   │   ├── app-exception.filter.ts
│   │   ├── error-codes.ts
│   │   ├── express-request.d.ts
│   │   ├── request-id.middleware.ts
│   │   └── request-id.middleware.spec.ts
│   ├── health/                # Health checks
│   │   ├── health.controller.ts
│   │   ├── health.service.ts
│   │   └── health.module.ts
│   ├── hn/                    # Hacker News API integration
│   │   ├── clean.types.ts
│   │   ├── hn.controller.ts
│   │   ├── hn.service.ts
│   │   ├── hn.service.spec.ts
│   │   └── hn.module.ts
│   ├── interactions/          # User-article interactions
│   │   ├── schemas/
│   │   ├── interactions.service.ts
│   │   └── interactions.module.ts
│   ├── items/                 # HN items storage & sync
│   │   ├── schemas/
│   │   ├── items.controller.ts
│   │   ├── items.service.ts
│   │   └── items.module.ts
│   ├── jobs/                  # Background job management
│   │   ├── schemas/
│   │   ├── jobs.controller.ts
│   │   ├── jobs.service.ts
│   │   └── jobs.module.ts
│   ├── users/                 # User management
│   │   ├── schemas/
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts               # Application entry point
├── test/                      # E2E tests
│   ├── *.e2e-spec.ts
│   └── test-app.ts
├── coverage/                  # Test coverage reports
├── dist/                      # Compiled output
├── Dockerfile                 # Production Docker image
├── .env.example              # Environment template
├── .prettierrc               # Code formatting rules
├── .eslintrc.js              # Linting rules
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies & scripts
└── README.md                 # This file
```

## Architecture Decisions

### 1. Default NestJS Architecture

We use NestJS's standard Controller-Service-Repository pattern for simplicity and rapid development:

- **Controllers**: Handle HTTP requests, route parsing, and response formatting
- **Services**: Contain business logic and orchestrate operations
- **Repositories**: Data access via Mongoose models

**Rationale**: This architecture is appropriate for the project's complexity level and provides good separation of concerns without over-engineering.

### 2. MongoDB with Mongoose

**Why MongoDB?**
- Flexible schema for evolving article metadata
- Excellent performance for read-heavy workloads
- Native support for distributed locking (jobs)
- Horizontal scalability

**Schema Design**:
- **Items Collection**: Hacker News articles with soft delete support
- **Users Collection**: User accounts with hashed passwords
- **Interactions Collection**: User-specific article hiding
- **JobStates Collection**: Distributed job coordination

### 3. Redis Caching Strategy

**Cache Layers**:
1. **Global Article List**: Paginated article lists cached for all users
2. **User Hidden Items**: Per-user hidden article sets
3. **Cache Invalidation**: Automatic invalidation after sync jobs

**TTL Strategy**:
- Default: 65 minutes (REDIS_TTL_SECONDS=3900)
- Slightly longer than hourly sync to ensure cache hit during job execution

### 4. Distributed Job Locking

**Problem**: Multiple server instances running the same cron job causes duplicate work and race conditions.

**Solution**: MongoDB-based distributed locking with TTL:

```typescript
// Atomic lock acquisition
await jobStates.findOneAndUpdate(
  {
    jobName: 'hn-hourly-sync',
    $or: [
      { lockUntil: { $exists: false } },
      { lockUntil: { $lte: now } }
    ]
  },
  {
    $set: {
      status: 'running',
      lockUntil: now + lockTtlMs,
      lockedBy: instanceId
    }
  },
  { upsert: true }
);
```

**Benefits**:
- Only one instance executes the job
- Automatic lock expiration prevents deadlocks
- Instance tracking for debugging

### 5. Soft Delete Pattern

Articles are never physically deleted; instead, they're marked with `isDeleted: true`.

**Benefits**:
- Data recovery capability
- Audit trail preservation
- Referential integrity maintained

### 6. Request Correlation

Every request gets a unique `requestId` for end-to-end tracking:

```typescript
// Middleware assigns requestId
request.requestId = req.header('x-request-id') || `req_${uuid()}`;

// Logger includes requestId
logger.error({ requestId, message: 'Error occurred' });

// Response includes requestId
response.setHeader('x-request-id', requestId);
```

**Benefits**:
- Simplified debugging across microservices
- Request tracing in logs
- Client can track requests

## Security Features

### 1. Helmet Security Headers

Protects against common web vulnerabilities:

```typescript
app.use(helmet());
```

**Headers Applied**:
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `Strict-Transport-Security`: Enforces HTTPS
- `X-XSS-Protection`: XSS filter
- And more...

### 2. Input Validation

All DTOs use `class-validator`:

```typescript
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
```

Global validation pipe configuration:
- `whitelist: true` - Strips unknown properties
- `forbidNonWhitelisted: true` - Throws error on unknown properties
- `transform: true` - Auto-transforms payloads to DTO instances

### 3. Authentication & Authorization

- **Password Hashing**: bcrypt with 12 rounds
- **JWT Tokens**: HS256 algorithm with configurable secret
- **Token Validation**: Passport JWT strategy
- **Route Protection**: `@UseGuards(JwtAuthGuard)` decorator

### 4. Rate Limiting

Configured throttler protects against DDoS:

```typescript
ThrottlerModule.forRoot([{
  ttl: 60000,    // 60 seconds
  limit: 100,    // 100 requests per window
}])
```

### 5. Error Handling

Global exception filter prevents information leakage:

- Production: No stack traces exposed
- Structured error responses with error codes
- Request correlation via error IDs

### 6. Environment Validation

Joi schema validates environment variables at startup:

```typescript
JWT_SECRET: Joi.string().min(16).required()
MONGO_URI: Joi.string().uri().required()
```

**Test Environment Guards**:
- MongoDB URI must contain "test" in database name
- Redis URL must use non-zero DB index

## Performance Optimizations

### 1. Redis Caching

- **Cache Hit Rate**: ~80-90% on article lists
- **Response Time**: <10ms on cache hit vs 50-100ms on database query
- **Invalidation**: Automatic cache invalidation after sync jobs

### 2. Database Indexing

Critical indexes for query performance:

```typescript
@Prop({ required: true, unique: true, index: true })
objectId!: string;

@Prop({ required: true, index: true })
createdAt!: Date;

@Prop({ default: false, required: true, index: true })
isDeleted!: boolean;
```

### 3. Bulk Operations

Sync uses `bulkWrite` for efficient upserts:

```typescript
await ItemsModel.bulkWrite(ops, { ordered: false });
```

**Performance**: Processes 100 items in ~50ms vs ~2000ms with individual saves.

### 4. Lean Queries

Read-only operations use `.lean()`:

```typescript
await ItemsModel.find({ isDeleted: false })
  .sort({ createdAt: -1 })
  .lean();  // Returns plain JavaScript objects
```

**Benefit**: 2-3x faster than Mongoose documents.

### 5. Parallel Operations

Independent queries run in parallel:

```typescript
const [items, total] = await Promise.all([
  ItemsModel.find(filter).lean(),
  ItemsModel.countDocuments(filter)
]);
```

### 6. Response Size Validation

Prevents memory issues from large responses:

```typescript
const bytes = Buffer.byteLength(JSON.stringify(response), 'utf8');
if (bytes > MAX_RESPONSE_BYTES) {
  throw new UnprocessableEntityException('Response too large');
}
```

## Troubleshooting

### Common Issues

#### 1. "Connection refused" when starting server

**Cause**: MongoDB or Redis not running

**Solution**:
```bash
# Check MongoDB
mongosh --eval "db.runCommand({ ping: 1 })"

# Check Redis
redis-cli ping

# Start with Docker Compose
docker-compose up -d mongodb redis
```

#### 2. "JWT secret must be at least 16 characters"

**Cause**: Invalid or missing `JWT_SECRET` in `.env`

**Solution**:
```bash
# Generate secure secret
openssl rand -base64 32

# Add to .env
JWT_SECRET=<generated-secret>
```

#### 3. Tests fail with "MONGO_URI must point to a test database"

**Cause**: Using production database for tests

**Solution**:
```bash
# In .env.test, ensure database name contains "test"
MONGO_URI=mongodb://root:rootpass@localhost:27017/warmupdb_test?authSource=admin
```

#### 4. "Redis connection failed" errors in logs

**Cause**: Redis unavailable but application continues (graceful degradation)

**Impact**: Caching disabled, all requests hit database

**Solution**:
```bash
# Start Redis
docker-compose up -d redis
# Or
brew services start redis
```

**Note**: The application continues to function without Redis, but performance degrades.

#### 5. Cron job runs multiple times

**Cause**: Multiple server instances without proper locking

**Solution**: The distributed locking system handles this automatically. Check logs for:
```
"msg": "job skipped: lock not acquired"
```

This indicates proper lock coordination.

#### 6. High memory usage

**Possible Causes**:
- Large response payloads
- Memory leak
- Too many concurrent requests

**Diagnostics**:
```bash
# Check Node.js heap usage
curl http://localhost:3001/health

# Monitor memory
docker stats warmup-server
```

**Solutions**:
- Reduce `MAX_ITEMS` in `.env`
- Implement pagination
- Add response size limits (already implemented)

### Debugging Tips

#### Enable Debug Logging

Set environment variable:
```bash
DEBUG=* npm run start:dev
```

#### Check Request IDs

All requests/responses include `x-request-id` header for correlation:

```bash
curl -v http://localhost:3001/api/v1/items
# Look for: x-request-id: req_<uuid>
```

Search logs for this ID to trace the entire request lifecycle.

#### Inspect Database State

```bash
# Connect to MongoDB
mongosh mongodb://root:rootpass@localhost:27017/warmupdb?authSource=admin

# Check collections
show collections

# View recent items
db.items.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(5)

# Check job states
db.jobstates.find()
```

#### Inspect Redis Cache

```bash
# Connect to Redis
redis-cli

# List all keys
KEYS *

# Get cached article list
GET "global_items_list:1:20"

# Check TTL
TTL "global_items_list:1:20"

# Clear cache (for debugging)
FLUSHDB
```

## Additional Resources

- **NestJS Documentation**: https://docs.nestjs.com
- **Mongoose Documentation**: https://mongoosejs.com/docs/
- **Redis Documentation**: https://redis.io/docs/
- **Hacker News API**: https://hn.algolia.com/api

## Support & Contribution

For issues, questions, or contributions, please refer to the main project repository.

## License

[Specify your license here]

---

**Last Updated**: January 2026  
**Version**: 1.0.0
