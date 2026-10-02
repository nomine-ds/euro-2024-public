# Runbook

## Runtime environment

- Set `APP_ENV` to `development` for local work and to `production` for deployed environments.
- In production, the FastAPI docs endpoints are intentionally disabled to avoid exposing the schema publicly.
- Use environment secrets and deploy secrets rather than committing `.env` files.

## Health checks

- Backend health: `GET /`
- Docs: enabled only when `APP_ENV != production`
- OpenAPI: enabled only when `APP_ENV != production`

## Deployment note

- If you need interactive API documentation in a non-production environment, start the service with `APP_ENV=development`.
- If the app is running in production, confirm `/docs` and `/openapi.json` return `404`.
