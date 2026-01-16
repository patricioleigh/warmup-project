# Articles API (v1)

Base path: `/api/v1`

## GET /articles

Returns newest-first articles for the authenticated user.

**Auth**: required

**Query parameters**

- `page` (number, optional, default 1, min 1)
- `limit` (number, optional, default 20, max `MAX_ITEMS`)

**Response (200)**

```json
{
  "items": [
    {
      "objectId": "123",
      "title": "Example title",
      "url": "https://example.com",
      "author": "alice",
      "createdAt": "2026-01-15T00:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1234,
  "hasNextPage": true
}
```

Notes:

- Items hidden for this user (via `UserArticleInteraction.isHidden=true`) are excluded.
- If `limit > MAX_ITEMS`, respond with 400 `PAGINATION_LIMIT_EXCEEDED`.

## DELETE /articles/:objectId

Hides an article for the authenticated user (soft delete).

**Auth**: required

**Response (200)**

```json
{
  "objectId": "123",
  "isHidden": true
}
```

Notes:

- This does not delete from the shared articles collection.
- It upserts a per-user interaction record to persist the hidden state.
