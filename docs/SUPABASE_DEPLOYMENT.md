# Supabase and Vercel deployment

The frontend runs on Vercel. The migrated read API and match data run on
Supabase. FastAPI remains in the repository during this staged migration, but
Vercel no longer requires a FastAPI service for endpoints implemented by the
Supabase Edge Function.

## Supabase setup

1. Create a Supabase project and install the Supabase CLI.
2. From the repository root, link the project and apply the database migration:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

3. Deploy the API Edge Function:

   ```sh
   supabase functions deploy api
   ```

   JWT verification is disabled for this intentionally public, read-only API.
   The function uses Supabase's built-in anonymous role, and row-level security
   permits reads but does not permit writes. Do not add mutation endpoints
   without adding authentication and authorization first.

4. Import the local StatsBomb data. `data/raw` is ignored by Git, so it must
   exist on the machine running the import. Use the service role key only in
   this trusted local process. Never use it in Vercel or a `NEXT_PUBLIC_*`
   variable.

   PowerShell:

   ```powershell
   $env:SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY = "YOUR_SERVICE_ROLE_KEY"
   python scripts/import_statsbomb_to_supabase.py --data-dir data/raw
   ```

   The importer is repeatable and upserts matches, events, and 360 freeze
   frames. The local dataset preflight measured about 86 MiB of event rows and
   295 MiB of freeze-frame rows before database storage overhead. Confirm
   available Supabase database capacity before importing. If the source data
   changes, clear stale rows before reimporting because upsert does not delete
   records missing from the new files.

## Vercel setup

1. Import the repository into Vercel and set **Root Directory** to `frontend`.
2. Add these variables to the Vercel environments that will serve the app:

   - `NEXT_PUBLIC_SUPABASE_URL`: `https://YOUR_PROJECT_REF.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the project's publishable key
   - `NEXT_PUBLIC_API_BASE`: `/api`

3. Redeploy after setting variables. The Next.js `/api/*` route forwards to the
   `api` Supabase Edge Function and supplies the public publishable key. The
   service role key must not be configured in Vercel.

For local frontend development, copy `frontend/.env.example` to
`frontend/.env.local` and fill in the same public Supabase values.

The optional Docker frontend also needs the two public Supabase variables in
the root `.env` file before running Compose. It no longer uses
`BACKEND_INTERNAL_URL`.

## Current migration scope

The Supabase function currently implements match listing and summaries, event
listing, 360 freeze frames, player listing and summaries, and pass networks.
Other endpoints return HTTP 501 until migrated. This includes model-dependent
bot and clustering work, and the remaining analytics/export endpoints. Do not
consider those features available on the Supabase deployment yet.

The legacy FastAPI backend, Redis cache, and local data loader have not been
deleted. Remove them only after endpoint parity, data-import validation, and
production smoke tests are complete. No project secrets or data files are
committed as part of this deployment setup.
