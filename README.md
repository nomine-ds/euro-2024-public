# ⚽ Euro 2024 Context Zone

> **Interactive tactical analysis platform powered by StatsBomb 360 data.**
> A full-stack football analytics application that turns passive viewers into active tactical analysts.

![Frontend](https://img.shields.io/badge/frontend-Next.js%2016-000000)
![Backend](https://img.shields.io/badge/backend-Supabase%20Edge%20Function-3ECF8E)
![Database](https://img.shields.io/badge/database-Supabase%20Postgres%20%2B%20pgvector-3ECF8E)
![Hosting](https://img.shields.io/badge/hosting-Vercel-000000)
![Data](https://img.shields.io/badge/data-StatsBomb%20360-blueviolet)
![Bot](https://img.shields.io/badge/RAG-Gemini%203.6%20Flash-blue)

---

## 🚦 Deployment Status (Updated Oct 2026)

**Arsitektur production berbeda dari development lokal.** Repository ini sudah bermigrasi dari FastAPI ke Supabase Edge Function + Vercel.

| Komponen | Development | Production |
|----------|-------------|------------|
| Frontend | Next.js (local) | **Vercel** — root `frontend/` |
| Backend API | FastAPI (local) | **Supabase Edge Function** (`api`) |
| Database | JSON file | **Supabase Postgres** (RLS aktif, read-only) |
| Vector Store | ChromaDB | **Supabase pgvector** (`event_embeddings`) |
| LLM | Ollama `qwen2.5:3b` | **Gemini 3.6 Flash** (Google AI Studio) |
| Embedding | fastembed MiniLM (384d) | **Gemini Embedding** (768d) |
| Cache | In-memory / Redis | (tidak dipakai di production) |
| RAG Bot | ChromaDB + Ollama | ✅ pgvector + Gemini |

**Production URLs**:
- Frontend: `https://<vercel-url>`
- API: `https://<project-ref>.supabase.co/functions/v1/api`

**Data ter-import**: 51 matches, 187.924 events, 164.530 freeze frames, **821 event embeddings** (12% coverage, backfill bertahap).

---

## 📊 Status Endpoint

### ✅ Tersedia di Production (Supabase Edge Function)

Base URL: `https://<project-ref>.supabase.co/functions/v1/api`
Auth: header `apikey: <publishable-key>`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/matches` | Daftar semua match |
| GET | `/matches/with360` | Match dengan 360 freeze-frames |
| GET | `/match/{id}/has360` | Cek apakah match punya 360 data |
| GET | `/match/{id}/summary` | Scoreline + ringkasan xG |
| GET | `/events/{id}` | Event stream (filter `event_type`) |
| GET | `/360/{event_uuid}` | Posisi freeze-frame untuk satu event |
| GET | `/players` | Daftar player (filter `match_id` / `team_id`, cap 2000) |
| GET | `/player/{id}/summary` | Ringkasan statistik player |
| GET | `/player/{id}/breakdown` | Statistik per-match untuk 1 pemain |
| GET | `/passnetwork/{id}` | Pass network graph per match |
| GET | `/teams` | Daftar tim unik |
| GET | `/compare/teams` | Head-to-head 2 tim |
| GET | `/players/compare` | Bandingkan 2-4 pemain + similarity |
| GET | `/players/bulk` | Bulk stats semua pemain |
| GET | `/players/clustering` | K-Means clustering pemain (4 cluster default) |
| GET | `/matches/similar/{id}` | Cari match dengan pola statistik mirip |
| GET | `/avg_position` | Rata-rata posisi pemain di match |
| GET | `/ghost/{id}` | Position density dari 360 freeze-frames |
| GET | `/tactical/{id}` | Rolling stats + change-point detection |
| GET | `/counterfactual/simulate` | Simulasi ΔxG untuk aksi alternatif |
| GET | `/export/csv` | Export data ke CSV |
| GET | `/bot/health` | Health check + count events ter-embed |
| POST | `/bot/chat` | RAG chatbot (pgvector + Gemini) |

**Coverage: 23 dari 23 endpoint production aktif.** ✅

---

## ✨ Features

### Core Analytics

| # | Module | Description | Production |
|---|--------|-------------|------------|
| 1 | 🧠 **Counterfactual Engine** | Monte Carlo simulation of alternative actions. ΔxG vs actual event. | ✅ |
| 2 | 👁️ **Cognitive Mirror** | Decision Quality (DQ) scoring per event. 4 labels. | ⚠️ Roadmap |
| 3 | 📍 **Position Density** | Spatial crowding score per player from 360 freeze-frames. | ✅ |
| 4 | 📜 **Tactical Timeline** | Rolling match stats (xG / PPDA / Field Tilt) + change-point detection. | ✅ |
| 5 | 🔗 **Pass Network** | Player-to-player pass graph with average pitch positions. | ✅ |
| 6 | 🆚 **Player Comparison** | Side-by-side radar + bar charts for 2-4 players. | ✅ |

### Supporting Features

- 👥 **Player Explorer** — Sortable table of 495+ Euro 2024 players. ✅
- 📊 **Match Similarity** — Find matches with similar statistical patterns. ✅
- 🧩 **Player Clustering** — K-Means clustering by playing style. ✅
- 🤖 **Hudl Bot** — RAG chatbot over 821+ events (pgvector + Gemini). ✅
- 🧪 **Public Data Lab** — Python REPL in browser via Pyodide. ✅

---

## 🛠️ Tech Stack

### Production

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — utility-first styling, dark mode
- **Recharts** — radar / bar / line / area charts
- **SVG Canvas** — custom pitch visualization
- **Supabase Edge Function** (Deno 2.x) — REST API backend
- **Supabase Postgres** — database dengan Row Level Security
- **Supabase pgvector** — vector store untuk RAG bot
- **Gemini 3.6 Flash** — LLM untuk RAG chatbot
- **Gemini Embedding** — 768-dim embeddings
- **Vercel** — frontend hosting + edge network

### Development / Legacy

- **Python 3.12** + **FastAPI** — backend API alternatif
- **Pandas** + **NumPy** — data manipulation
- **scikit-learn** — K-Means clustering
- **ruptures** — PELT change-point detection
- **ChromaDB** — vector store untuk RAG bot (legacy)
- **Ollama** — local LLM (`qwen2.5:3b`)

### Data Pipeline

- 51 match JSON files (~3.300 events each)
- 187.924 total events across Euro 2024
- 51 `three-sixty` frame files (~2.882 frames each)
- Import via `scripts/import_statsbomb_to_supabase.py`
- Embedding via `scripts/embed_events_to_supabase.py` (Gemini)

---

## 📁 Project Structure

```text
euro-2024/
├── frontend/                       # Next.js app (deploy → Vercel)
│   ├── app/                        # Pages (App Router)
│   ├── lib/api.ts                  # Dual-mode API client
│   ├── next.config.ts              # Security headers + CSP
│   └── package.json
│
├── supabase/                       # Supabase backend (production)
│   ├── functions/api/              # Edge Function (Deno)
│   │   ├── index.ts                # Main handler
│   │   ├── lib/                    # core.ts, types.ts, ml.ts
│   │   └── routes/                 # matches, events, players, dll
│   ├── migrations/
│   └── config.toml
│
├── scripts/
│   ├── import_statsbomb_to_supabase.py   # Import JSON → Supabase
│   └── embed_events_to_supabase.py       # Embed events → pgvector
│
├── app/                            # FastAPI backend (LEGACY, dev only)
├── data/                           # StatsBomb JSON (gitignored)
├── docs/SUPABASE_DEPLOYMENT.md
├── tests/
├── README.md
└── requirements.txt
```

---

## 🚀 Production Deployment

### Prerequisites

- Akun [Supabase](https://supabase.com) (Free tier OK)
- Akun [Vercel](https://vercel.com)
- Akun [Google AI Studio](https://aistudio.google.com/apikey) (untuk Gemini API)
- Node.js 20+ + Supabase CLI (`npm install -g supabase`)
- Docker Desktop (untuk bundling Edge Function)

### 1. Setup Supabase

```powershell
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push
supabase functions deploy api --project-ref <PROJECT_REF>
```

### 2. Import Data

```powershell
$env:SUPABASE_URL = "https://<PROJECT_REF>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_..."
python scripts/import_statsbomb_to_supabase.py --data-dir data/raw
```

### 3. Embed Events untuk Bot

```powershell
$env:GEMINI_API_KEY = "AIza..."
python scripts/embed_events_to_supabase.py --mode key
```

Set secret di Edge Function:
```powershell
supabase secrets set GEMINI_API_KEY=$env:GEMINI_API_KEY --project-ref <PROJECT_REF>
```

### 4. Setup Vercel

1. Import repo di [vercel.com/new](https://vercel.com/new)
2. **Root Directory**: `frontend`
3. **Framework Preset**: Next.js
4. **Node.js Version**: 22.x
5. **Environment Variables** (Production + Preview + Development):

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<PROJECT_REF>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `NEXT_PUBLIC_API_BASE` | `/api` |

6. Deploy.

---

## 💻 Local Development

### 1. Clone & Install

```powershell
git clone https://github.com/nomine-ds/euro-2024-public.git
cd euro-2024-public

cd frontend
npm install
cd ..
```

### 2. Frontend dengan Supabase Production

```powershell
cd frontend
Copy-Item .env.example .env.local
# Edit .env.local dengan 3 var Supabase
npm run dev
# → http://localhost:3000
```

### 3. Backend Legacy (Opsional)

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

---

## 🤖 Bot Usage

### Query Example

```powershell
$key = "<publishable-key>"
$base = "https://<PROJECT_REF>.supabase.co/functions/v1/api"

$body = @{ query = "Siapa yang mencetak gol di Jerman vs Skotlandia?" } | ConvertTo-Json
Invoke-RestMethod -Uri "$base/bot/chat" -Method POST `
  -Headers @{ apikey = $key; "Content-Type" = "application/json" } `
  -Body $body
```

### Query yang Bisa Dijawab (Coverage Sekarang)

- ✅ "Siapa yang mencetak gol di [match Group Stage]?"
- ✅ "Kartu kuning untuk siapa di [match]?"
- ✅ "Substitusi apa saja di [match]?"
- ⚠️ "Siapa yang mencetak gol di final?" (perlu backfill)

### Backfill Events

Gemini free tier = 1000 req embedding/hari. Untuk coverage penuh:

```powershell
python scripts/embed_events_to_supabase.py --mode key
```

Jalankan harian, atau enable billing Google Cloud (~$0.02 sekali) untuk selesaikan dalam 5 menit.

---

## 🗄️ Database Schema

### Tables

**`public.matches`** — 51 rows (match_id, match_date, home_team, away_team, home_score, away_score, has_360)

**`public.events`** — 187.924 rows (event_id, match_id, event_type, timestamp, player_name, team_name, location, shot_xg, pass_xg, dll)

**`public.freeze_frames`** — 164.530 rows (event_id, match_id, ball_location, players)

**`public.event_embeddings`** — 821 rows (event_id, content, metadata, embedding halfvec 768-dim)

### Functions

- `match_stats_all()` — agregasi statistik per match
- `player_stats_all()` — agregasi statistik per player
- `search_event_embeddings()` — vector similarity search dengan filter metadata

### Row Level Security

- RLS aktif di semua tabel
- Policy `SELECT` untuk role `anon` + `authenticated` (read-only)
- Service role key hanya untuk import lokal

---

## 🧪 Testing

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

- **RAG Bot** jalan dengan **Supabase pgvector + Gemini 3.6 Flash**. Coverage saat ini 821 events (~12%). Backfill bertahap.
- **`/players` tanpa filter** di-cap 2000 rows untuk hindari timeout.
- **Free tier Supabase** mendekati batas 500 MB.
- **Gemini free tier** = 1000 request embedding/hari.
- **`/cognitive/{id}`** belum dimigrasi (roadmap).

---

## 🎓 Data Source & Credits

- **StatsBomb Open Data** — [github.com/statsbomb/open-data](https://github.com/statsbomb/open-data)
- Licensed for public use. Euro 2024: 51 matches, 187.924 events.

---

## 📝 License

MIT License — lihat [LICENSE](./LICENSE). Data © StatsBomb.

---

**Built with** ❤️ **using StatsBomb Open Data, Next.js, Supabase, and Gemini.**