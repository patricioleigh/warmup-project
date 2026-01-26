# API Contracts

This feature does not introduce new public endpoints. Existing endpoints keep the same request/response contracts.

## Existing Endpoints (unchanged)

- `GET /api/v1/articles`
- `DELETE /api/v1/articles/:objectId`

## Behavioral Notes

- Responses must remain consistent with pagination, limits, and error contracts.
- Cache usage is an internal optimization and must not alter API payloads.
