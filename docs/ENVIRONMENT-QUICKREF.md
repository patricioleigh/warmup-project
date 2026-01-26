# Environment Variables Quick Reference

## 📋 Setup Checklist

- [ ] Copy `.env.example` to `.env` in root directory
- [ ] Copy `server/.env.example` to `server/.env`
- [ ] Copy `client/.env.example` to `client/.env.local`
- [ ] Generate secure JWT_SECRET: `openssl rand -base64 32`
- [ ] Replace all placeholder values with actual configuration
- [ ] Verify MongoDB is running (Docker or local)
- [ ] Verify Redis is running (Docker or local)
- [ ] Never commit `.env` files to git

## 🔑 Critical Variables (Must Set)

| Variable | Where | Command to Generate |
|----------|-------|---------------------|
| `JWT_SECRET` | Root, Server | `openssl rand -base64 32` |
| `MONGO_URI` | Server | Use Docker: `mongodb://root:rootpass@localhost:27017/warmupdb?authSource=admin` |
| `REDIS_URL` | Server | Use Docker: `redis://localhost:6379` |

## 🐳 Docker Quick Start

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env and set JWT_SECRET
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# 3. Start services
docker compose up -d

# 4. Check health
curl http://localhost:3001/health
```

## 💻 Local Development Quick Start

```bash
# 1. Start MongoDB & Redis
docker compose up mongo redis -d

# 2. Setup server
cd server
cp .env.example .env
# Edit .env and set variables
npm install
npm run start:dev

# 3. Setup client (in new terminal)
cd client
cp .env.example .env.local
# Edit .env.local if needed
npm install
npm run dev
```

## 🧪 Testing Environment

```bash
# Server E2E tests need these
export NODE_ENV=test
export MONGO_URI=mongodb://root:rootpass@localhost:27017/warmupdb?authSource=admin
export REDIS_URL=redis://localhost:6379
export JWT_SECRET=test-secret-key
export MAX_ITEMS=100
export MAX_RESPONSE_BYTES=262144

cd server
npm run test:e2e
```

## 🚀 Production Checklist

- [ ] Use strong, unique `JWT_SECRET` (32+ characters)
- [ ] Use secure MongoDB credentials
- [ ] Enable Redis authentication if exposed
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Set appropriate rate limits
- [ ] Enable HTTPS/TLS
- [ ] Store secrets in secret management system (not in .env)
- [ ] Rotate secrets regularly
- [ ] Monitor for exposed secrets in git history

## 🔒 Security Rules

### ✅ DO
- Use different secrets for dev/test/prod
- Use secret management tools in production
- Rotate secrets regularly
- Prefix browser-exposed vars with `NEXT_PUBLIC_`
- Document variables in `.env.example`

### ❌ DON'T
- Commit `.env` files to git
- Use default/example secrets in production
- Share secrets via Slack/email
- Hardcode secrets in source code
- Log secrets in application logs
- Use short or guessable secrets

## 🔍 Troubleshooting

### "JWT_SECRET must be at least 16 characters"
```bash
# Generate new secret
openssl rand -base64 32
# Add to .env file
```

### "Cannot connect to MongoDB"
```bash
# Check MongoDB is running
docker ps | grep mongo
# Test connection
docker exec -it warmup-mongo mongosh -u root -p rootpass --eval "db.adminCommand('ping')"
```

### "Cannot connect to Redis"
```bash
# Check Redis is running
docker ps | grep redis
# Test connection
docker exec -it warmup-redis redis-cli ping
```

### Environment variables not loading
```bash
# Restart application after changing .env
# Check file name (.env not env.txt)
# For Next.js client, use .env.local
# Check for syntax errors (no spaces around =)
```

## 📚 Full Documentation

For complete details, see:
- [docs/ENVIRONMENT.md](../ENVIRONMENT.md) - Complete environment guide
- [docs/CI-CD.md](../CI-CD.md) - CI/CD configuration
- [README.md](../README.md) - Project overview

## 🎯 Common Configurations

### Local Development
```bash
NODE_ENV=development
PORT=3001
MONGO_URI=mongodb://root:rootpass@localhost:27017/warmupdb?authSource=admin
REDIS_URL=redis://localhost:6379
REDIS_TTL_SECONDS=3900
JWT_SECRET=local-dev-secret-change-me-minimum-16-chars
MAX_ITEMS=100
MAX_RESPONSE_BYTES=262144
RATE_LIMIT_TTL_SECONDS=60
RATE_LIMIT_LIMIT=100
HN_HTTP_TIMEOUT_MS=5000
```

### Docker Compose
```bash
JWT_SECRET=your-secure-secret-here-minimum-32-chars-recommended
MAX_ITEMS=100
MAX_RESPONSE_BYTES=262144
```

### GitHub Actions CI
Store in GitHub Secrets:
- `JWT_SECRET`
- `CODECOV_TOKEN` (optional)

### Next.js Client
```bash
# .env.local
NEXT_PUBLIC_API_BASE=http://localhost:3001/api/v1
INTERNAL_API_URL=http://localhost:3001/api/v1
NODE_ENV=development
PORT=3000
```
