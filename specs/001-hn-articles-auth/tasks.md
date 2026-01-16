---
description: "Task list for 001-hn-articles-auth implementation"
---

# Tasks: Personalized HN Articles Feed

**Feature**: `001-hn-articles-auth`  
**Inputs**: `specs/001-hn-articles-auth/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/*`  
**Execution rule**: Mark tasks `[x]` as completed immediately after finishing them.

## Phase 1: Setup (Repository + Docker hygiene)

- [x] T001 Verify/append ignore files: `.gitignore`, `.dockerignore`, `.eslintignore`/eslint ignores, `.prettierignore` (if applicable)
- [x] T002 Align docker-compose env vars with new API base + JWT + limits (`MAX_ITEMS`, `MAX_RESPONSE_BYTES`, `JWT_SECRET`)
- [x] T003 Ensure client Dockerfile is multi-stage build and runs as non-root; ensure server Dockerfile runs as non-root

---

## Phase 2: Foundational (Blocking prerequisites)

- [x] T010 [P] Add server config validation for required env vars (`MONGO_URI`, `JWT_SECRET`, limits) in `server/src/*`
- [x] T011 [P] Implement requestId middleware/interceptor + response header in `server/src/common/*`
- [x] T012 [P] Implement standard error filter/formatter (errorId + stable code catalog) in `server/src/common/*`
- [x] T013 [P] Add health endpoints `/health`, `/health/live`, `/health/ready` in `server/src/health/*`
- [x] T014 Add global validation pipe (whitelist/forbidNonWhitelisted) and DTO strategy in `server/src/main.ts`
- [x] T015 Add rate limiting (global + sensitive routes) in `server/src/main.ts` (configurable per env)

---

## Phase 3: Auth & Users (User Story 3 - P3)

### Tests (write first)

- [x] T020 [P] [US3] e2e: register/login happy path (Docker-run) in `server/test/*`
- [x] T021 [P] [US3] e2e: protected endpoint rejects without token (401) in `server/test/*`

### Implementation

- [x] T022 [US3] Add `UsersModule` + user schema/model + service in `server/src/users/*`
- [x] T023 [US3] Add `AuthModule` using Passport JWT (`@nestjs/passport`, `passport-jwt`, `@nestjs/jwt`) in `server/src/auth/*`
- [x] T024 [US3] Implement `JwtStrategy` (Bearer extraction) + `JwtAuthGuard` + `@GetUser()` decorator
- [x] T025 [US3] Implement registration + login DTOs with validation and bcrypt hashing/compare (async)

---

## Phase 4: Articles API + per-user hide (User Stories 1 & 2 - P1/P2)

### Tests (write first)

- [x] T030 [P] [US1] e2e: GET `/api/v1/articles` returns paginated newest-first for authenticated user
- [x] T031 [P] [US2] e2e: DELETE `/api/v1/articles/:objectId` hides for that user; does not affect other user
- [ ] T032 [P] [US2] e2e: hidden article does not reappear after re-import (simulate by inserting article + hiding + re-upsert)
- [x] T033 [P] [US1] e2e: pagination rejects `limit > MAX_ITEMS` with stable code `PAGINATION_LIMIT_EXCEEDED`

### Implementation

- [x] T034 [US1] Create `Article` schema/model (or adapt existing `Items` schema) with fields per data-model in `server/src/articles/schemas/*`
- [x] T035 [US2] Create `UserArticleInteraction` schema/model with `(userId, objectId)` unique index and `isHidden` in `server/src/interactions/schemas/*`
- [x] T036 [US1] Implement `ArticlesService` listing with strict query validation, allowlists, pagination default 20, cap via `MAX_ITEMS`
- [x] T037 [US1] Enforce `MAX_RESPONSE_BYTES` for the listing response (controlled 422 `RESPONSE_TOO_LARGE`)
- [x] T038 [US2] Implement hide endpoint: upsert interaction `(userId, objectId)` set `isHidden=true`
- [x] T039 [US1/US2] Add `ArticlesController` under `/api/v1/articles` protected by `JwtAuthGuard`

---

## Phase 5: Ingestion job (Hourly sync)

- [x] T050 Add job execution-state tracking (`JobRuns`/status) in `server/src/jobs/*` (lastRun/status/duration/itemsProcessed/jobRunId/errorId)
- [x] T051 Make hourly ingest idempotent and restart-safe; prevent overlap; ensure hidden items remain hidden (no destructive writes)
- [x] T052 Add reasonable upstream timeouts + failure handling for HN fetch; no indefinite blocking

---

## Phase 6: Client updates (User Stories 1/2/3)

- [x] T060 [US3] Add simple auth UI (register/login) without UI frameworks in `client/src/app/*` + `client/src/components/*`
- [x] T061 [US1] Fetch articles from `/api/v1/articles` using token; render newest-first with pagination controls
- [x] T062 [US2] Trash button calls DELETE `/api/v1/articles/:objectId` with token; removes from UI; stays hidden after refresh

---

## Phase 7: Docker-only test execution + validation

- [x] T070 Ensure server tests run via Docker (compose or Dockerfile) and pass
- [x] T071 Ensure client build + runtime works via Docker multi-stage build
- [x] T072 Validate quickstart steps (health endpoints, register/login, list, hide, restart persistence)

