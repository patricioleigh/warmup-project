## Research Summary

### Decision: Cache-aside for global item list with explicit invalidation
**Rationale**: Cache-aside keeps the primary data store as source of truth while improving read latency. Explicit invalidation after sync ensures freshness without modifying the sync logic.
**Alternatives considered**: Write-through for list caching; rejected due to higher write amplification and tighter coupling to write paths.

### Decision: Per-user hidden items cached as sets with write-through
**Rationale**: Write-through ensures consistency between cache and persistent store for user-specific preferences and minimizes divergence.
**Alternatives considered**: Write-behind; rejected due to risk of losing user hide actions during cache outages or crashes.

### Decision: Cache TTL of 65 minutes for global list
**Rationale**: TTL longer than hourly sync protects against stale cache persisting indefinitely while minimizing unnecessary reloads.
**Alternatives considered**: Short TTL (5–15 minutes); rejected due to unnecessary cache churn and higher database load.

### Decision: Safe fallback on cache unavailability
**Rationale**: User-facing reliability requires that cache outages do not prevent reads or hide actions. Fallback to the primary store maintains availability.
**Alternatives considered**: Fail closed; rejected due to poor UX and unnecessary downtime.

### Decision: Cache key isolation by authenticated user identity
**Rationale**: Ensures user-specific data is separated and prevents leakage between users.
**Alternatives considered**: Shared or unscoped keys; rejected due to data isolation risks.
