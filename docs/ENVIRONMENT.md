# Environment Variables Setup Guide

This document describes all environment variables used in the Warmup Project and how to configure them.

## Quick Start

1. **Root directory** (for Docker Compose):
   ```bash
   cp .env.example .env
   ```

2. **Server** (for local development):
   ```bash
   cd server
   cp .env.example .env
   ```

3. **Client** (for local development):
   ```bash
   cd client
   cp .env.example .env.local  # Next.js uses .env.local
   ```

4. Edit the copied files and replace placeholder values with your actual configuration.

## Environment Files Overview

| File | Purpose | Used By |
|------|---------|---------|
| `/.env` | Root configuration | Docker Compose |
| `/server/.env` | Backend configuration | NestJS server (local dev) |
| `/client/.env.local` | Frontend configuration | Next.js client (local dev) |

## Variable Reference

### Server Environment Variables

#### Required Variables

| Variable | Description | Example | Validation |
|----------|-------------|---------|------------|
| `MONGO_URI` | MongoDB connection string | `mongodb://root:rootpass@localhost:27017/warmupdb?authSource=admin` | Must be valid URI |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | Must be valid URI |
| `JWT_SECRET` | Secret key for JWT token signing | `your-super-secret-jwt-key` | Min 16 characters |

#### Optional Variables with Defaults

| Variable | Description | Default | Valid Values |
|----------|-------------|---------|--------------|
| `NODE_ENV` | Application environment | `development` | `development`, `test`, `production` |
| `PORT` | Server port | `3001` | Valid port number (1-65535) |
| `REDIS_TTL_SECONDS` | Cache TTL in seconds | `3900` | Min 60 |
| `RATE_LIMIT_TTL_SECONDS` | Rate limit window (seconds) | `8000` | Min 1 |
| `RATE_LIMIT_LIMIT` | Max requests per window | `10` | Min 1 |
| `MAX_ITEMS` | Maximum items to fetch | `100` | Min 1 |
| `MAX_RESPONSE_BYTES` | Max response size (bytes) | `262144` | Min 1024 |
| `HN_HTTP_TIMEOUT_MS` | HTTP timeout for HN API (ms) | `5000` | Min 100 |
| `INSTANCE_ID` | Unique instance identifier | Auto-generated | Any string |

### Client Environment Variables

| Variable | Description | Example | Exposed to Browser |
|----------|-------------|---------|-------------------|
| `NEXT_PUBLIC_API_BASE` | Public API URL | `http://localhost:3001/api/v1` | ✅ Yes |
| `INTERNAL_API_URL` | Server-side API URL | `http://server:3001/api/v1` | ❌ No |
| `NODE_ENV` | Application environment | `development` | ❌ No |
| `PORT` | Client port | `3000` | ❌ No |

> **Note:** Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser in Next.js.

## Security Best Practices

### 🔒 DO:
- ✅ Use strong, randomly generated secrets for `JWT_SECRET`
- ✅ Use different `JWT_SECRET` values for dev, test, and production
- ✅ Store production secrets in secure secret management systems (e.g., AWS Secrets Manager, HashiCorp Vault)
- ✅ Use GitHub Secrets for CI/CD environment variables
- ✅ Rotate secrets regularly
- ✅ Use `.env.example` files to document required variables (without actual secrets)

### ⛔ DON'T:
- ❌ Never commit `.env` files to version control
- ❌ Never use default/example secrets in production
- ❌ Never share secrets via Slack, email, or other unsecured channels
- ❌ Never hardcode secrets in source code
- ❌ Never expose sensitive variables with `NEXT_PUBLIC_` prefix

## Generating Secure Secrets

### JWT Secret
```bash
# Generate a secure random string (32 bytes, base64 encoded)
openssl rand -base64 32
```

### Random UUID (for INSTANCE_ID)
```bash
# macOS/Linux
uuidgen

# Node.js
node -e "console.log(require('crypto').randomUUID())"
```

## Environment-Specific Configurations

### Development
```bash
NODE_ENV=development
MONGO_URI=mongodb://root:rootpass@localhost:27017/warmupdb?authSource=admin
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-only-secret-change-me
```

### Test (CI/CD)
```bash
NODE_ENV=test
MONGO_URI=mongodb://root:rootpass@localhost:27017/warmupdb-test?authSource=admin
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret-key-for-ci
```

### Production (Docker Compose)
```bash
NODE_ENV=production
MONGO_URI=mongodb://root:${MONGO_PASSWORD}@mongo:27017/warmupdb?authSource=admin
REDIS_URL=redis://redis:6379
JWT_SECRET=${JWT_SECRET}  # Load from secure storage
```

## Docker Compose Usage

The `docker-compose.yml` file reads from the root `.env` file:

```yaml
environment:
  JWT_SECRET: ${JWT_SECRET:-dev-only-change-me}
  MAX_ITEMS: ${MAX_ITEMS:-100}
```

- `${VAR}` - Read from `.env` file
- `${VAR:-default}` - Read from `.env` or use default value

## GitHub Actions CI/CD

Secrets should be stored in GitHub repository settings:

1. Go to: **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:
   - `JWT_SECRET`
   - `CODECOV_TOKEN` (optional, for code coverage)

These are referenced in workflows as:
```yaml
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

## Troubleshooting

### "JWT_SECRET must be at least 16 characters"
Generate a new secret using `openssl rand -base64 32` and update your `.env` file.

### "MONGO_URI is required"
Ensure `MONGO_URI` is set in your `.env` file. Check the format matches the example.

### "Redis connection failed"
1. Check Redis is running: `docker ps | grep redis`
2. Verify `REDIS_URL` matches your Redis host/port
3. Test connection: `redis-cli -u redis://localhost:6379 ping`

### Environment variables not loading
1. Restart your application after changing `.env` files
2. Check file is named correctly (`.env`, not `env` or `.env.txt`)
3. For Next.js client, use `.env.local` not `.env`
4. Ensure no syntax errors in `.env` file (no spaces around `=`)

## Verification

### Check server configuration:
```bash
cd server
npm run start:dev
# Should start without validation errors
```

### Check client configuration:
```bash
cd client
npm run dev
# Should build and start successfully
```

### Verify Docker Compose:
```bash
docker compose config
# Should show resolved environment variables
```

## Additional Resources

- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [12-Factor App: Config](https://12factor.net/config)
