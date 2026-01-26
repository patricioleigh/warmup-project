# Implementation Plan: Caching Layer for Items and Preferences

**Branch**: `002-redis-caching` | **Date**: 2026-01-16 | **Spec**: `specs/002-redis-caching/spec.md`
**Input**: Feature specification from `specs/002-redis-caching/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. If you need the workflow,
check `.specify/scripts/` (this repository does not include `.specify/templates/commands/*`).

## Summary

Add a caching layer for item lists and per-user hidden preferences to improve read performance and keep user-specific hides consistent. Use a cache-aside strategy for the global list with explicit invalidation after hourly sync, write-through for user hidden items, and safe fallback to the primary data store when cache is unavailable.

## Technical Context

**Language/Version**: TypeScript (Node.js Active LTS)  
**Primary Dependencies**: NestJS, MongoDB, Redis (v7+), cache-manager, cache-manager-redis-yet  
**Storage**: MongoDB for persistent data; Redis for caching  
**Testing**: Jest (Docker-based e2e)  
**Target Platform**: Linux containers (Docker Compose)  
**Project Type**: Web application (server + client)  
**Performance Goals**: 95% of article list requests within 1 second; hide actions reflected within 2 seconds  
**Constraints**: Cache failures must fall back to database without user-visible errors  
**Scale/Scope**: Read-heavy feed usage with per-user hidden preferences

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
specs/002-redis-caching/
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
server/
├── src/
│   ├── items/
│   ├── articles/
│   ├── interactions/
│   ├── jobs/
│   └── common/
└── test/

client/
└── src/
    ├── app/
    ├── components/
    └── lib/
```

**Structure Decision**: Web application with `server/` and `client/` directories as shown above.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

## Phase 0: Outline & Research

- Populate `research.md` with caching strategy decisions, rationales, and alternatives.
- Confirm cache failure fallback strategy and invalidation timing.

## Phase 1: Design & Contracts

- Define cache-related entities and validation in `data-model.md`.
- Document any API contract impacts (expected none) in `contracts/`.
- Create quickstart validation steps for cache behavior.
- Update agent context using the provided script.

## Phase 2: Planning

- Identify implementation tasks and tests in `tasks.md` via `/speckit.tasks`.
