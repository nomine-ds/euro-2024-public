# Euro 2024 frontend

This Next.js app uses Supabase Edge Functions through the same-origin `/api`
proxy. Set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` for development and in
Vercel for each deployment environment. The publishable key is public by
design; database writes remain blocked by row-level security.

## Local development

From this directory:

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` before starting the app. Apply the Supabase
migration and import the StatsBomb data before using the API. See
[`../docs/SUPABASE_DEPLOYMENT.md`](../docs/SUPABASE_DEPLOYMENT.md) for setup.

## Checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
```
