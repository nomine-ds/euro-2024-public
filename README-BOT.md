# 🤖 Hudl Bot — Euro 2024

AI chatbot analisis Euro 2024 berdasarkan data StatsBomb.

## Arsitektur

User -> Vercel (Next.js) -> Supabase Edge Function -> Gemini API -> pgvector DB

| Layer | Teknologi | Fungsi |
|---|---|---|
| Frontend | Next.js 16 di Vercel | UI + proxy API |
| Backend | Supabase Edge Functions (Deno) | Logic bot |
| Vector DB | Supabase pgvector | Simpan embedding |
| Embedding | Gemini gemini-embedding-001 (768 dim) | Vectorisasi |
| LLM | Gemini 3.8/3.5/3.1 Flash (fallback) | Jawab pertanyaan |
| Data | StatsBomb Euro 2024 (51 match) | Event pertandingan |

## Endpoint

POST /api/bot/chat

Request:
{ "query": "Siapa pemenang Euro 2024?" }

Response:
{
  "answer": "Pemenang Euro 2024 adalah Spain...",
  "context": [{ "text": "...", "similarity": 0.87, "metadata": {} }]
}

Batasan: query 1-500 karakter. Response 3-15 detik.

## Contoh Pertanyaan

- "Siapa pemenang Euro 2024?"
- "Who scored in the Euro 2024 final?"
- "Who got carded in the Spain vs France semi-final?"
- "Who scored in the Spain vs Germany quarter-final?"
- "Berapa skor final Euro 2024?"

## Setup Lokal

cd frontend
npm install

Buat frontend/.env.local:
NEXT_PUBLIC_SUPABASE_URL=https://tzbklculanmoiikvukci.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<key>

Jalankan: npm run dev -> http://localhost:3000

## Embed Data

$env:SUPABASE_URL = "https://tzbklculanmoiikvukci.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<key>"
$env:GEMINI_API_KEY = "<key>"

python scripts/embed_events_to_supabase.py --mode key --stage Final
python scripts/embed_events_to_supabase.py --mode key --stage "Semi-finals"
python scripts/embed_events_to_supabase.py --mode key --stage "Quarter-finals"
python scripts/embed_events_to_supabase.py --mode key --stage "Round of 16" --skip-existing
python scripts/embed_events_to_supabase.py --mode key --stage "Group Stage" --skip-existing

Auto-embed via GitHub Actions tiap 6 jam.

## Deployment

# Frontend
cd frontend
npx vercel --prod --force --archive=tgz

# Backend
npx supabase functions deploy api --project-ref tzbklculanmoiikvukci

## File Penting

| File | Fungsi |
|---|---|
| frontend/app/api/[...path]/route.ts | Proxy Next.js ke Supabase |
| supabase/functions/api/routes/bot.ts | Logic bot |
| supabase/functions/api/lib/core.ts | Helper |
| scripts/embed_events_to_supabase.py | Embed event |

## Troubleshooting

| Error | Penyebab | Fix |
|---|---|---|
| 405 | POST route tidak ada | Cek route.ts ekspor POST |
| 400 query must be 1-500 | Body field salah | Pakai { "query": ... } |
| 401 | API key salah format | sb_secret_ hanya di header apikey |
| 404 Model not found | Nama model deprecated | Update GEMINI_LLM_MODELS |
| 503 | Gemini overload | Multi-model fallback sudah ada |
| 429 Quota | Free tier habis | Tunggu 24 jam / upgrade |
| Mojibake Aurelien | Decode Latin-1 | Cek charset=utf-8 |
| Menit salah | StatsBomb reset per babak | Offset period 2 +46 |
| semi-final ke Final | Substring match | Reorder STAGES |

## Monitoring

SELECT metadata->>'stage' AS stage, COUNT(*) AS total
FROM event_embeddings
GROUP BY metadata->>'stage'
ORDER BY stage;

Target: Final 76 - Semi 152 - Quarter 500 - R16 600 - Group 2700.

## Security

- .env tidak di-commit
- Revoke API key yang bocor
- Rotate Gemini API key berkala
