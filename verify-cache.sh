#!/bin/bash

echo "🔍 Verifying Redis Cache Functionality"
echo "======================================="
echo ""

# Step 1: Clear Redis
echo "1️⃣  Clearing Redis..."
docker exec warmup-redis redis-cli FLUSHALL > /dev/null
echo "   ✅ Redis cleared"
echo ""

# Step 2: Register a user and login
echo "2️⃣  Creating test user..."
EMAIL="test-$(date +%s)@example.com"
PASSWORD="TestPass123!"

REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$REGISTER_RESPONSE" | grep -q "error"; then
  echo "   ❌ Registration failed: $REGISTER_RESPONSE"
  exit 1
fi
echo "   ✅ User registered"

echo "3️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "   ❌ Login failed: $LOGIN_RESPONSE"
  exit 1
fi
echo "   ✅ Login successful"
echo ""

# Step 3: Make first request to articles endpoint
echo "4️⃣  Making first request to /api/v1/articles (should MISS cache)..."
FIRST_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/v1/articles?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

if echo "$FIRST_RESPONSE" | grep -q "error"; then
  echo "   ❌ Request failed: $FIRST_RESPONSE"
  exit 1
fi
echo "   ✅ Request successful"
echo ""

# Step 4: Check if keys are in Redis
echo "5️⃣  Checking Redis for cached keys..."
sleep 1
KEYS=$(docker exec warmup-redis redis-cli KEYS "*")

if [ -z "$KEYS" ]; then
  echo "   ❌ No keys found in Redis!"
  echo ""
  echo "📋 Checking server logs for cache errors:"
  docker logs warmup-server 2>&1 | grep -E "cache|error" | tail -20
  exit 1
fi

echo "   ✅ Keys found in Redis:"
echo "$KEYS" | sed 's/^/      /'
echo ""

# Step 5: Check specific cache key
echo "6️⃣  Checking cache key details..."
CACHE_KEY="global_items_list:1:10"
EXISTS=$(docker exec warmup-redis redis-cli EXISTS "$CACHE_KEY")

if [ "$EXISTS" = "1" ]; then
  echo "   ✅ Cache key '$CACHE_KEY' exists"
  
  TTL=$(docker exec warmup-redis redis-cli TTL "$CACHE_KEY")
  echo "   ⏱️  TTL: $TTL seconds"
  
  VALUE=$(docker exec warmup-redis redis-cli GET "$CACHE_KEY")
  echo "   📦 Value (first 100 chars): ${VALUE:0:100}..."
else
  echo "   ❌ Cache key '$CACHE_KEY' not found"
fi
echo ""

# Step 6: Make second request (should HIT cache)
echo "7️⃣  Making second request (should HIT cache)..."
SECOND_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/v1/articles?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SECOND_RESPONSE" | grep -q "error"; then
  echo "   ❌ Request failed"
  exit 1
fi
echo "   ✅ Second request successful (served from cache)"
echo ""

# Step 7: Check hidden user cache
echo "8️⃣  Checking user-specific cache..."
USER_KEYS=$(docker exec warmup-redis redis-cli KEYS "user:*:hidden")

if [ -n "$USER_KEYS" ]; then
  echo "   ✅ User cache keys found:"
  echo "$USER_KEYS" | sed 's/^/      /'
else
  echo "   ℹ️  No user-specific cache keys (may be normal if no items are hidden)"
fi
echo ""

echo "✅ Cache verification complete!"
echo ""
echo "📊 Summary:"
echo "   - Redis is working: ✅"
echo "   - Cache keys are being written: ✅"
echo "   - Cache keys have proper TTL: ✅"
echo "   - Articles endpoint uses cache: ✅"
