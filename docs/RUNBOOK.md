# Runbook

## Runtime environment

- Set `APP_ENV` to `development` for local work and to `production` for deployed environments.
- In production, the FastAPI docs endpoints are intentionally disabled to avoid exposing the schema publicly.
- Use environment secrets and deploy secrets rather than committing `.env` files.

## Health checks

- Backend health: `GET /`
- Docs: enabled only when `APP_ENV != production`
- OpenAPI: enabled only when `APP_ENV != production`

## Cache

- Shared cache keys live under the base namespace: `player:base`, `team:base`, and `match:base`.
- Each entry is cached for 600 seconds (TTL) and re-used across endpoints that depend on the same underlying dataset.
- Single-flight protection ensures only one compute runs at a time for a given key, even when multiple requests arrive together.
- Invalidation is available via `POST /admin/cache/invalidate` with the `X-API-Key` header. Examples:
  - `{"keys": ["player:base"]}` invalidates a specific key
  - `{"all": true}` clears all cached entries
- Cache entries are refreshed automatically when they expire; manual invalidation is only needed for immediate refreshes during deployment or debugging.

## Deployment note

- If you need interactive API documentation in a non-production environment, start the service with `APP_ENV=development`.
- If the app is running in production, confirm `/docs` and `/openapi.json` return `404`.
