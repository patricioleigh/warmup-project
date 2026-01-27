# Quickstart: Redis Caching Layer

## Prerequisites

- Server and database are running
- Cache service is available (Redis)
- `REDIS_URL` configured for the server

## Validation Steps

1. Trigger an item fetch to populate the cache via the articles endpoint.
2. Trigger hourly sync and confirm the cache invalidation/refresh occurs after completion.
3. Hide an item and verify it is excluded from subsequent feeds.
4. Disable the cache (stop Redis) and confirm feed and hide actions still succeed.

## Expected Outcomes

- Item list uses cached data after first load.
- Cache is refreshed or invalidated after hourly sync.
- Hidden items remain hidden across sessions.
- Cache outages do not break core read/write actions.
