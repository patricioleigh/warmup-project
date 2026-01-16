# Research: Personalized HN Articles Feed

## Goals

- Ingest recent HN Algolia “nodejs” items hourly into MongoDB, storing only cleaned fields.
- Provide an authenticated API that returns newest-first, paginated items and supports per-user hiding.
- Ensure deleted/hidden items never reappear for that user after restart or re-import.
- Align with constitution: versioned API, bounded responses, stable errors, requestId, Docker tests.

## Key Decisions

### API shape and versioning

- Use URL-based versioning: all public endpoints are under `/api/v1/...`.
- Keep legacy unversioned routes as internal/dev-only (or migrate them) so public consumption is explicit.

### Pagination approach (internal API)

- Use **page-based pagination** for the articles listing: `page` + `limit`.
  - Default `limit=20`.
  - Enforce `MAX_ITEMS` as a hard cap; reject `limit > MAX_ITEMS` with stable error code
    `PAGINATION_LIMIT_EXCEEDED` and a warn log containing `requestId`.
- Response includes `items` plus paging metadata (`page`, `limit`, `total`, `hasNextPage`).

Rationale: page-based pagination is easy to reason about for “newest-first list” and sufficient for the
expected dataset size. If the dataset grows, we can switch to cursor-based pagination in `/api/v2`.

### Ingestion job behavior

- Use an hourly scheduled job to fetch from the upstream feed.
- Ingestion is idempotent via **upsert** on the unique `objectId`.
- Items are cleaned before persistence:
  - `objectID` → `objectId` (string)
  - `story_title` preferred; fallback to `title`; discard if both null/empty
  - `story_url` preferred; fallback to `url`
  - `author`
  - `created_at` → `createdAt` (Date)
  - set `isDeleted=false` on insert
- Avoid overlapping runs:
  - Keep an “in-progress” guard to prevent parallel execution within one instance.
  - Record job execution state in Mongo (lastRun, status, durationMs, itemsProcessed, jobRunId, errorId).

### Per-user hiding (“soft delete”)

- Do **not** physically delete articles from the main articles collection.
- Store per-user visibility as a separate collection (UserArticleInteraction):
  - compound unique index on `(userId, objectId)`
  - `isHidden: boolean`
- Listing endpoint applies a user-specific filter: exclude objectIds that have `isHidden=true` for
  the requesting `userId`.

Rationale: this supports multiple clients/users while keeping ingested article data shared and
idempotent.

### Authentication model

- Stateless JWT authentication:
  - Access token sent via `Authorization: Bearer <token>`.
  - `request.user` contains `{ userId, email }`.
- Registration and login endpoints return a token for use by the client.
- Passwords stored as a strong one-way hash (async).

### Error handling and observability

- requestId is generated per request (or accepted if provided) and returned to clients.
- Stable error contract used everywhere: `errorId`, `code`, `message`, `timestamp`, `path`, `requestId`,
  `status`.
- Under load, apply rate limiting and fail explicitly with stable error code `RATE_LIMITED`.

## Open Questions

None required for planning; defaults are chosen to match the spec and constitution.
