# Feature Specification: Personalized HN Articles Feed

**Feature Branch**: `001-hn-articles-auth`  
**Created**: 2026-01-15  
**Status**: Draft  
**Input**: Hourly ingest of recent articles into DB + authenticated, per-user “hide” (soft delete) and
web UI to list newest-first.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Browse recent articles (Priority: P1)

A signed-in user opens the web app and sees a list of the most recent articles in date order (newest
first). They can paginate through older results.

**Why this priority**: This is the core value of the application: quickly discovering recent content.

**Independent Test**: With a valid user session, a user can load the page and see a list of articles
sorted newest-first, with pagination controls.

**Acceptance Scenarios**:

1. **Given** the user is authenticated, **When** they open the articles page,
   **Then** they see the most recent articles sorted by created time (newest first).
2. **Given** the user is authenticated and viewing the list, **When** they navigate to the next page,
   **Then** they see older results and the order remains newest-first within the page.

---

### User Story 2 - Hide an article (soft delete) (Priority: P2)

A signed-in user hides an article from their feed using a trash/delete control. The hidden article
disappears immediately and never reappears for that user, even after restarts or future hourly imports.

**Why this priority**: Personalization depends on persistent user actions; hiding ensures relevance and
prevents repeated exposure to unwanted items.

**Independent Test**: A user hides an item; it disappears from the list; refreshing/restarting still
does not show it for that same user.

**Acceptance Scenarios**:

1. **Given** the user is authenticated and an article is visible,
   **When** they click “delete/trash” for that article,
   **Then** the article is removed from the list for that user and remains hidden after refresh.
2. **Given** the hourly ingest runs and imports an article the user hid previously,
   **When** the user loads the articles page again,
   **Then** that article is still not shown to that user.

---

### User Story 3 - Register and sign in (Priority: P3)

A user can create an account and sign in so their hidden-article preferences are stored per profile
and work across multiple devices/sessions.

**Why this priority**: Per-user personalization (hiding) requires a stable user identity.

**Independent Test**: A user can register, sign in, and then access the protected articles page.

**Acceptance Scenarios**:

1. **Given** a new user, **When** they register with valid credentials,
   **Then** an account is created and they can sign in.
2. **Given** an unauthenticated user, **When** they try to access the articles feed,
   **Then** they are blocked and prompted to sign in.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- Upstream feed returns items with missing titles: story-title missing uses fallback title; if both
  missing, the item is discarded and never displayed.
- Upstream feed returns duplicate items across runs: ingest is idempotent and does not create duplicates.
- Upstream feed is unavailable or slow: ingestion fails gracefully without blocking the API for users.
- A user attempts to hide an article that does not exist: a stable “not found” response is returned.
- Invalid pagination params (negative page/limit, over max): stable 400 validation responses are returned.
- Multiple users hide different articles: each user sees only their own personalization applied.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST ingest recently posted articles from a configurable upstream feed at least
  once per hour and persist cleaned article records.
- **FR-002**: System MUST discard upstream items that do not contain a usable title (story title or
  title).
- **FR-003**: System MUST store articles with fields: `objectId`, `title`, `url`, `author`, `createdAt`,
  and `isDeleted=false` on insertion.
- **FR-004**: System MUST provide an authenticated endpoint for users to retrieve a paginated list of
  articles sorted newest-first, excluding any articles the user has hidden.
- **FR-005**: System MUST allow an authenticated user to hide an individual article from their feed and
  persist that preference so it survives restarts and re-imports.
- **FR-006**: System MUST support user registration and sign-in so that hidden-article preferences are
  stored per user profile.

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

- **Article**: A cleaned representation of an upstream item, uniquely identified by `objectId`.
  Attributes: `objectId`, `title`, `url`, `author`, `createdAt`, `isDeleted`.
- **User**: A registered user profile with a stable identifier used to scope personalization.
  Attributes: `userId`, `email`, credential verifier (stored securely).
- **UserArticleInteraction**: Per-user mapping for article visibility preferences.
  Attributes: `userId`, `objectId`, `isHidden`, audit timestamps as needed.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: A signed-in user can load the articles feed and see newest-first results, with paging, in
  under 3 seconds on a typical broadband connection.
- **SC-002**: After a user hides an article, it does not reappear for that user across refreshes,
  restarts, or subsequent hourly ingests.
- **SC-003**: At least 95% of sign-in attempts with valid credentials succeed without user-visible
  errors.
- **SC-004**: The system supports at least 50 concurrent active users browsing the feed without a
  noticeable increase in page load time (relative to single-user baseline).

### SLO Targets (required for critical endpoints)

- **SLO-001**: Articles listing: p95 ≤ 300 ms, p99 ≤ 800 ms (server-side processing, excluding CDN).
- **SLO-002**: Articles listing throughput: ≥ 50 RPS at ≤ 1% error rate under normal operation.
