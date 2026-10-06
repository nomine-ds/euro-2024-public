# Euro 2024 frontend

This Next.js app uses the backend through the same-origin `/api` proxy. During
local development, set `BACKEND_INTERNAL_URL` in `.env.local` to the FastAPI
origin. Set the same server-only variable in Vercel for each deployment
environment. Browser requests continue to use `/api`; do not expose the
backend origin through a `NEXT_PUBLIC_*` variable.

## Local development

From this directory:

```sh
npm ci
npm run dev
```

The backend must be running separately. Copy `.env.example` to `.env.local`
before starting the app. See the root README for deployment and data loading
instructions.

## Checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
```
