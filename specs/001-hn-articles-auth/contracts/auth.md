# Auth API (v1)

Base path: `/api/v1`

## POST /auth/register

Creates a user account.

**Request**

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

**Response (201)**

```json
{
  "userId": "..."
}
```

## POST /auth/login

Authenticates a user and returns an access token.

**Request**

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

**Response (200)**

```json
{
  "accessToken": "eyJ..."
}
```

## Authentication header

Protected endpoints require:

`Authorization: Bearer <accessToken>`
