// supabase/functions/api/routes/bot.ts
import { json } from "../lib/core.ts";
import type { SupabaseClient } from "../lib/core.ts";

const GEMINI_EMBED_MODEL = "gemini-embedding-001";
const GEMINI_LLM_MODEL = "gemini-3.6-flash";
const EMBED_DIM = 768;
const TOP_K = 8;
const MAX_CONTEXT_CHARS = 3000;

const EMBED_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent`;
const LLM_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_LLM_MODEL}:generateContent`;

type EmbedResponse = {
  embedding?: { values?: number[] };
};

type LlmResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

type SearchRow = {
  event_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

const STAGES: Record<string, string> = {
  final: "Final",
  semi: "Semi-finals",
  semifinal: "Semi-finals",
  quarter: "Quarter-finals",
  perempat: "Quarter-finals",
  "16 besar": "Round of 16",
  "round of 16": "Round of 16",
  grup: "Group Stage",
  group: "Group Stage",
};

const TEAMS = [
  "Spain", "England", "France", "Germany", "Portugal", "Netherlands",
  "Italy", "Belgium", "Croatia", "Switzerland", "Denmark", "Turkey",
  "Austria", "Scotland", "Hungary", "Albania", "Serbia", "Slovenia",
  "Slovakia", "Romania", "Ukraine", "Georgia", "Czech Republic", "Poland",
];

const TEAM_ALIASES: Record<string, string> = {
  spanyol: "Spain",
  inggris: "England",
  prancis: "France",
  jerman: "Germany",
  belanda: "Netherlands",
  italia: "Italy",
  belgia: "Belgium",
  kroasia: "Croatia",
  swiss: "Switzerland",
  denmark: "Denmark",
  turki: "Turkey",
};

const EVENT_KEYWORDS: Record<string, string> = {
  gol: "Shot",
  goal: "Shot",
  skor: "Shot",
  tembakan: "Shot",
  shot: "Shot",
  kartu: "Foul Committed",
  pelanggaran: "Foul Committed",
  foul: "Foul Committed",
  penalti: "Shot",
  penalty: "Shot",
  dribel: "Dribble",
  dribble: "Dribble",
  substitusi: "Substitution",
  ganti: "Substitution",
  sub: "Substitution",
};

function analyzeQuery(query: string): {
  stage: string | null;
  team: string | null;
  event_type: string | null;
} {
  const q = query.toLowerCase();

  let stage: string | null = null;
  for (const [kw, val] of Object.entries(STAGES)) {
    if (q.includes(kw)) {
      stage = val;
      break;
    }
  }

  let team: string | null = null;
  for (const [alias, canonical] of Object.entries(TEAM_ALIASES)) {
    if (q.includes(alias)) {
      team = canonical;
      break;
    }
  }
  if (!team) {
    for (const candidate of TEAMS) {
      if (q.includes(candidate.toLowerCase())) {
        team = candidate;
        break;
      }
    }
  }

  let eventType: string | null = null;
  for (const [kw, val] of Object.entries(EVENT_KEYWORDS)) {
    if (q.includes(kw)) {
      eventType = val;
      break;
    }
  }

  return { stage, team, event_type: eventType };
}

async function embedQuery(geminiKey: string, query: string): Promise<number[]> {
  const reqBody = {
    model: `models/${GEMINI_EMBED_MODEL}`,
    content: { parts: [{ text: query }] },
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: EMBED_DIM,
  };

  const resp = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": geminiKey,
    },
    body: JSON.stringify(reqBody),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Embed failed (${resp.status}): ${err}`);
  }

  const data = (await resp.json()) as EmbedResponse;
  const values = data.embedding?.values;
  if (!values || values.length !== EMBED_DIM) {
    throw new Error("Invalid embedding response");
  }
  return values;
}

async function searchContext(
  client: SupabaseClient,
  embedding: number[],
  analysis: { stage: string | null; team: string | null; event_type: string | null },
): Promise<SearchRow[]> {
  const { data, error } = await client.rpc("search_event_embeddings", {
    query_embedding: embedding,
    filter_stage: analysis.stage,
    filter_team: analysis.team,
    filter_event_type: analysis.event_type,
    match_count: TOP_K,
  });

  if (error) {
    console.error("Search error:", error.message);
    const { data: fallback, error: fbErr } = await client.rpc(
      "search_event_embeddings",
      {
        query_embedding: embedding,
        filter_stage: null,
        filter_team: null,
        filter_event_type: null,
        match_count: TOP_K,
      },
    );
    if (fbErr) throw new Error(fbErr.message);
    return (fallback ?? []) as SearchRow[];
  }
  return (data ?? []) as SearchRow[];
}

async function askLlm(
  geminiKey: string,
  query: string,
  context: SearchRow[],
): Promise<string> {
  const lines: string[] = [];
  let totalChars = 0;
  for (const c of context) {
    if (totalChars + c.content.length > MAX_CONTEXT_CHARS) break;
    lines.push(`- ${c.content}`);
    totalChars += c.content.length;
  }
  const contextText = lines.length
    ? lines.join("\n")
    : "(tidak ada data relevan)";

  const prompt = `Kamu adalah analis sepak bola untuk Euro 2024. Jawab dalam Bahasa Indonesia.

ATURAN WAJIB:
1. Jawab HANYA berdasarkan DATA di bawah.
2. Jika pertanyaan meminta DAFTAR, sebutkan SEMUA item yang ada di data.
3. Jangan mengarang data yang tidak ada.
4. Sertakan menit kejadian dan tim pemain.
5. Jika data tidak ada, katakan "Tidak ada data untuk pertanyaan itu."

DATA:
${contextText}

PERTANYAAN: ${query}

JAWABAN (sebutkan SEMUA item yang relevan dari data):`;

  const reqBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8000,
    },
  };

  const resp = await fetch(LLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": geminiKey,
    },
    body: JSON.stringify(reqBody),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`LLM failed (${resp.status}): ${err}`);
  }

  const data = (await resp.json()) as LlmResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return "Maaf, saya tidak bisa menghasilkan jawaban.";
  return text.trim();
}

export async function botChatHandler(
  client: SupabaseClient,
  request: Request,
): Promise<Response> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    return json({ message: "GEMINI_API_KEY not configured." }, 503);
  }

  let parsedBody: { query?: string };
  try {
    parsedBody = await request.json();
  } catch {
    return json({ message: "Invalid JSON body." }, 400);
  }

  const query = (parsedBody.query ?? "").trim();
  if (!query || query.length > 500) {
    return json({ message: "query must be 1-500 characters." }, 400);
  }

  try {
    const analysis = analyzeQuery(query);
    const embedding = await embedQuery(geminiKey, query);
    const context = await searchContext(client, embedding, analysis);
    const answer = await askLlm(geminiKey, query, context);

    return json({
      answer,
      context: context.map((c) => ({
        text: c.content,
        similarity: c.similarity,
        metadata: c.metadata,
      })),
    });
  } catch (error) {
    console.error("Bot pipeline error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return json(
      {
        answer: "Maaf, terjadi kesalahan saat memproses pertanyaan. Coba lagi nanti.",
        context:[],
      },
      200,
    );
  }
}

export async function botHealthHandler(
  client: SupabaseClient,
): Promise<Response> {
  const { count, error } = await client
    .from("event_embeddings")
    .select("*", { count: "exact", head: true });

  if (error) throw new Error(error.message);

  return json({
    status: "online",
    model: GEMINI_LLM_MODEL,
    vector_db: "Supabase pgvector",
    events_indexed: count ?? 0,
  });
}