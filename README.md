# ⚽ Euro 2024 Context Zone

> **Interactive tactical analysis platform powered by StatsBomb 360 data.**
> A full-stack football analytics application that turns passive viewers into active tactical analysts.

![Frontend](https://img.shields.io/badge/frontend-Next.js%2016-000000)
![Backend](https://img.shields.io/badge/backend-Supabase%20Edge%20Function-3ECF8E)
![Database](https://img.shields.io/badge/database-Supabase%20Postgres-3ECF8E)
![Hosting](https://img.shields.io/badge/hosting-Vercel-000000)
![Data](https://img.shields.io/badge/data-StatsBomb%20360-blueviolet)

---

## 🚦 Deployment Status (Updated Oct 2026)

**Arsitektur production berbeda dari development lokal.** Repository ini sedang dalam proses migrasi bertahap dari FastAPI ke Supabase Edge Function.

| Komponen | Development | Production |
|----------|-------------|------------|
| Frontend | Next.js (local) | **Vercel** — root `frontend/` |
| Backend API | FastAPI (local) | **Supabase Edge Function** (`api`) |
| Database | JSON file | **Supabase Postgres** (RLS aktif, read-only) |
| Cache | In-memory / Redis | (tidak dipakai di production) |
| RAG Bot | ChromaDB + Ollama | ❌ Belum dimigrasi |
| Data | `data/raw/*.json` | Supabase Postgres |

**Production URLs** (ganti `<vercel-url>` dengan URL deployment kamu):
- Frontend: `https://<vercel-url>`
- API: `https://<project-ref>.supabase.co/functions/v1/api`

**Data ter-import**: 51 matches, 187.924 events, 164.530 freeze frames.

---

## 📊 Status Endpoint

### ✅ Tersedia di Production (Supabase Edge Function)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/matches` | Daftar semua match |
| GET | `/matches/with360` | Match dengan 360 freeze-frames |
| GET | `/match/{match_id}/has360` | Cek apakah match punya 360 data |
| GET | `/match/{match_id}/summary` | Scoreline + ringkasan xG |
| GET | `/events/{match_id}` | Event stream (bisa difilter `event_type`) |
| GET | `/360/{event_uuid}` | Posisi freeze-frame untuk satu event |
| GET | `/players` | Daftar player (filter `match_id` / `team_id`, cap 2000) |
| GET | `/player/{player_id}/summary` | Ringkasan statistik player |
| GET | `/passnetwork/{match_id}` | Pass network graph per match |

### ❌ Belum Dimigrasi (Return 501 di Production)

Endpoint berikut masih di FastAPI dan **tidak jalan** di production Supabase:

| Endpoint | Router Legacy |
|----------|---------------|
| `/bot/chat`, `/bot/health`, `/bot/reindex` | `bot.py` |
| `/teams`, `/compare/teams`, `/players/compare` | `analytics.py` |
| `/matches/similar/{id}`, `/players/clustering` | `analytics.py` |
| `/players/bulk`, `/player/{id}/breakdown` | `players.py` |
| `/tactical/{id}` | `tactical.py` |
| `/ghost/{id}` | `ghost.py` |
| `/cognitive/{id}` | `cognitive.py` |
| `/counterfactual/simulate` | `counterfactual.py` |
| `/export/csv` | `export.py` |

Untuk mengaktifkan fitur-fitur ini di production, deploy FastAPI backend terpisah (lihat [Legacy Backend](#-legacy-backend-fastapi)).

---

## ✨ Features

### Core Analytics

| # | Module | Description | Production |
|---|--------|-------------|------------|
| 1 | 🧠 **Counterfactual Engine** | Monte Carlo simulation of alternative actions (`pass` / `shoot` / `dribble`). ΔxG vs actual event. | ❌ 501 |
| 2 | 👁️ **Cognitive Mirror** | Decision Quality (DQ) scoring per event. 4 labels: Excellent / Neutral / Under Pressure / Mistake. | ❌ 501 |
| 3 | 📍 **Position Density** | Spatial crowding score per detected player from 360 freeze-frames. | ❌ 501 |
| 4 | 📜 **Tactical Timeline** | Rolling match stats (xG / PPDA / Field Tilt) + PELT change-point detection. | ❌ 501 |
| 5 | 🔗 **Pass Network** | Player-to-player pass graph with average pitch positions. | ✅ |
| 6 | 🆚 **Player Comparison** | Side-by-side radar + bar charts for 2–4 players. | ❌ 501 |

### Supporting Features

- 👥 **Player Explorer** — Sortable table of 495+ Euro 2024 players. (✅ via `/players`)
- 📊 **Match Similarity** — Find matches with similar statistical patterns. (❌ 501)
- 🧩 **Player Clustering** — K-Means clustering by playing style. (❌ 501)
- 🤖 **Hudl Bot** — RAG chatbot over 187.924 events. (❌ 501)
- 🧪 **Public Data Lab** — Python REPL in browser via Pyodide. (client-side, ✅)

---

## 🛠️ Tech Stack

### Production

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — utility-first styling, dark mode
- **Recharts** — radar / bar / line / area charts
- **SVG Canvas** — custom pitch visualization
- **Supabase Edge Function** (Deno) — REST API backend
- **Supabase Postgres** — database dengan Row Level Security
- **Vercel** — frontend hosting + edge network

### Development / Legacy

- **Python 3.12** + **FastAPI** — backend API alternatif
- **Pandas** + **NumPy** — data manipulation
- **scikit-learn** — K-Means clustering
- **ruptures** — PELT change-point detection
- **SciPy** — Hungarian matching
- **ChromaDB** — vector store untuk RAG bot
- **Ollama** — local LLM (`qwen2.5:3b`)

### Data Pipeline

- 51 match JSON files (~3.300 events each)
- 187.924 total events across Euro 2024
- 51 `three-sixty` frame files (~2.882 frames each)
- Import via `scripts/import_statsbomb_to_supabase.py`

---

## 📁 Project Structure

```text
euro-2024/
├── frontend/                       # Next.js app (deploy → Vercel)
│   ├── app/
│   │   ├── page.tsx                # Home
│   │   ├── api/[...path]/route.ts  # Proxy → Supabase Edge Function
│   │   ├── cognitive/[matchId]/    # Cognitive Mirror
│   │   ├── tactical/[id]/          # Tactical Timeline
│   │   ├── ghost/[id]/             # Position Density
│   │   ├── passnetwork/[matchId]/  # Pass Network
│   │   ├── player/[id]/            # Player detail
│   │   ├── player-comparison/      # Compare players
│   │   ├── counterfactual/         # Counterfactual engine
│   │   ├── players/                # Player explorer
│   │   ├── clusters/               # K-Means clusters
│   │   ├── match-similarity/       # Match similarity
│   │   ├── match/[id]/             # Match detail
│   │   ├── bot/                    # Hudl Bot UI
│   │   ├── lab/                    # Pyodide data lab
│   │   └── components/             # Navbar, Footer, dll
│   ├── lib/
│   │   └── api.ts                  # Dual-mode API client (client + server)
│   ├── next.config.ts              # Security headers
│   ├── postcss.config.mjs          # Tailwind v4
│   └── package.json
│
├── supabase/                       # Supabase backend (production)
│   ├── functions/api/index.ts      # Edge Function (Deno)
│   ├── migrations/
│   │   └── 20261007000000_create_public_data.sql
│   └── config.toml
│
├── scripts/
│   └── import_statsbomb_to_supabase.py   # Import data ke Supabase
│
├── app/                            # FastAPI backend (LEGACY, dev only)
│   ├── main.py
│   ├── routers/                    # 12 feature routers
│   ├── core/config.py
│   ├── data/loader.py
│   └── services/
│       ├── counterfactual.py
│       └── rag_bot.py
│
├── data/
│   ├── raw/                        # StatsBomb JSON (gitignored)
│   │   ├── matches.json
│   │   ├── match_{id}.json
│   │   └── three-sixty/{match_id}.json
│   └── chroma_db/                  # ChromaDB index (gitignored)
│
├── docs/
│   └── SUPABASE_DEPLOYMENT.md      # Detail deployment Supabase
│
├── tests/                          # Backend tests
├── conftest.py
├── pytest.ini
├── README.md
├── AUDIT_REPORT.md
├── .env.example
├── requirements.txt
└── Dockerfile                      # Untuk legacy FastAPI
```

---

## 🚀 Production Deployment

### Prerequisites

- Akun [Supabase](https://supabase.com) (Free tier OK, tapi data ~380 MiB mendekati limit 500 MB)
- Akun [Vercel](https://vercel.com)
- Akun GitHub dengan akses ke repo ini
- Node.js 20+ (untuk Supabase CLI)
- Supabase CLI (`npm install -g supabase`)

### 1. Setup Supabase

```powershell
# Login & link ke project
supabase login
supabase link --project-ref <PROJECT_REF>

# Push migrasi (buat tabel + RLS policy)
supabase db push

# Deploy Edge Function
supabase functions deploy api --project-ref <PROJECT_REF>
```

Dapatkan **Project URL** dan **Publishable key** dari Supabase Dashboard → Settings → API.

### 2. Import Data

Set environment variable (sesi PowerShell ini saja):

```powershell
$env:SUPABASE_URL = "https://<PROJECT_REF>.supabase.co"
# Set SUPABASE_SERVICE_ROLE_KEY via file .env.import (jangan paste ke chat)
python scripts/import_statsbomb_to_supabase.py --data-dir data/raw
```

⚠️ **Service role key HANYA untuk import lokal.** Jangan pernah taruh di Vercel atau variable `NEXT_PUBLIC_*`.

### 3. Setup Vercel

1. Buka [vercel.com/new](https://vercel.com/new) → import repo ini
2. **Root Directory**: `frontend` (WAJIB)
3. **Framework Preset**: Next.js (auto)
4. **Node.js Version**: 22.x
5. **Environment Variables** (Production + Preview + Development):

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<PROJECT_REF>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...` atau `eyJ...`) |
| `NEXT_PUBLIC_API_BASE` | `/api` |

6. Deploy.

### Verifikasi

```powershell
# Test Edge Function langsung
$key = "<publishable-key>"
$base = "https://<PROJECT_REF>.supabase.co/functions/v1/api"
Invoke-RestMethod -Uri "$base/matches" -Headers @{ apikey = $key } | Select-Object -First 3

# Test via Vercel proxy
Invoke-RestMethod -Uri "https://<vercel-url>/api/matches" | Select-Object -First 3
```

---

## 💻 Local Development

### Prasyarat

- Python 3.12
- Node.js 20+
- Git

### 1. Clone & Install

```powershell
git clone https://github.com/nomine-ds/euro-2024-public.git
cd euro-2024-public

# Backend (opsional, untuk fitur legacy)
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt

# Frontend
cd frontend
npm install
cd ..
```

### 2. Frontend dengan Supabase (Recommended)

Cara paling simple — frontend langsung konek ke Supabase production:

```powershell
cd frontend
Copy-Item .env.example .env.local
# Edit .env.local, isi:
#   NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
#   NEXT_PUBLIC_API_BASE=/api
npm run dev
# → http://localhost:3000
```

### 3. Backend Legacy (FastAPI) — Untuk Fitur yang Belum Dimigrasi

Hanya perlu jika kamu mau mengembangkan endpoint yang belum ada di Edge Function (`/bot`, `/analytics`, dll).

```powershell
Copy-Item .env.example .env
# Edit .env, set CACHE_API_KEY ke unique secret

# Load data sekali (download StatsBomb, ~5 menit)
uvicorn app.main:app --reload
# Di terminal lain: curl http://127.0.0.1:8000/load

# Untuk pakai FastAPI sebagai backend frontend, ubah frontend/.env.local:
#   NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
```

### 4. Run Tests

```powershell
# Backend
pytest tests/ -v

# Frontend
cd frontend
npm test
npm run lint
npm run typecheck
```

---

## 🔌 API Endpoints (Reference)

### Production (Supabase Edge Function)

Lihat [Status Endpoint](#-status-endpoint) di atas.

Base URL: `https://<PROJECT_REF>.supabase.co/functions/v1/api`
Auth: header `apikey: <publishable-key>`

### Legacy (FastAPI) — 29 Endpoints

<details>
<summary>Klik untuk expand daftar lengkap</summary>

#### System — `system.py`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check + total events |
| GET | `/load` | Force reload dari StatsBomb Open Data |

#### Matches — `matches.py`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/matches` | List all matches |
| GET | `/matches/with360` | Matches with 360 freeze-frames |
| GET | `/match/{match_id}/has360` | Check if match has 360 data |
| GET | `/match/{match_id}/summary` | Scoreline + xG summary |

#### Events — `events.py`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events/{match_id}` | Full event stream (filterable) |
| GET | `/360/{event_uuid}` | Freeze-frame positions |
| GET | `/avg_position` | Average pitch position per player |
| GET | `/debug/{event_uuid}` | Raw event dict (NaN-sanitized) |

#### Players — `players.py`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/players` | All players (filterable) |
| GET | `/players/bulk` | Bulk stats (cached) |
| GET | `/player/{player_id}/summary` | Player season summary |
| GET | `/player/{player_id}/breakdown` | Per-match breakdown |

#### Analytics — `analytics.py`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teams` | All teams (cached) |
| GET | `/compare/teams?team_ids=1,2` | Head-to-head comparison |
| GET | `/players/compare?ids=1,2,3` | Compare 2–4 players |
| GET | `/matches/similar/{match_id}` | Similar matches |
| GET | `/players/clustering?n_clusters=4` | K-Means clusters |

#### Advanced Analytics

| Method | Endpoint | Router |
|--------|----------|--------|
| GET | `/counterfactual/simulate` | `counterfactual.py` |
| GET | `/cognitive/{match_id}` | `cognitive.py` |
| GET | `/ghost/{match_id}` | `ghost.py` |
| GET | `/tactical/{match_id}` | `tactical.py` |
| GET | `/passnetwork/{match_id}` | `passnetwork.py` |

#### Export & Bot

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/export/csv` | CSV export |
| POST | `/bot/chat` | Chat with Hudl Bot |
| GET | `/bot/health` | Bot status |
| POST | `/bot/reindex` | Rebuild vector store |
| POST | `/admin/cache/invalidate` | Invalidate cache (X-API-Key) |

</details>

---

## 🧰 Legacy Backend (FastAPI)

> **Note**: Section ini untuk deployment FastAPI ke Railway. Production sekarang **sudah pindah ke Supabase Edge Function**. Railway hanya diperlukan kalau mau mengaktifkan endpoint yang belum dimigrasi.

### Deployment Layout

- **Vercel** serves Next.js dari `frontend/`
- **Railway** serves FastAPI backend dari root repo (pakai `Dockerfile`)
- **Upstash Redis** untuk shared API cache (opsional)
- **Ollama** endpoint untuk RAG bot (opsional)

### Railway Setup

1. Buat service dari repo yang sama, root = repository root
2. Attach persistent volume di `/app/data`
3. Set env vars:

| Variable | Value |
|----------|-------|
| `APP_ENV` | `production` |
| `BACKEND_INTERNAL_URL` | Railway origin (set di Vercel) |
| `CORS_ORIGINS` | Empty (pakai same-origin proxy) |
| `CACHE_API_KEY` | Strong secret |
| `REDIS_URL` | Upstash TLS URL |
| `DATA_DIR` | `/app/data/raw` |
| `CHROMA_DB_PATH` | `/app/data/chroma_db` |
| `OLLAMA_HOST` | Ollama endpoint |

4. Deploy, lalu run `python -m app.data.loader` di Railway shell
5. Untuk RAG: `python index_bot.py` (setelah backup volume)

### Docker Compose (Local)

```powershell
# Set CACHE_API_KEY dulu
docker compose up --build
# Web: http://localhost:3000, API: http://localhost:8000

# Dengan bot profile
docker compose --profile bot up --build -d
docker compose exec ollama ollama pull qwen2.5:3b
```

---

## 🔐 Environment Variables

### Vercel (Production / Preview / Development)

| Key | Value | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Public, aman |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key | Public, aman |
| `NEXT_PUBLIC_API_BASE` | `/api` | Same-origin proxy |

⚠️ **JANGAN pernah** taruh di Vercel:
- `SUPABASE_SERVICE_ROLE_KEY`
- `sb_secret_*` key apapun
- `REDIS_URL`, `CACHE_API_KEY`, `OLLAMA_HOST`
- LLM credentials

### Local `.env` (Backend Legacy)

Lihat `.env.example`. **Jangan commit `.env`** — sudah ada di `.gitignore`.

### Local `frontend/.env.local`

Lihat `frontend/.env.example`.

---

## 🗄️ Database Schema (Supabase)

Dibuat via `supabase/migrations/20261007000000_create_public_data.sql`.

### Tables

**`public.matches`**
| Column | Type | Notes |
|--------|------|-------|
| `match_id` | `bigint` | Primary key |
| `match_date` | `date` | |
| `home_team` | `text` | |
| `away_team` | `text` | |
| `home_team_id` | `bigint` | |
| `away_team_id` | `bigint` | |
| `home_score` | `integer` | |
| `away_score` | `integer` | |
| `has_360` | `boolean` | |

**`public.events`** — ~187k rows. Primary key `event_id` (uuid). FK ke `matches`. Index di `match_id`, `player_id`, `event_type`.

**`public.freeze_frames`** — ~164k rows. Primary key `event_id` (uuid). FK ke `events` + `matches`. Kolom `ball_location` (jsonb), `players` (jsonb).

### View

**`public.player_directory`** — `security_invoker = true`, DISTINCT player from events.

### Row Level Security

- RLS aktif di ketiga tabel
- Policy `SELECT` untuk role `anon` + `authenticated` (read-only)
- Tidak ada policy `INSERT` / `UPDATE` / `DELETE`

### Kapasitas

Free tier Supabase = 500 MB. Data kamu ~380 MiB payload → kemungkinan 480–550 MB setelah overhead. Monitoring di Dashboard → Settings → Billing.

---

## 🧪 Testing & Code Quality

- **Backend tests**: `tests/` — unit + data-backed API smoke tests
- **Frontend tests**: Vitest untuk API client & proxy route
- **CI**: GitHub Actions — test, lint, typecheck, build, secret scanning
- **Audit trail**: lihat [`AUDIT_REPORT.md`](./AUDIT_REPORT.md)

```powershell
# Backend
pytest tests/ -v

# Frontend
cd frontend
npm test
npm run lint
npm run typecheck
npm run build
```

---

## 🚧 Known Limitations

- **RAG Bot** tidak jalan di production (butuh ChromaDB + Ollama). Perbaikan direncanakan via Supabase Vector + external LLM API.
- **Analytics, Tactical, Cognitive, Counterfactual, Ghost, Export** — masih di FastAPI, belum dimigrasi ke Edge Function.
- **`/players` tanpa filter** di-cap 2000 rows untuk hindari statement timeout. Pakai `?match_id=X` untuk hasil lengkap.
- **Free tier Supabase** mendekati batas 500 MB. Kalau mau import data baru, cek kapasitas dulu.
- **Docker indexing** belum diverifikasi end-to-end (Docker CLI tidak tersedia di env dev).

---

## 🎓 Data Source & Credits

- **StatsBomb Open Data** — [github.com/statsbomb/open-data](https://github.com/statsbomb/open-data)
- Licensed for public use. Semua event data (xG, freeze-frames, coordinates) dari StatsBomb.
- Euro 2024: 51 matches, 187.924 events.

---

## 📝 License

MIT License — lihat [LICENSE](./LICENSE) untuk detail.
Data © StatsBomb — digunakan di bawah Open Data terms.

---

## 🤝 Contributing

Portfolio project. Saran via issues atau PR.

---

**Built with** ❤️ **using StatsBomb Open Data, Next.js, and Supabase.**