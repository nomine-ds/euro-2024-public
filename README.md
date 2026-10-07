# Euro 2024 Public

Tactical analytics platform for UEFA Euro 2024, built on StatsBomb 360 data.
Provides pass networks, player comparison, clustering, and counterfactual simulations.

Live: https://euro-2024-public-frontend.vercel.app

## Stack

- Next.js 14 + TypeScript + Tailwind (frontend)
- Supabase Edge Functions (backend)
- PostgreSQL + pgvector (database)
- Google Gemini 1.5 Flash + text-embedding-004 (AI)

## Requirements

- Node.js 18+
- pnpm
- Docker Desktop (for local Supabase)
- Supabase CLI

## Setup

    git clone https://github.com/nomine-ds/euro-2024-public.git
    cd euro-2024-public/frontend
    pnpm install
    cp ../.env.example .env.local
    pnpm dev

Start local Supabase (requires Docker running):

    supabase start
    supabase functions serve

## Environment

frontend/.env.local:

    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=
    SUPABASE_SERVICE_ROLE_KEY=
    GOOGLE_AI_API_KEY=

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /matches | List matches |
| GET | /players | List players |
| GET | /players/{id}/stats | Player stats |
| POST | /players/compare | Compare 2-4 players |
| POST | /players/cluster | Cluster players |
| POST | /counterfactual | Simulate delta xG |
| GET | /health | Health check |

Full list in supabase/functions/.

## Data

    python scripts/import_matches.py
    python scripts/embed_events.py

## Deploy

    supabase functions deploy
    supabase db push
    cd frontend && vercel --prod

## License

MIT