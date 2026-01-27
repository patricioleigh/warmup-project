## Data Model Overview

### Cached Item List
- **Purpose**: Holds a snapshot of the latest items for fast retrieval.
- **Fields**:
  - `items`: array of item summaries (objectId, title, url, author, createdAt)
  - `cachedAt`: timestamp of when the cache was last refreshed
  - `expiresAt`: timestamp for cache expiry
- **Relationships**: Derived from Items collection; no direct ownership.
- **Validation Rules**:
  - Items array must exclude deleted items
  - Items must be ordered newest-first

### Hidden Item Preference
- **Purpose**: Stores per-user hidden item IDs.
- **Fields**:
  - `userId`: authenticated user identity
  - `objectId`: item identifier
  - `isHidden`: boolean flag
  - `updatedAt`: timestamp for preference update
- **Relationships**: Many-to-one with user; references item by objectId.
- **Validation Rules**:
  - One preference record per (userId, objectId)
  - isHidden true indicates exclusion from feed

### Cache Availability State
- **Purpose**: Operational indicator used to decide fallback behavior.
- **Fields**:
  - `isAvailable`: boolean or transient status
  - `lastCheckedAt`: timestamp
- **Relationships**: Operational-only; no business ownership.
