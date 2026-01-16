<!--
Sync Impact Report
- Version change: N/A (template placeholders) → 1.0.0
- Modified principles: N/A → new constitution principles established
- Added sections:
  - Core Principles: API Contracts & Controlled Payloads, Controlled Degradation & Performance SLOs,
    Jobs/Scheduling Idempotency & Coordination, Observability & Traceability, Security/Operations/Quality
  - Mandatory Standards Catalog
  - Compliance & Quality Gates
- Removed sections: N/A
- Templates requiring updates:
  - ✅ updated: `.specify/templates/plan-template.md`
  - ✅ updated: `.specify/templates/spec-template.md`
  - ✅ updated: `.specify/templates/tasks-template.md`
  - ✅ updated: `.specify/templates/checklist-template.md`
  - ⚠ pending (missing in repo): `.specify/templates/commands/*.md` (referenced by some templates/commands)
- Deferred TODOs:
  - TODO(RATIFICATION_DATE): original adoption date not known; set before first “official” release.
-->

# Warmup Project Constitution

## Core Principles

### I. API Contracts & Controlled Payloads (NON-NEGOTIABLE)
Public API endpoints MUST be safe-by-default: validated, versioned, bounded, and serialized via DTOs.

- **Pagination required**: Every listing/collection endpoint MUST implement pagination (page or cursor).
  - Default limit MUST be **20**.
  - Hard maximum MUST be configurable via `MAX_ITEMS`.
  - If `limit` > `MAX_ITEMS`, the service MUST reject with **400** and stable code
    `PAGINATION_LIMIT_EXCEEDED`, and MUST log a **warn** including `requestId`.
- **Response size budget**: Critical endpoints MUST enforce `MAX_RESPONSE_BYTES` (configurable).
  - If an endpoint would exceed the budget, it MUST return a controlled error (e.g. **422**) with stable
    code `RESPONSE_TOO_LARGE` and guidance to paginate/filter; it MUST NOT crash the process.
- **Strict typed validation**: Pagination/sort/filter params MUST be validated (types + constraints).
  - Invalid values MUST return **400** with stable code `VALIDATION_FAILED`.
- **Sort/filter allowlists**: Sorting and filtering MUST use explicit allowlists.
  - Non-permitted fields MUST return **400** with stable code `INVALID_QUERY_FIELD`.
- **Safe serialization**: Responses MUST be produced from explicit DTOs/serializers; internal fields and
  sensitive fields MUST NOT be exposed by default.
- **API versioning**: Public routes MUST follow a single explicit versioning strategy (URL or header).
  The chosen strategy MUST be documented and applied consistently (no unversioned “public” routes).

### II. Performance, Stress, and Controlled Degradation
Critical endpoints MUST have explicit SLOs and the system MUST degrade in a controlled, diagnosable way.

- **SLOs required**: For each critical endpoint, the spec MUST include p95/p99 latency budgets, target
  throughput (RPS), and maximum error rate.
- **Controlled saturation behavior**: Under load/stress, the system MUST fail explicitly (e.g. **429**
  or **503** per policy) rather than collapsing into mass timeouts without diagnostics.
- **Rate limiting**: Rate limiting MUST exist globally and for sensitive routes, and MUST be configurable
  per environment.
- **Caching strategy**: Repeated reads and idempotent endpoints MUST have a documented caching strategy
  (TTL + invalidation), without binding to a specific caching technology.
- **Dependency timeouts & concurrency limits**: Every integration (DB, external services) MUST have
  defined timeouts, reasonable concurrency limits, and consistent failure handling (no indefinite waits).

### III. Scheduling/Cron/Jobs Must Be Idempotent and Observable
All scheduled work MUST be deterministic across retries/restarts and observable for operations.

- **Idempotency**: Every job MUST be idempotent (running twice MUST NOT create duplicates or inconsistent
  state).
- **Execution state**: Each job MUST record and expose at minimum: `lastRun`, `status`, `durationMs`,
  `itemsProcessed`, `jobRunId`, and `errorId` on failure.
- **Restart safety**: Restarts MUST NOT create ghost jobs, duplicate work, or inconsistent processing.
  Post-restart behavior MUST be deterministic and documented.
- **Multi-instance policy**: In multi-instance deployments, critical jobs MUST have an explicit policy
  to prevent unwanted parallel execution (lock/leader election/coordination appropriate to environment).
- **Job observability**: Start/end logs, duration, counters, and correlation via `jobRunId` (and
  `requestId` when applicable) MUST exist.

### IV. Observability and End-to-End Traceability
The system MUST be diagnosable in production with consistent correlation and safe, structured logs.

- **requestId**: Every request MUST have a unique `requestId`, propagated through logs, responses, and
  internal calls where applicable.
- **Structured logging**: Logs MUST be structured with levels (debug/info/warn/error) and include at
  minimum: `timestamp`, `service/module`, `requestId`, `path`, `method`, `status`, `durationMs`.
- **Redaction**: Secrets and PII MUST NOT be logged. A redaction policy MUST be defined and applied
  systematically.
- **Default request/response summary logs**: Log method/path/status/duration (and optionally response
  size) by default; payload detail MUST only be enabled under controlled troubleshooting.
- **Lifecycle logs**: Startup, config loaded (without secrets), readiness reached, and graceful shutdown
  MUST be logged.

### V. Security, Operations, and Quality Gates (Baseline Standard)
Security and operability MUST be “built-in,” not bolted on.

- **Error standardization**: All error responses MUST follow the standard error contract:
  `errorId`, `code`, `message` (non-sensitive), `timestamp`, `path`, `requestId`, `status`.
  - `errorId` MUST correlate to a server-side error log event (level error).
  - Error codes MUST come from a stable catalog (e.g. `VALIDATION_FAILED`, `FORBIDDEN`,
    `RATE_LIMITED`, `DEPENDENCY_TIMEOUT`); clients MUST NOT depend on free-text messages.
  - Validation/auth/authz/rate-limit errors MUST be consistent across modules/routes.
  - Production MUST NOT leak internal details (stack traces, internal dependency details).
- **Baseline security**: Security headers MUST be applied by default. CORS MUST be explicitly configured
  per environment (no wildcards in production without justification).
  - Auth/authz MUST be explicit, consistent (401/403), and documented (roles/permissions/scopes).
  - Token policy (access TTL, refresh strategy, revocation/invalidations) MUST be specified.
- **Health & graceful shutdown**: Services MUST expose `/health`, `/health/live`, `/health/ready`.
  Readiness MUST validate minimum dependencies and compose per-module indicators.
  On termination, services MUST stop accepting traffic, drain in-flight requests within a defined
  timeout, and close resources correctly.
- **Configuration & secrets**: Configuration MUST be externalized, environment-managed, and validated at
  startup; services MUST fail fast if required config is missing/invalid.
  Secrets MUST NOT be hardcoded or baked into images; they MUST be injected via env/secret manager.
- **Docs & governance**: Public APIs MUST be documented via OpenAPI/Swagger including params/responses,
  error codes, and examples. Key NFR decisions MUST be recorded as brief, versioned ADRs.
- **Docker & tests**: Docker images MUST use multi-stage builds, minimal runtime, and run as non-root.
  `.dockerignore` MUST exclude secrets/artifacts. Containers MUST include a healthcheck aligned to
  `/health/*` and handle shutdown signals. All tests MUST be executed through Docker to validate the
  real execution environment.

## Mandatory Standards Catalog
This section is the “single source of truth” for cross-cutting NFR standards referenced by specs/plans.

### API Versioning Strategy
- **Default**: URL-based versioning: all public routes are prefixed with `/api/v1`.
- Changes MUST be made behind versioned routes; breaking changes require a new major version.

### Limits & Configurability (Required Config Keys)
- `MAX_ITEMS` (hard cap for any collection endpoint)
- `MAX_RESPONSE_BYTES` (response size budget for critical endpoints)
- Rate limiting config (global + per-route overrides) per environment
- Timeouts/concurrency limits for external dependencies
- Graceful shutdown timeout

### Stable Error Code Catalog (Minimum)
- `VALIDATION_FAILED`
- `PAGINATION_LIMIT_EXCEEDED`
- `INVALID_QUERY_FIELD`
- `RATE_LIMITED`
- `AUTH_INVALID_TOKEN`
- `FORBIDDEN`
- `DEPENDENCY_TIMEOUT`
- `RESPONSE_TOO_LARGE`
- `INTERNAL_ERROR`

### Documentation & ADRs
- OpenAPI/Swagger MUST include examples and error responses using the standard error contract.
- ADRs MUST be versioned and recorded for: pagination policy, limits, security headers/CORS, rate
  limiting, jobs coordination strategy, health/readiness, token policy, and Docker/test strategy.

## Compliance & Quality Gates
These gates MUST be reflected in plans/tasks and enforced during reviews.

### Spec Gate (before implementation)
- Identify critical endpoints and specify SLOs (p95/p99, RPS, max error rate).
- Define pagination/limits policy for all listing endpoints.
- Define error codes to be used by the feature (from the stable catalog; add if needed).
- Define authn/authz requirements (401/403 behavior, roles/scopes if applicable).
- Define dependency timeouts and failure behavior for any new integration.

### Implementation Gate (before merge)
- All public endpoints: strict validation, allowlisted query fields, DTO-safe serialization.
- requestId: present in response and in structured logs for the full request lifecycle.
- Standard error contract implemented for all error paths.
- Health endpoints updated if new dependencies are introduced; readiness composes new indicators.
- Docker-only test execution verified for the feature (e2e minimum where applicable).

## Governance
<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

### Amendment Policy
- Amendments MUST be made via PR, include rationale, and update dependent templates/docs.
- Versioning follows semantic versioning:
  - **MAJOR**: backwards-incompatible governance changes or removals
  - **MINOR**: new principles/sections or materially expanded guidance
  - **PATCH**: clarifications/typos/non-semantic refinements

### Compliance Review Expectations
- PRs MUST be reviewed against this constitution and must not introduce uncontrolled payloads, missing
  validation, missing requestId propagation, inconsistent errors, or unversioned public routes.
- If a change violates a principle, it MUST be explicitly documented (with a migration plan) and
  approved as an amendment.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE) | **Last Amended**: 2026-01-15
