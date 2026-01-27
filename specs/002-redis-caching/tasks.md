---
description: "Task list for 002-redis-caching implementation"
---

# Tasks: Caching Layer for Items and Preferences

**Input**: Design documents from `specs/002-redis-caching/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Tests**: Tests MUST be included and MUST be runnable via Docker (per `.specify/memory/constitution.md`).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add Redis infra and dependencies used by all stories.

- [x] T001 Update `docker-compose.yml` to add Redis service and network wiring
- [x] T002 [P] Update `docker-compose.test.yml` to add Redis service for e2e runs
- [x] T003 [P] Add cache dependencies to `server/package.json`
- [x] T004 [P] Add Redis connection env variables to `server/.env.example` (if present)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core cache infrastructure and config. Blocks all user stories.

- [x] T005 Add Redis config validation to `server/src/app.module.ts`
- [x] T006 [P] Create cache module skeleton in `server/src/cache/cache.module.ts`
- [x] T007 [P] Create cache service wrapper in `server/src/cache/cache.service.ts` (fallback-safe helpers)
- [x] T008 Wire cache module into `server/src/app.module.ts`
- [x] T009 Add Redis health indicator to `server/src/health/health.service.ts`
- [x] T010 Update readiness endpoint to include Redis health in `server/src/health/health.controller.ts`

**Checkpoint**: Cache infrastructure ready for feature stories.

---

## Phase 3: User Story 1 - Faster article feed (Priority: P1) 🎯 MVP

**Goal**: Cache-aside for global list with explicit invalidation after sync.

**Independent Test**: First request hydrates cache; subsequent requests served from cache; sync invalidates cache.

### Tests for User Story 1

- [x] T011 [P] [US1] e2e: article list caches and returns data with Redis enabled in `server/test/articles-cache.e2e-spec.ts`
- [x] T012 [P] [US1] e2e: hourly sync invalidates/refreshes cache in `server/test/sync-cache.e2e-spec.ts`

### Implementation for User Story 1

- [x] T013 [US1] Add global list cache key helpers in `server/src/cache/cache.service.ts`
- [x] T014 [US1] Implement cache-aside retrieval for list in `server/src/articles/articles.service.ts`
- [x] T015 [US1] Add cache invalidation trigger after sync completion in `server/src/items/items.service.ts`
- [x] T016 [US1] Ensure cached list respects pagination and ordering in `server/src/articles/articles.service.ts`

**Checkpoint**: Cached list behaves correctly and updates after sync.

---

## Phase 4: User Story 2 - Hidden items remain hidden (Priority: P2)

**Goal**: Write-through cache for user hidden items with Redis Sets.

**Independent Test**: Hide action updates cache + DB; subsequent feed excludes hidden items even on cache miss.

### Tests for User Story 2

- [x] T017 [P] [US2] e2e: hiding writes through cache and excludes item in `server/test/hidden-cache.e2e-spec.ts`
- [x] T018 [P] [US2] e2e: cache miss hydrates hidden set from DB in `server/test/hidden-cache-miss.e2e-spec.ts`

### Implementation for User Story 2

- [x] T019 [US2] Add user hidden key helpers in `server/src/cache/cache.service.ts`
- [x] T020 [US2] Implement read-through for hidden IDs in `server/src/interactions/interactions.service.ts`
- [x] T021 [US2] Add write-through update on hide in `server/src/interactions/interactions.service.ts`
- [x] T022 [US2] Update articles filtering to use cached hidden IDs in `server/src/articles/articles.service.ts`

**Checkpoint**: User hide preferences are cached and consistent.

---

## Phase 5: User Story 3 - Service remains usable during cache outage (Priority: P3)

**Goal**: Safe fallback to MongoDB when Redis is unavailable.

**Independent Test**: With Redis offline, list and hide actions still succeed using DB.

### Tests for User Story 3

- [x] T023 [P] [US3] e2e: list works with Redis offline in `server/test/cache-outage-list.e2e-spec.ts`
- [x] T024 [P] [US3] e2e: hide works with Redis offline in `server/test/cache-outage-hide.e2e-spec.ts`

### Implementation for User Story 3

- [x] T025 [US3] Add cache outage fallback logic in `server/src/cache/cache.service.ts`
- [x] T026 [US3] Ensure article list fallback uses DB on cache failure in `server/src/articles/articles.service.ts`
- [x] T027 [US3] Ensure hide actions fallback to DB only in `server/src/interactions/interactions.service.ts`

**Checkpoint**: Cache outages do not block core actions.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and operational validation.

- [x] T028 [P] Update quickstart validation steps in `specs/002-redis-caching/quickstart.md`
- [x] T029 Add caching ADR in `docs/adr/002-caching-strategy.md`
- [x] T030 Run Docker e2e suite with Redis enabled (document in `specs/002-redis-caching/tasks.md`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1
- **User Stories (Phases 3–5)**: Depend on Phase 2
- **Polish (Phase 6)**: Depends on desired stories complete

### User Story Dependencies

- **US1**: Starts after Foundational
- **US2**: Starts after Foundational (integrates with US1 list)
- **US3**: Starts after Foundational (touches cache service used by US1/US2)

### Parallel Opportunities

- Setup tasks marked [P]
- Tests in each user story marked [P]
- Helper additions in `cache.service.ts` can be split with other story work if sequenced

---

## Parallel Example: User Story 1

```text
Task: T011 [US1] e2e: article list caches and returns data in server/test/articles-cache.e2e-spec.ts
Task: T012 [US1] e2e: hourly sync invalidates cache in server/test/sync-cache.e2e-spec.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup + Foundational
2. Implement and test US1
3. Validate cache invalidation after sync

### Incremental Delivery

1. Add US2 for per-user hidden cache
2. Add US3 for cache outage fallback
3. Final polish and documentation
