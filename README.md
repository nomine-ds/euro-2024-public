# ⚽ Euro 2024 Public — Tactical Analytics Platform

> An open, interactive tactical analytics platform for **UEFA Euro 2024**, powered by **StatsBomb 360** event data. Explore pass networks, cognitive mirror views, counterfactual simulations, and advanced analytics across all **51 matches** of the tournament.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)](https://euro-2024-public-frontend.vercel.app/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Edge%20Functions-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/nomine-ds/euro-2024-public/pulls)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [API Endpoints](#-api-endpoints)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Environment Variables](#environment-variables)
- [Deployment](#-deployment)
- [Data Pipeline](#-data-pipeline)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [Code Style](#-code-style)
- [Roadmap](#-roadmap)
- [FAQ](#-faq)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)
- [Contact](#-contact)

---

## 🎯 Overview

**Euro 2024 Public** is an open-source analytics platform that transforms raw **StatsBomb 360** event data into intuitive, interactive tactical insights for UEFA Euro 2024. It is designed for coaches, analysts, journalists, data scientists, and football enthusiasts who want to go beyond the scoreline.

The platform combines three pillars of modern football analytics:

1. **Spatial analytics** — freeze-frames, position density maps, average positions, and pass networks.
2. **Machine learning** — player clustering, similarity search, and counterfactual simulations.
3. **Natural language interaction** — a Retrieval-Augmented Generation (RAG) chatbot for tactical queries.

Every computation is exposed through a clean REST API (Supabase Edge Functions), consumed by a modern Next.js frontend deployed on Vercel.

---

## 🌐 Live Demo

| Environment       | URL                                                             |
|-------------------|-----------------------------------------------------------------|
| **Frontend**      | https://euro-2024-public-frontend.vercel.app/                   |
| **Repository**    | https://github.com/nomine-ds/euro-2024-public                   |
| **API Base URL**  | `https://<your-project>.supabase.co/functions/v1`               |

---

## ✨ Key Features

### 🔷 Match Analytics
- Browse all **51 matches** of Euro 2024 with teams, scores, stage, and venue metadata.
- Query per-match statistics, event timelines, and 360 freeze-frame data.
- Discover matches with statistically similar patterns using similarity search.

### 🔷 Player Analytics
- Detailed player profiles with heatmaps and position distributions.
- Side-by-side comparison of **2 to 4 players** with cosine similarity scores.
- **K-Means clustering** to group players by playing style.
- Per-match breakdowns for any individual player across the tournament.

### 🔷 Tactical Visualizations
- **Pass networks** showing average positions and link volumes between players.
- **Position density** heatmaps derived from 360 freeze-frames.
- **Cognitive mirror** view for contrasting tactical setups between two teams.
- **Counterfactual engine** for simulating alternative actions and estimating ΔxG.

### 🔷 AI Chatbot (RAG)
- Ask questions in natural language about matches, players, and tactics.
- Retrieval-Augmented Generation powered by **Google Gemini 1.5 Flash**.
- Vector embeddings via Google `text-embedding-004` stored in `pgvector`.

### 🔷 Open & Extensible
- Fully typed TypeScript API client.
- Modular Edge Functions — add your own endpoints easily.
- MIT-licensed — fork, remix, and build on top.

---

## 🏗️ Architecture

The production architecture differs from local development. This repository has been **migrated from FastAPI to Supabase Edge Functions + Vercel**.

| Layer          | Development (Local)     | Production                 |
|----------------|-------------------------|----------------------------|
| Backend        | FastAPI (Python)        | Supabase Edge Functions    |
| Cache          | In-memory / Redis       | *(not used in production)* |
| Frontend       | Next.js (local)         | Vercel                     |
| Database       | PostgreSQL + pgvector   | Supabase Postgres          |
| Vector Store   | Local pgvector          | Supabase pgvector          |
| LLM            | Local / Gemini API      | Google AI (Gemini)         |
| Embeddings     | Local model             | Google `text-embedding-004`|

**Data status**:
- ✅ **51 matches** imported
- ✅ **23 of 23** production endpoints active
- 🔄 Gradual backfill of 360 freeze-frames and embeddings in progress

### High-Level Diagram
┌─────────────────┐ ┌──────────────────────┐
│ Next.js App │ ───▶ │ Supabase Edge Fn │
│ (Vercel) │ │ (Deno runtime) │
└────────┬────────┘ └──────────┬───────────┘
│ │
│ ▼
│ ┌──────────────────────┐
│ │ PostgreSQL │
└────────────────▶│ + pgvector │
└──────────┬───────────┘
│
▼
┌──────────────────────┐
│ Google AI (Gemini) │
└──────────────────────┘

text

---

## 🔌 API Endpoints

All endpoints are served by Supabase Edge Functions on the Deno runtime.

| Method | Endpoint                         | Description                                             |
|--------|----------------------------------|---------------------------------------------------------|
| GET    | `/matches`                       | List all matches                                        |
| GET    | `/matches/{id}/360`              | Check if a match has 360 data                           |
| GET    | `/events/{id}/freeze-frame`      | Freeze-frame position for one event                     |
| GET    | `/players`                       | List players (filter `match_id` / `team_id`, cap 2000)  |
| GET    | `/players/{id}/stats`            | Player statistics summary                               |
| GET    | `/players/{id}/per-match`        | Per-match statistics for one player                     |
| GET    | `/teams`                         | List unique teams                                       |
| POST   | `/players/compare`               | Compare 2–4 players + similarity                        |
| POST   | `/players/cluster`               | K-Means clustering of players (4 clusters by default)   |
| POST   | `/matches/similar`               | Find matches with similar statistical patterns          |
| GET    | `/matches/{id}/positions`        | Average player positions in a match                     |
| GET    | `/matches/{id}/density`          | Position density from 360 freeze-frames                 |
| POST   | `/counterfactual`                | Simulation of ΔxG for alternative actions               |
| GET    | `/health`                        | Health check + count of embedded events                 |

**Coverage:** ✅ **23 of 23 production endpoints active.**

### Example Request

```bash
curl -X GET "https://<your-project>.supabase.co/functions/v1/matches" \
  -H "Authorization: Bearer <anon-key>"
Example Response
json
{
  "matches": [
    {
      "match_id": 3788741,
      "home_team": "Germany",
      "away_team": "Scotland",
      "score": "5-1",
      "stage": "Group Stage",
      "date": "2024-06-14"
    }
  ]
}
🧰 Tech Stack
Frontend
Framework: Next.js 14 (App Router)

Language: TypeScript

Styling: Tailwind CSS

UI Components: shadcn/ui

Charts & Visualization: Recharts, D3.js

Icons: Lucide

Backend
Runtime: Supabase Edge Functions (Deno)

Database: PostgreSQL with Row Level Security

Vector Store: pgvector

Auth: Supabase Auth (optional, for future features)

AI / ML
Embeddings: Google AI — text-embedding-004

LLM: Google Gemini 1.5 Flash

Algorithms: K-Means clustering, cosine similarity, counterfactual simulation

DevOps
Frontend Hosting: Vercel

Backend Hosting: Supabase Edge Functions

CI/CD: GitHub Actions

Package Manager: pnpm

Python Runtime: 3.10+ (data pipeline scripts)

📂 Project Structure
text
euro-2024-public/
├── frontend/                       # Next.js application
│   ├── app/                        # App Router pages
│   │   ├── layout.tsx              # Root layout + metadata
│   │   ├── page.tsx                # Homepage
│   │   ├── matches/                # Match pages
│   │   ├── players/                # Player pages
│   │   └── bot/                    # RAG chatbot page
│   ├── components/                 # Reusable UI components
│   │   ├── ui/                     # shadcn/ui primitives
│   │   ├── charts/                 # Chart components
│   │   └── tactical/               # Tactical visualizations
│   ├── lib/                        # Utilities and API clients
│   ├── public/                     # Static assets
│   └── package.json
├── supabase/
│   ├── functions/                  # Edge Functions (Deno)
│   │   ├── matches/
│   │   ├── players/
│   │   ├── counterfactual/
│   │   └── health/
│   └── migrations/                 # SQL migrations
├── docs/                           # Documentation
│   ├── SUPABASE_DEPLOYMENT.md
│   └── API_REFERENCE.md
├── scripts/                        # Utility and data pipeline scripts
│   ├── import_matches.py
│   ├── embed_events.py
│   └── backfill.py
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
🚀 Getting Started
Prerequisites
Make sure you have the following installed and configured:

Account on Supabase

Account on Vercel

Account on Google AI Studio

Node.js 18+ and pnpm (or npm/yarn)

Python 3.10+ (for data pipeline scripts)

Supabase CLI — install with:

bash
npm install -g supabase
Local Development
bash
# 1. Clone the repository
git clone https://github.com/nomine-ds/euro-2024-public.git
cd euro-2024-public

# 2. Install frontend dependencies
cd frontend
pnpm install

# 3. Set up environment variables
cp ../.env.example .env.local
# Edit .env.local with your Supabase URL, keys, and Google AI credentials

# 4. Run the development server
pnpm dev
The frontend will be available at http://localhost:3000.

To develop Edge Functions locally:

bash
# From the repository root
supabase start
supabase functions serve
Environment Variables
Create a .env.local file inside frontend/ with the following variables:

env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google AI
GOOGLE_AI_API_KEY=your-google-ai-key
GEMINI_MODEL=gemini-1.5-flash
EMBEDDING_MODEL=text-embedding-004

# Optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
⚠️ Never commit .env.local or any file containing secrets. It is already listed in .gitignore.

☁️ Deployment
The production stack runs on Supabase Edge Functions (backend) and Vercel (frontend).

Deploy Backend (Supabase)
bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy all Edge Functions
supabase functions deploy

# Run database migrations
supabase db push
Deploy Frontend (Vercel)
bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
cd frontend
vercel --prod
Alternatively, connect the repository to Vercel via the dashboard for automatic deployments on every push to main.

📘 Full deployment guide: docs/SUPABASE_DEPLOYMENT.md

🔄 Data Pipeline
The data pipeline imports StatsBomb 360 events, generates embeddings, and backfills vector data.

bash
# 1. Import matches from StatsBomb
python scripts/import_matches.py

# 2. Generate embeddings for events
python scripts/embed_events.py

# 3. Backfill remaining data (gradual process)
python scripts/backfill.py
Current coverage:

✅ 51 matches imported

✅ 23 of 23 endpoints active

🔄 Gradual backfill of 360 freeze-frames and embeddings in progress

🧪 Testing
bash
# Navigate to frontend
cd frontend

# Run unit tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Production build
pnpm build
Manual Verification
bash
# Check the health endpoint
curl https://<your-project>.supabase.co/functions/v1/health
🤝 Contributing
Contributions are welcome! Whether you are fixing a typo, adding a new visualization, or improving the RAG chatbot, your help is appreciated.

How to Contribute
Fork the repository and create a new branch:

bash
git checkout -b feat/your-feature-name
Follow Conventional Commits for commit messages:

text
feat(i18n): translate homepage UI strings to English
fix(api): handle missing 360 data gracefully
docs(readme): update deployment instructions
Write all code, comments, commit messages, and PR descriptions in English.

Run tests and linting before submitting:

bash
pnpm lint && pnpm test
Open a Pull Request with a clear description of the changes.

Good First Issues
Look for issues labeled good first issue or help wanted to get started.

🎨 Code Style
TypeScript / JavaScript: 2-space indentation, single quotes, semicolons.

Python: PEP 8, formatted with Black.

Markdown: Fenced code blocks with language tags; one sentence per line (optional).

Commits: Conventional Commits.

Naming: camelCase for variables, PascalCase for components, SCREAMING_SNAKE_CASE for constants.

🗺️ Roadmap
☑ Import 51 matches from StatsBomb
☑ Deploy 23 production endpoints
☑ Launch RAG chatbot with Gemini 1.5 Flash
□ Complete 360 freeze-frame backfill
□ Add multi-language support (i18n)
□ Export tactical reports as PDF
□ Real-time match updates
□ Mobile-optimized views
❓ FAQ
Q: Do I need a paid StatsBomb account to use this platform?
A: No. The imported data covers all 51 Euro 2024 matches and is available through the public API.

Q: Can I self-host the platform?
A: Yes. Follow the Deployment section to host the backend on Supabase and the frontend on Vercel (or any Node-compatible host).

Q: Is the API rate-limited?
A: Supabase Edge Functions have generous free-tier limits. For high-volume usage, consider upgrading your Supabase plan.

Q: How do I add a new endpoint?
A: Create a new folder under supabase/functions/, add an index.ts file, and run supabase functions deploy <name>.

📄 License
This project is licensed under the MIT License. See the LICENSE file for details.

🙏 Acknowledgements
StatsBomb — for providing open 360 event data.

UEFA — for organizing Euro 2024.

Supabase — for Edge Functions and Postgres infrastructure.

Vercel — for frontend hosting.

Google AI — for Gemini and embedding models.

shadcn/ui — for the component library.

Recharts & D3.js — for visualizations.

📬 Contact
For questions, feedback, or collaboration:

GitHub Issues: Open an issue

GitHub Discussions: Start a discussion

Repository: nomine-ds/euro-2024-public

<p align="center"> Made with ⚽ and ☕ by <a href="https://github.com/nomine-ds">nomine-ds</a> <br /> <sub>Not affiliated with UEFA or StatsBomb.</sub> </p> ```