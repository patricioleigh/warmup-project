# Warmup Project - CI/CD Documentation

This document describes the automated testing and continuous integration setup for the Warmup Project.

## Overview

The project uses GitHub Actions for automated testing across multiple environments:

- **Backend Tests**: Unit tests, E2E tests, and linting for the NestJS server
- **Frontend Tests**: Linting and build verification for the Next.js client
- **Docker Integration Tests**: Full-stack integration testing with Docker Compose
- **Quality Gate**: Ensures all tests pass before merging

## Workflows

### 1. Backend Tests (`.github/workflows/backend-tests.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Only when `server/**` files change

**Services:**
- MongoDB 7
- Redis 7

**Steps:**
1. Checkout code
2. Setup Node.js 20.x with npm cache
3. Install dependencies
4. Run ESLint
5. Run unit tests
6. Run E2E tests
7. Generate code coverage
8. Upload coverage to Codecov
9. Archive test results

**Environment Variables:**
All secrets are loaded from GitHub Secrets (see setup below).

### 2. Frontend Tests (`.github/workflows/frontend-tests.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Only when `client/**` files change

**Steps:**
1. Checkout code
2. Setup Node.js 20.x with npm cache
3. Install dependencies
4. Run ESLint
5. Build Next.js application
6. Verify build output

### 3. Docker Integration Tests (`.github/workflows/docker-integration.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- When `server/**`, `client/**`, or Docker files change

**Steps:**
1. Checkout code
2. Setup Docker Buildx
3. Build all Docker images
4. Start services with docker-compose
5. Wait for health checks
6. Test MongoDB connection
7. Test Redis connection
8. Test backend health endpoint
9. Test frontend accessibility
10. Show logs on failure
11. Clean up containers

### 4. Main CI Pipeline (`.github/workflows/ci.yml`)

**Orchestration Workflow:**
- Runs backend and frontend tests in parallel
- Runs Docker integration tests after both pass
- Includes quality gate that fails if any test fails

## Setup Instructions

### 1. Configure GitHub Secrets

Go to: **Repository Settings** → **Secrets and variables** → **Actions**

Add the following secrets:

| Secret Name | Description | Required | How to Generate |
|------------|-------------|----------|-----------------|
| `JWT_SECRET` | JWT signing secret | ✅ Yes | `openssl rand -base64 32` |
| `CODECOV_TOKEN` | Codecov upload token | Optional | Sign up at [codecov.io](https://codecov.io) |

### 2. Enable GitHub Actions

1. Go to: **Repository Settings** → **Actions** → **General**
2. Under "Actions permissions", select: **Allow all actions and reusable workflows**
3. Save changes

### 3. Branch Protection Rules (Recommended)

Go to: **Repository Settings** → **Branches** → **Add branch protection rule**

For `main` branch:
- ✅ Require status checks to pass before merging
  - Select: `Backend Tests`, `Frontend Tests`, `Docker Integration`, `Quality Gate`
- ✅ Require branches to be up to date before merging
- ✅ Require pull request reviews before merging

## Environment Variables in CI

### Backend Tests
```yaml
NODE_ENV: test
MONGO_URI: mongodb://root:rootpass@localhost:27017/warmupdb?authSource=admin
REDIS_URL: redis://localhost:6379
REDIS_TTL_SECONDS: 3900
JWT_SECRET: ${{ secrets.JWT_SECRET }}
MAX_ITEMS: 100
MAX_RESPONSE_BYTES: 262144
```

### Frontend Tests
```yaml
NEXT_PUBLIC_API_BASE: http://localhost:3001/api/v1
NODE_ENV: production
```

### Docker Integration Tests
```yaml
JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

## Code Coverage

Code coverage reports are automatically uploaded to [Codecov](https://codecov.io) after each test run.

### Setup Codecov (Optional)

1. Sign up at [codecov.io](https://codecov.io)
2. Connect your GitHub repository
3. Copy the Codecov token
4. Add `CODECOV_TOKEN` to GitHub Secrets
5. Coverage reports will appear at: `https://codecov.io/gh/<username>/<repo>`

### View Coverage Locally

```bash
cd server
npm run test:cov
open coverage/lcov-report/index.html
```

## Workflow Status Badges

Add status badges to your README.md:

```markdown
![Backend Tests](https://github.com/<username>/<repo>/workflows/Backend%20Tests/badge.svg)
![Frontend Tests](https://github.com/<username>/<repo>/workflows/Frontend%20Tests/badge.svg)
![Docker Integration](https://github.com/<username>/<repo>/workflows/Docker%20Integration%20Tests/badge.svg)
![CI](https://github.com/<username>/<repo>/workflows/CI/badge.svg)
```

## Running Tests Locally

### Backend Tests
```bash
cd server
npm install
npm run lint
npm test
npm run test:e2e
npm run test:cov
```

### Frontend Tests
```bash
cd client
npm install
npm run lint
npm run build
```

### Docker Integration Tests
```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs
docker compose down -v
```

## Troubleshooting

### Tests Failing in CI but Pass Locally

**Common causes:**
1. **Missing environment variables**: Check GitHub Secrets are configured
2. **Service startup timing**: Services might need more time to be ready
3. **Port conflicts**: Ensure ports 27017, 6379, 3001, 3000 are available
4. **Node version mismatch**: CI uses Node 20.x

### MongoDB Connection Issues

```yaml
# Verify health check in workflow:
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
  interval: 10s
  timeout: 5s
  retries: 10
```

### Redis Connection Issues

```yaml
# Verify health check in workflow:
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 10
```

### Docker Build Failures

1. Check Dockerfile syntax
2. Verify all dependencies are in package.json
3. Check build logs: `docker compose logs server`

### Codecov Upload Failures

- Workflow continues even if Codecov upload fails (`fail_ci_if_error: false`)
- Check `CODECOV_TOKEN` is correctly set in GitHub Secrets
- Verify token hasn't expired

## Performance Optimization

### Caching
Workflows use npm caching to speed up dependency installation:

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: server/package-lock.json
```

### Parallel Execution
Backend and frontend tests run in parallel by default.

### Path Filtering
Workflows only trigger when relevant files change:

```yaml
paths:
  - 'server/**'
  - '.github/workflows/backend-tests.yml'
```

## Workflow Execution Time

Typical execution times:
- Backend Tests: ~3-5 minutes
- Frontend Tests: ~2-3 minutes
- Docker Integration: ~5-7 minutes
- **Total CI Pipeline**: ~8-10 minutes

## Best Practices

1. **Keep secrets secure**: Never log secrets, use GitHub Secrets
2. **Test before pushing**: Run tests locally first
3. **Keep workflows fast**: Use caching and parallel execution
4. **Monitor failures**: Set up notifications for failed builds
5. **Update dependencies**: Keep actions updated (`@v4`, not `@v3`)
6. **Document changes**: Update this file when modifying workflows

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [Codecov Documentation](https://docs.codecov.com/)
- [Docker Compose CI/CD](https://docs.docker.com/compose/ci-cd/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Next.js CI/CD](https://nextjs.org/docs/deployment)
