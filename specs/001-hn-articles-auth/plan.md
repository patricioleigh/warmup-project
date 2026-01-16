# Implementation Plan: Personalized HN Articles Feed

**Branch**: `001-hn-articles-auth` | **Date**: 2026-01-15 | **Spec**: `specs/001-hn-articles-auth/spec.md`
**Input**: Feature specification from `specs/001-hn-articles-auth/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. If you need the workflow,
check `.specify/scripts/` (this repository does not include `.specify/templates/commands/*`).

## Summary

Build a monorepo app with:

- **Server**: Hourly ingestion from the HN Algolia feed (Node.js query) into MongoDB after cleaning,
  plus an **authenticated** REST API that returns newest-first, paginated articles and supports
  **per-user soft delete** (hide) that persists across restarts/re-imports.
- **Client**: Next.js web UI (no UI framework) that lists newest-first articles and allows the user to
  hide an item via a trash button.

Key cross-cutting requirements from the constitution:

- Every listing endpoint must be paginated (default `limit=20`, hard cap `MAX_ITEMS`).
- Stable error contract, requestId propagation, safe serialization via DTOs.
- Explicit API versioning strategy: `/api/v1/...`.
- Dockerized server + client, with client built via multi-stage Docker build.
- Tests must run via Docker.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Node.js **Active LTS** (server); TypeScript throughout; React/Next.js (client)  
**Primary Dependencies**:
- **Server**: NestJS, MongoDB (Mongoose), Scheduler/Cron, JWT Auth (Passport + JWT), Config, Validation
- **Client**: React (latest), Next.js (latest), CSS (no UI framework like Bootstrap/MUI)
**Storage**: MongoDB 7 (Docker)  
**Testing**: Server Jest + Supertest (e2e); client tests minimal + e2e smoke (Docker-run)  
**Target Platform**: Docker containers (local dev + deployable)  
**Project Type**: Web app monorepo with `server/` + `client/`  
**Performance Goals**:
- Meet SLOs for listing and hide endpoints (see `spec.md` + `contracts/`).
- Ingest job finishes within the hourly window and is safe under retries.
**Constraints**:
- No uncontrolled listing payloads (pagination required; default 20; hard cap `MAX_ITEMS`).
- Stable error contract; requestId propagated.
- Soft delete is per-user: hidden items must not reappear for that user.
**Scale/Scope**:
- Multi-user support (at least dozens of concurrent users) with per-user personalization.
- Hourly ingestion from a single upstream feed query (`nodejs`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Required gates (from `.specify/memory/constitution.md`)**:

- **API bounded responses**: all listing endpoints paginated; default `limit=20`; enforce `MAX_ITEMS`;
  reject `limit > MAX_ITEMS` with `PAGINATION_LIMIT_EXCEEDED` and warn log including `requestId`.
- **Validation + allowlists**: strict typed validation for pagination/sort/filter; allowlisted fields only.
- **Safe serialization**: DTO-only responses; no accidental internal/sensitive fields.
- **Stable errors**: standard error contract + stable error codes.
- **requestId**: generated/propagated; included in response + logs.
- **SLOs + controlled degradation**: p95/p99/RPS/error-rate targets for critical endpoints; explicit 429/503
  behavior under saturation; rate limiting configured.
- **Dependencies**: explicit timeouts + concurrency limits for new integrations.
- **Ops**: `/health`, `/health/live`, `/health/ready` + graceful shutdown behavior documented.
- **Docker-only tests**: feature’s tests runnable via Docker to validate real environment.

## Project Structure

### Documentation (this feature)

```text
specs/001-hn-articles-auth/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
client/                      # Next.js app (no UI framework)
├── Dockerfile               # multi-stage build required
├── package.json
└── src/
   ├── app/
   ├── components/
   ├── lib/
   └── types/

server/                      # NestJS app
├── Dockerfile
├── package.json
└── src/
   ├── app.module.ts
   ├── main.ts
   ├── hn/                   # upstream fetch + cleaning
   ├── items/                # legacy “items” (will evolve into articles + pagination + auth)
   ├── auth/                 # NEW: auth module (JWT)
   ├── users/                # NEW: users module
   ├── articles/             # NEW: versioned articles API
   ├── interactions/         # NEW: UserArticleInteraction persistence
   ├── health/               # NEW: /health endpoints + readiness indicators
   └── common/               # NEW: requestId, error filter, DTOs, config

docker-compose.yml           # runs mongo + server + client
```

**Structure Decision**: Keep the existing monorepo layout (`client/`, `server/`) and add server modules
for auth/users/articles/interactions/health without introducing additional top-level projects.

## Complexity Tracking

No constitution violations expected; complexity is bounded to the required auth + per-user hide features.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
