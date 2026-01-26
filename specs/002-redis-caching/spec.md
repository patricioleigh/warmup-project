# Feature Specification: Caching Layer for Items and Preferences

**Feature Branch**: `002-redis-caching`  
**Created**: 2026-01-16  
**Status**: Draft  
**Input**: User description: "Subject: Performance Iteration: Redis Caching Layer for Items and User Preferences.

Scope: Implement a caching strategy using Redis to optimize item fetching and handle transient user actions (soft-deletes).

1. Item Caching (Read-Heavy):

Strategy: Implement a Cache-Aside pattern for the global list of items.

Invalidation: The hourly sync service must explicitly invalidate or update the Redis key global_items_list after completing the MongoDB update.

TTL: Set a Time-To-Live (TTL) of 65 minutes as a fallback safety measure.

2. User Action Caching (Hidden Items):

Structure: Store user-specific hidden item IDs in Redis Sets (Key: user:{id}:hidden).

Consistency: Implement a Write-Through approach. When a user hides an item, the ID should be added to the Redis Set and persisted in the UserHiddenItem MongoDB collection simultaneously.

Query Optimization: Update the Items Service to fetch hidden IDs from Redis first. If Redis is empty (Cache Miss), fetch from MongoDB and hydrate Redis.

3. Redis Integration (NestJS):

Integrate cache-manager with cache-manager-redis-yet.

Create a CacheService to encapsulate manual invalidation logic for the hourly sync process.

4. Data Integrity:

Ensure that if Redis is unavailable, the application fails safe by falling back to MongoDB queries (Circuit Breaker logic).

Constraints:

Do not change the existing hourly sync logic, only add the trigger to clear the cache.

Maintain the JWT authorization context for all Redis key generation to ensure data isolation between users."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Faster article feed (Priority: P1)

As a signed-in user, I want the article list to load quickly and consistently so I can browse new items without delays.

**Why this priority**: The articles feed is the core experience and is read-heavy; improving it has the highest user impact.

**Independent Test**: Can be tested by repeatedly loading the article list and observing a consistent response time and updated data after sync.

**Acceptance Scenarios**:

1. **Given** a populated data store and an empty cache, **When** a user requests the article list, **Then** the system returns data and stores it in cache for future requests.
2. **Given** the hourly sync finishes ingesting new items, **When** the next user request arrives, **Then** the cache is invalidated or refreshed and the response includes the updated list.

---

### User Story 2 - Hidden items remain hidden (Priority: P2)

As a signed-in user, I want items I hide to disappear immediately and stay hidden across sessions.

**Why this priority**: Hidden items are a personal preference and must remain consistent for each user.

**Independent Test**: Can be tested by hiding an item, refreshing the feed, and confirming it stays hidden even after a server restart.

**Acceptance Scenarios**:

1. **Given** a user hides an item, **When** the next feed request is made, **Then** the item is excluded from results immediately.
2. **Given** the user’s hidden items are not present in cache, **When** a feed request is made, **Then** the system loads the hidden list from the data store and repopulates the cache.

---

### User Story 3 - Service remains usable during cache outage (Priority: P3)

As an operator, I want the system to continue serving requests when the cache is unavailable so users are not blocked.

**Why this priority**: Cache outages should not prevent normal operations or corrupt user preferences.

**Independent Test**: Can be tested by disabling the cache and verifying the feed and hide actions still succeed.

**Acceptance Scenarios**:

1. **Given** the cache layer is unavailable, **When** users request the feed or hide items, **Then** the system falls back to the primary data store and continues to function.

---

### Edge Cases

- What happens when cache invalidation fails after a sync completes?
- How does the system handle a cache miss while a user simultaneously hides an item?
- What happens if cached data expires while a request is in-flight?
- How does the system behave when the cache is intermittently available?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST use a cache-aside strategy for the global article list, serving from cache when available and hydrating from the primary data store on cache miss.
- **FR-002**: The system MUST invalidate or refresh the cached global article list after each successful hourly sync run.
- **FR-003**: The cached global article list MUST have a TTL of 65 minutes as a safety fallback.
- **FR-004**: When a user hides an item, the system MUST persist the hidden state and update the user’s cached hidden set in the same request.
- **FR-005**: The system MUST retrieve a user’s hidden item IDs from cache first and fall back to the primary data store on cache miss, then repopulate the cache.
- **FR-006**: Cache keys MUST be scoped by authenticated user identity to prevent cross-user data leakage.
- **FR-007**: If the cache layer is unavailable, the system MUST continue to serve feed and hide requests using the primary data store without user-visible failures.
- **FR-008**: The hourly sync logic MUST remain unchanged apart from triggering cache invalidation/refresh after it completes.

### Non-Functional Requirements *(mandatory)*

These requirements are **non-negotiable** and must comply with `.specify/memory/constitution.md`.

#### API Contracts & Safety
- **NFR-API-001**: All listing endpoints MUST implement pagination (page or cursor) with default
  `limit=20` and a hard max `MAX_ITEMS`.
- **NFR-API-002**: Requests with `limit > MAX_ITEMS` MUST return **400** with stable code
  `PAGINATION_LIMIT_EXCEEDED` and MUST log a warn including `requestId`.
- **NFR-API-003**: Critical endpoints MUST enforce `MAX_RESPONSE_BYTES` and return a controlled error
  (e.g. **422** `RESPONSE_TOO_LARGE`) rather than crashing.
- **NFR-API-004**: Pagination/sort/filter params MUST be strictly validated; invalid inputs MUST return
  **400** with stable code `VALIDATION_FAILED`.
- **NFR-API-005**: Sorting/filtering MUST use allowlisted fields; non-permitted fields MUST return
  **400** with stable code `INVALID_QUERY_FIELD`.
- **NFR-API-006**: Responses MUST be serialized via DTOs to avoid accidental exposure of internal or
  sensitive fields.
- **NFR-API-007**: Public routes MUST follow the documented API versioning strategy.

#### Reliability, Stress, and Degradation
- **NFR-REL-001**: Critical endpoints MUST define SLOs (p95/p99 latency, target RPS, max error rate).
- **NFR-REL-002**: Under saturation, the system MUST degrade explicitly (e.g. 429/503 per policy).
- **NFR-REL-003**: Rate limiting MUST exist (global + sensitive routes), configurable per environment.
- **NFR-REL-004**: External dependencies MUST have explicit timeouts and concurrency limits.

#### Observability & Errors
- **NFR-OBS-001**: Every request MUST have a `requestId` and it MUST be propagated through logs and
  responses.
- **NFR-OBS-002**: Logs MUST be structured and include at minimum: timestamp, service/module, requestId,
  path, method, status, durationMs.
- **NFR-ERR-001**: Error responses MUST follow the standard error contract and use stable error codes.

#### Operations, Security, and Testing
- **NFR-OPS-001**: Services MUST provide `/health`, `/health/live`, `/health/ready` and document
  readiness dependency checks.
- **NFR-SEC-001**: Security headers + explicit CORS config MUST be applied; authn/authz MUST be explicit
  with consistent 401/403 behavior (if applicable).
- **NFR-TST-001**: Tests MUST be executable through Docker to validate the real execution environment.

### Key Entities *(include if feature involves data)*

- **Cached Item List**: A reusable list of the latest items used to speed up feed retrieval.
- **Hidden Item Preference**: A per-user set of item IDs that should be excluded from that user’s feed.
- **Cache Availability State**: The system’s current ability to use the cache layer or fall back safely.

## Assumptions & Dependencies

- A managed cache layer is available in each environment and can be temporarily unavailable without impacting the primary data store.
- Hidden item preferences are always recoverable from the primary data store even if cached data is lost.
- Cache invalidation is triggered only after a successful hourly sync run completes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of article list requests return results within 1 second under normal load.
- **SC-002**: 99% of hide actions reflect in the user’s next feed view within 2 seconds.
- **SC-003**: During a cache outage, article listing and hide actions remain functional with no increase above 1% in server error rate.
- **SC-004**: After hourly sync completes, the next feed request reflects updated data within 1 minute.

### SLO Targets (required for critical endpoints)

- **SLO-001**: `/api/v1/articles` p95 latency ≤ 400 ms, p99 latency ≤ 800 ms.
- **SLO-002**: `/api/v1/articles` throughput ≥ 50 RPS at ≤ 1% error rate.
- **SLO-003**: `/api/v1/articles/:objectId` (hide) p95 latency ≤ 300 ms, p99 latency ≤ 600 ms.
