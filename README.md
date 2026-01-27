# Warmup Project

A full-stack application for browsing and interacting with Hacker News articles, built with NestJS, Next.js, MongoDB, and Redis.

## Features

- 🔐 User authentication with JWT
- 📰 Browse Hacker News articles
- ⚡ Redis caching for improved performance
- 🔒 Rate limiting and security
- 🐳 Docker containerization
- 🧪 Comprehensive test coverage
- 🤖 Automated CI/CD with GitHub Actions

## Project Structure

```
warmup-project/
├── server/          # NestJS backend API
├── client/          # Next.js frontend
├── docs/            # Documentation
│   ├── ENVIRONMENT.md    # Environment variables guide
│   ├── CI-CD.md          # CI/CD setup guide
│   └── adr/              # Architecture Decision Records
├── specs/           # Feature specifications
├── .github/
│   └── workflows/   # GitHub Actions CI/CD
├── docker-compose.yml
└── .env.example     # Example environment variables
```

## Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Node.js 20.x](https://nodejs.org/) (for local development)
- [npm](https://www.npmjs.com/)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd warmup-project
```

### 2. Set Up Environment Variables

```bash
# Root directory (for Docker Compose)
cp .env.example .env

# Server (for local development)
cd server
cp .env.example .env
cd ..

# Client (for local development)
cd client
cp .env.example .env.local
cd ..
```

**Important:** Edit the `.env` files and replace placeholder values, especially `JWT_SECRET`.

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for detailed configuration.

### 3. Start with Docker Compose

```bash
docker compose up -d
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### 4. Stop Services

```bash
docker compose down
```

## Local Development

### Backend Development

```bash
cd server
npm install
npm run start:dev
```

Server will start at http://localhost:3001

### Frontend Development

```bash
cd client
npm install
npm run dev
```

Client will start at http://localhost:3000

### Database & Cache Services

Start MongoDB and Redis:
```bash
docker compose up mongo redis -d
```

## Testing

### Backend Tests

```bash
cd server

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test with coverage
npm run test:cov

# Linting
npm run lint
```

### Frontend Tests

```bash
cd client

# Build verification
npm run build

# Linting
npm run lint
```

### Integration Tests

```bash
# Run all services and tests
docker compose -f docker-compose.test.yml up --abort-on-container-exit
```

## API Documentation

Swagger UI is available at **`/api/docs`** (e.g. `http://localhost:3001/api/docs`).

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login user |

### Article Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/articles` | List articles | ✅ Yes |
| POST | `/api/v1/articles/:id/hide` | Hide article | ✅ Yes |
| DELETE | `/api/v1/articles/:id/hide` | Unhide article | ✅ Yes |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health status |

## Environment Variables

All environment variables are documented in [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

**Key variables:**

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | ✅ Yes |
| `REDIS_URL` | Redis connection URL | ✅ Yes |
| `JWT_SECRET` | JWT signing secret (min 16 chars) | ✅ Yes |
| `PORT` | Server port | No (default: 3001) |
| `NODE_ENV` | Environment (dev/test/prod) | No (default: development) |

## CI/CD

The project uses GitHub Actions for automated testing and continuous integration.

### Workflows

- ✅ **Backend Tests**: Linting, unit tests, E2E tests, coverage
- ✅ **Frontend Tests**: Linting, build verification
- ✅ **Docker Integration**: Full-stack integration testing
- ✅ **Quality Gate**: Ensures all tests pass

See [docs/CI-CD.md](docs/CI-CD.md) for detailed CI/CD setup and configuration.

### Status Badges

![CI Status](https://github.com/username/warmup-project/workflows/CI/badge.svg)

## Architecture

### Tech Stack

**Backend:**
- NestJS - Node.js framework
- MongoDB - Database
- Redis - Caching layer
- JWT - Authentication
- Passport - Auth middleware

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TailwindCSS 4
- TypeScript

**Infrastructure:**
- Docker & Docker Compose
- GitHub Actions for CI/CD

### Caching Strategy

The application implements a multi-layer caching strategy using Redis:

- **Article lists** are cached for improved performance
- **Cache TTL**: 65 minutes (configurable via `REDIS_TTL_SECONDS`)
- **Cache invalidation**: Automatic on data updates
- **Fallback**: Graceful degradation if Redis is unavailable

See [docs/adr/002-caching-strategy.md](docs/adr/002-caching-strategy.md) for details.

## Project Specifications

Detailed feature specifications are available in the `specs/` directory:

- [001-hn-articles-auth](specs/001-hn-articles-auth/) - Authentication & article browsing
- [002-redis-caching](specs/002-redis-caching/) - Redis caching implementation

## Scripts

### Root Level

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Rebuild images
docker compose build
```

### Server Scripts

```bash
npm run start          # Start production server
npm run start:dev      # Start development server
npm run build          # Build for production
npm run lint           # Run ESLint
npm run test           # Run unit tests
npm run test:e2e       # Run E2E tests
npm run test:cov       # Generate coverage report
```

### Client Scripts

```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run start          # Start production server
npm run lint           # Run ESLint
```

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Ensure all tests pass locally
4. Create a pull request to `develop`
5. Wait for CI checks to pass
6. Request code review

## License

[Specify your license]

## Support

For issues, questions, or contributions, please open an issue or pull request.

---

**Documentation:**
- [Environment Variables Guide](docs/ENVIRONMENT.md)
- [CI/CD Setup Guide](docs/CI-CD.md)
- [Architecture Decision Records](docs/adr/)

**Useful Commands:**
```bash
# Generate secure JWT secret
openssl rand -base64 32

# Check service health
curl http://localhost:3001/health

# View MongoDB data
docker exec -it warmup-mongo mongosh -u root -p rootpass

# View Redis cache
docker exec -it warmup-redis redis-cli
```
