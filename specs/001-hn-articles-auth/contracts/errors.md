# API Error Contract (v1)

All error responses MUST follow this shape:

```json
{
  "errorId": "01H...",
  "code": "VALIDATION_FAILED",
  "message": "Human-safe description",
  "timestamp": "2026-01-15T00:00:00.000Z",
  "path": "/api/v1/articles",
  "requestId": "req_...",
  "status": 400
}
```

## Stable error codes (minimum)

- `VALIDATION_FAILED`
- `PAGINATION_LIMIT_EXCEEDED`
- `INVALID_QUERY_FIELD`
- `RATE_LIMITED`
- `AUTH_INVALID_TOKEN`
- `FORBIDDEN`
- `DEPENDENCY_TIMEOUT`
- `RESPONSE_TOO_LARGE`
- `INTERNAL_ERROR`
