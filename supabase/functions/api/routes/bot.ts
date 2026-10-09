// supabase/functions/api/routes/bot.ts
import { json } from "../lib/core.ts";
import type { SupabaseClient } from "../lib/core.ts";

const GEMINI_EMBED_MODEL = "gemini-embedding-001";
const GEMINI_LLM_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
] as const;
const GEMINI_LLM_MODEL = GEMINI_LLM_MODELS[0];
const EMBED_DIM = 768;
const TOP_K = 25;
const MAX_CONTEXT_CHARS = 8000;

const EMBED_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent`;

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

// ============================================================
// MOJIBAKE FIXER — Latin-1, CP1252, MacRoman, multi-level
// ============================================================

const CP1252_TO_BYTE: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

const MACROMAN_TO_BYTE: Record<number, number> = {
  0x00c4: 0x80, 0x00c5: 0x81, 0x00c7: 0x82, 0x00c9: 0x83,
  0x00d1: 0x84, 0x00d6: 0x85, 0x00dc: 0x86, 0x00e1: 0x87,
  0x00e0: 0x88, 0x00e2: 0x89, 0x00e4: 0x8a, 0x00e3: 0x8b,
  0x00e5: 0x8c, 0x00e7: 0x8d, 0x00e9: 0x8e, 0x00e8: 0x8f,
  0x00ea: 0x90, 0x00eb: 0x91, 0x00ed: 0x92, 0x00ec: 0x93,
  0x00ee: 0x94, 0x00ef: 0x95, 0x00f1: 0x96, 0x00f3: 0x97,
  0x00f2: 0x98, 0x00f4: 0x99, 0x00f6: 0x9a, 0x00f5: 0x9b,
  0x00fa: 0x9c, 0x00f9: 0x9d, 0x00fb: 0x9e, 0x00fc: 0x9f,
  0x2020: 0xa0, 0x00b0: 0xa1, 0x00a2: 0xa2, 0x00a3: 0xa3,
  0x00a7: 0xa4, 0x2022: 0xa5, 0x00b6: 0xa6, 0x00df: 0xa7,
  0x00ae: 0xa8, 0x00a9: 0xa9, 0x2122: 0xaa, 0x00b4: 0xab,
  0x00a8: 0xac, 0x2260: 0xad, 0x00c6: 0xae, 0x00d8: 0xaf,
  0x221e: 0xb0, 0x00b1: 0xb1, 0x2264: 0xb2, 0x2265: 0xb3,
  0x00a5: 0xb4, 0x00b5: 0xb5, 0x2202: 0xb6, 0x2211: 0xb7,
  0x220f: 0xb8, 0x03c0: 0xb9, 0x222b: 0xba, 0x00aa: 0xbb,
  0x00ba: 0xbc, 0x03a9: 0xbd, 0x00e6: 0xbe, 0x00f8: 0xbf,
  0x00bf: 0xc0, 0x00a1: 0xc1, 0x00ac: 0xc2, 0x221a: 0xc3,
  0x0192: 0xc4, 0x2248: 0xc5, 0x2206: 0xc6, 0x00ab: 0xc7,
  0x00bb: 0xc8, 0x2026: 0xc9, 0x00a0: 0xca, 0x00c0: 0xcb,
  0x00c3: 0xcc, 0x00d5: 0xcd, 0x0152: 0xce, 0x0153: 0xcf,
  0x2013: 0xd0, 0x2014: 0xd1, 0x201c: 0xd2, 0x201d: 0xd3,
  0x2018: 0xd4, 0x2019: 0xd5, 0x00f7: 0xd6, 0x25ca: 0xd7,
  0x00ff: 0xd8, 0x0178: 0xd9, 0x2044: 0xda, 0x20ac: 0xdb,
  0x2039: 0xdc, 0x203a: 0xdd, 0xfb01: 0xde, 0xfb02: 0xdf,
  0x2021: 0xe0, 0x00b7: 0xe1, 0x201a: 0xe2, 0x201e: 0xe3,
  0x2030: 0xe4, 0x00c2: 0xe5, 0x00ca: 0xe6, 0x00c1: 0xe7,
  0x00cb: 0xe8, 0x00c8: 0xe9, 0x00cd: 0xea, 0x00ce: 0xeb,
  0x00cf: 0xec, 0x00cc: 0xed, 0x00d3: 0xee, 0x00d4: 0xef,
  0xf8ff: 0xf0, 0x00d2: 0xf1, 0x00da: 0xf2, 0x00db: 0xf3,
  0x00d9: 0xf4, 0x0131: 0xf5, 0x02c6: 0xf6, 0x02dc: 0xf7,
  0x00af: 0xf8, 0x02d8: 0xf9, 0x02d9: 0xfa, 0x02da: 0xfb,
  0x00b8: 0xfc, 0x02dd: 0xfd, 0x02db: 0xfe, 0x02c7: 0xff,
};

function bytesFromLatin1(text: string): Uint8Array | null {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c > 0xff) return null;
    bytes[i] = c;
  }
  return bytes;
}

function bytesFromCp1252(text: string): Uint8Array | null {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c <= 0x7f) out.push(c);
    else if (c >= 0xa0 && c <= 0xff) out.push(c);
    else if (CP1252_TO_BYTE[c] !== undefined) out.push(CP1252_TO_BYTE[c]);
    else if (c >= 0x80 && c <= 0x9f) out.push(c);
    else return null;
  }
  return new Uint8Array(out);
}

function bytesFromMacRoman(text: string): Uint8Array | null {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c <= 0x7f) out.push(c);
    else if (MACROMAN_TO_BYTE[c] !== undefined) out.push(MACROMAN_TO_BYTE[c]);
    else return null;
  }
  return new Uint8Array(out);
}

function tryDecodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function mojibakeScore(text: string): number {
  let score = 0;

  const badPatterns: RegExp[] = [
    /Ã[\x80-\xBF]/g,
    /Â[\x80-\xBF]/g,
    /â€[\x80-\xBF]?/g,
    /Ã¢/g,
    /Ãƒ/g,
    /Ã‚/g,
    /\uFFFD/g,
    /Ã©|Ã¨|Ã |Ã¢|Ã´|Ã®|Ã»|Ã§/g,
    /Ã±|Ã¼|Ã¶|Ã¤|Ã¡|Ã|Ã³|Ãº|Ã­/g,
    /Å[\x80-\xBF]?/g,
    /Ð[\x80-\xBF]?/g,
    /â[\x80-\xBF]/g,
  ];
  for (const re of badPatterns) {
    const m = text.match(re);
    if (m) score += m.length * 100;
  }

  const good = text.match(
    /[éèêëàâäáãåçíîïñóôöõúûüýÿÉÈÊËÀÂÄÁÃÅÇÍÎÏÑÓÔÖÕÚÛÜÝœæŒÆß]/g,
  );
  if (good) score -= good.length * 8;

  const nonAscii = text.match(/[^\x00-\x7F]/g);
  if (!nonAscii) return score;
  const ratio = nonAscii.length / text.length;
  if (ratio < 0.05) score -= 10;

  return score;
}

function fixEncoding(text: string): string {
  if (!text || typeof text !== "string") return text;
  if (!/[^\x00-\x7F]/.test(text)) return text;

  const decoders = [bytesFromLatin1, bytesFromCp1252, bytesFromMacRoman];
  const seen = new Set<string>([text]);
  const candidates: string[] = [text];
  const queue: Array<{ text: string; depth: number }> = [{ text, depth: 0 }];

  const MAX_DEPTH = 3;
  let iter = 0;

  while (queue.length > 0 && iter < 60) {
    iter++;
    const { text: current, depth } = queue.shift()!;
    if (depth >= MAX_DEPTH) continue;

    for (const makeBytes of decoders) {
      const bytes = makeBytes(current);
      if (!bytes) continue;
      const decoded = tryDecodeUtf8(bytes);
      if (!decoded || decoded === current || seen.has(decoded)) continue;
      if (decoded.includes("\uFFFD")) continue;

      seen.add(decoded);
      candidates.push(decoded);
      queue.push({ text: decoded, depth: depth + 1 });
    }
  }

  let best = text;
  let bestScore = mojibakeScore(text);

  for (const c of candidates) {
    const s = mojibakeScore(c);
    if (s < bestScore || (s === bestScore && c.length < best.length)) {
      best = c;
      bestScore = s;
    }
  }

  if (best !== text) {
    console.log(
      "fixEncoding:",
      JSON.stringify(text.slice(0, 50)),
      "->",
      JSON.stringify(best.slice(0, 50)),
    );
  }
  return best;
}

// ============================================================
// QUERY ANALYSIS
// ============================================================

// PENTING: Urutan penting.
// - Yang lebih spesifik dulu (semi, semi-final)
// - "pemenang/juara/winner/champion" → Final (turnamen ditentukan di final)
// - "final" di akhir supaya tidak "menelan" "semi-final"
const STAGES: Record<string, string> = {
  // Round of 16
  "round of 16": "Round of 16",
  "16 besar": "Round of 16",
  // Semi-finals (HARUS sebelum "final")
  semi: "Semi-finals",
  semifinal: "Semi-finals",
  "semi-final": "Semi-finals",
  // Quarter-finals
  perempat: "Quarter-finals",
  quarter: "Quarter-finals",
  // Pemenang turnamen = ditentukan di Final
  pemenang: "Final",
  juara: "Final",
  winner: "Final",
  champion: "Final",
  // Final (ditaruh setelah "semi" & "pemenang")
  final: "Final",
  // Group Stage
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

function containsWord(q: string, kw: string): boolean {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return regex.test(q);
}

function analyzeQuery(query: string): {
  stage: string | null;
  team: string | null;
  event_type: string | null;
} {
  const q = query.toLowerCase();

  let stage: string | null = null;
  for (const [kw, val] of Object.entries(STAGES)) {
    if (containsWord(q, kw)) {
      stage = val;
      break;
    }
  }

  let team: string | null = null;
  for (const [alias, canonical] of Object.entries(TEAM_ALIASES)) {
    if (containsWord(q, alias)) {
      team = canonical;
      break;
    }
  }
  if (!team) {
    for (const candidate of TEAMS) {
      if (containsWord(q, candidate.toLowerCase())) {
        team = candidate;
        break;
      }
    }
  }

  let eventType: string | null = null;
  for (const [kw, val] of Object.entries(EVENT_KEYWORDS)) {
    if (containsWord(q, kw)) {
      eventType = val;
      break;
    }
  }

  return { stage, team, event_type: eventType };
}

// ============================================================
// PIPELINE
// ============================================================

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

  const rows = (data ?? []) as SearchRow[];

  if (
    rows.length < 3 &&
    (analysis.stage || analysis.team || analysis.event_type)
  ) {
    console.log(
      `Only ${rows.length} rows with filter, falling back to no-filter search`,
    );
    const { data: broad, error: broadErr } = await client.rpc(
      "search_event_embeddings",
      {
        query_embedding: embedding,
        filter_stage: null,
        filter_team: null,
        filter_event_type: null,
        match_count: TOP_K,
      },
    );
    if (!broadErr && broad && broad.length > rows.length) {
      return broad as SearchRow[];
    }
  }

  return rows;
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
6. Jika pertanyaan tentang HASIL/PEMENANG, sebutkan SKOR akhir DAN semua GOL yang tercatat.
7. Sebutkan SEMUA kejadian penting (gol, kartu, substitusi) yang ada di data.
8. Format jawaban dengan bullet point agar mudah dibaca.
9. PENTING: Copy PERSIS nama pemain dari DATA, termasuk karakter aksen (é, í, ñ, ü, á, ó, ö). JANGAN ubah encoding karakter.
10. PENTING: FOKUS pada stage yang diminta pertanyaan. Jika pertanyaan tentang "pemenang/juara Euro 2024", jawab HANYA dari stage "Final". JANGAN campur event dari stage lain (Semi-finals, Quarter-finals, dst.).
11. PENTING: Sebutkan SEMUA gol yang tercatat di stage yang diminta (dalam DATA di bawah), bukan hanya gol kemenangan.

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

  const errors: string[] = [];

  for (const model of GEMINI_LLM_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify(reqBody),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        errors.push(`[${model}] ${resp.status}: ${errText.slice(0, 120)}`);

        if (resp.status === 503 || resp.status === 429) continue;
        throw new Error(`LLM failed (${resp.status}) [${model}]: ${errText}`);
      }

      const data = (await resp.json()) as LlmResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        errors.push(`[${model}] empty response`);
        continue;
      }

      console.log(`LLM success with model: ${model}`);
      const rawText = text.trim();
      console.log("RAW LLM output (first 200):", rawText.slice(0, 200));
      const fixedText = fixEncoding(rawText);
      console.log("FIXED output (first 200):", fixedText.slice(0, 200));
      return fixedText;
    } catch (err) {
      errors.push(`[${model}] ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
  }

  throw new Error(`All LLM models failed:\n${errors.join("\n")}`);
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
    console.log("Query analysis:", JSON.stringify(analysis));

    const expandedQuery =
      `${query} goals shots cards substitutions lineups score result final match events`;
    const embedding = await embedQuery(geminiKey, expandedQuery);
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
    return json(
      {
        answer: "Maaf, terjadi kesalahan saat memproses pertanyaan. Coba lagi nanti.",
        context: [],
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