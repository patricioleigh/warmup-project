# Data Model: Personalized HN Articles Feed

## Collections

### Articles

**Purpose**: Stores cleaned, shared article data ingested from the upstream feed.

**Fields**

- `objectId` (string, unique, indexed): Upstream identifier.
- `title` (string, required): Cleaned title (prefer story title; fallback to title).
- `url` (string, optional): Cleaned URL (prefer story URL; fallback to URL).
- `author` (string, required)
- `createdAt` (Date, required, indexed)
- `isDeleted` (boolean, required, default false)

**Indexes**

- Unique index: `objectId`
- Index: `createdAt` (descending use)
- Index: `isDeleted`

Notes:

- `isDeleted` remains `false` for ingested items. User actions do not toggle this flag (user actions are
  tracked in the interaction collection).

### Users

**Purpose**: Identifies a user and supports authentication.

**Fields**

- `userId` (string/ObjectId): Internal identifier.
- `email` (string, unique, required)
- `passwordHash` (string, required)
- Audit timestamps as needed.

**Indexes**

- Unique index: `email`

### UserArticleInteraction

**Purpose**: Stores per-user visibility preferences without modifying the shared article record.

**Fields**

- `userId` (string/ObjectId, required, indexed)
- `objectId` (string, required, indexed)
- `isHidden` (boolean, required, default false)
- Audit timestamps as needed.

**Indexes**

- Unique compound index: `(userId, objectId)`
- Optional partial index where `isHidden=true` (if needed for faster listing filters)

### JobRuns (or JobStatus)

**Purpose**: Minimal execution-state tracking for the hourly ingestion job.

**Fields**

- `jobName` (string, required) e.g. `hn-hourly-sync`
- `jobRunId` (string, required, unique)
- `lastRun` (Date)
- `status` (enum string): `running` | `success` | `failed`
- `durationMs` (number)
- `itemsProcessed` (number)
- `errorId` (string, optional)

## Query Patterns

### List articles (newest-first, per-user)

- Base filter: `isDeleted=false`
- Sort: `createdAt desc`
- Exclude: any `objectId` where `(userId, objectId, isHidden=true)` exists
- Pagination: `page` + `limit` (bounded)

### Hide article for user

- Upsert `UserArticleInteraction` for `(userId, objectId)` setting `isHidden=true`
