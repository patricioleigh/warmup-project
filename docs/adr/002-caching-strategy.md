# ADR 002: Caching Strategy for Items and Hidden Preferences

## Status

Accepted

## Context

The articles feed is read-heavy and requires consistent per-user hidden preferences. We need faster response times without changing the API contract or risking data loss during cache outages.

## Decision

- Use a cache-aside strategy for the global items list.
- Invalidate the global list cache after each successful sync run.
- Cache user hidden item IDs using a write-through approach.
- Fall back to MongoDB when the cache is unavailable.

## Consequences

- Cache contents are treated as an optimization only; MongoDB remains the source of truth.
- Cache invalidation ensures new items are visible shortly after ingestion.
- Hidden items remain consistent even if cache entries are lost.
- Cache outages do not block core read/write actions.
