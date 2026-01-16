# Quickstart: Personalized HN Articles Feed

## Prerequisites

- Docker + Docker Compose

## Configure environment

Provide required environment variables (example values):

- Server:
  - `PORT=3001`
  - `MONGO_URI=mongodb://...`
  - `JWT_SECRET=...`
  - `MAX_ITEMS=100`
  - `MAX_RESPONSE_BYTES=...`
- Client:
  - `NEXT_PUBLIC_API_BASE=http://localhost:3001/api/v1`

## Run with Docker Compose

- Start services:
  - `docker compose up --build`
- Verify health:
  - `GET /health/live`
  - `GET /health/ready`

## First-time usage flow

1. Register a user (see `contracts/auth.md`)
2. Login to obtain a token
3. Load the client UI and confirm articles list loads newest-first
4. Hide an article and confirm it stays hidden after refresh/restart

## Troubleshooting

- If the articles list is empty initially, wait for the hourly ingest or trigger a manual sync endpoint
  (if enabled in non-production environments).
- Use `requestId` from responses to locate matching server logs.
