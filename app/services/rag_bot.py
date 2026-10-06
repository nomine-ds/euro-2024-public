# app/services/rag_bot.py
import logging
import traceback
from typing import List, Dict, Any

import ollama
import chromadb
from fastembed import TextEmbedding

from app.core.config import CHROMA_DB_PATH

logger = logging.getLogger(__name__)

COLLECTION_NAME = "euro2024_events"
CHROMA_PATH = str(CHROMA_DB_PATH)
EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
LLM_MODEL = "qwen2.5:3b"
MAX_CONTEXT_CHARS = 3000
TOP_K_RESULTS = 8


class QueryAnalyzer:
    STAGES = {
        'final': 'Final',
        'semi': 'Semi-finals',
        'semifinal': 'Semi-finals',
        'quarter': 'Quarter-finals',
        'perempat': 'Quarter-finals',
        '16 besar': 'Round of 16',
        'round of 16': 'Round of 16',
        'grup': 'Group Stage',
        'group': 'Group Stage',
    }

    TEAMS = [
        'Spain', 'England', 'France', 'Germany', 'Portugal', 'Netherlands',
        'Italy', 'Belgium', 'Croatia', 'Switzerland', 'Denmark', 'Turkey',
        'Austria', 'Scotland', 'Hungary', 'Albania', 'Serbia', 'Slovenia',
        'Slovakia', 'Romania', 'Ukraine', 'Georgia', 'Czech Republic', 'Poland',
    ]

    TEAM_ALIASES = {
        'spanyol': 'Spain',
        'inggris': 'England',
        'prancis': 'France',
        'jerman': 'Germany',
        'belanda': 'Netherlands',
        'italia': 'Italy',
        'belgia': 'Belgium',
        'kroasia': 'Croatia',
        'swiss': 'Switzerland',
        'denmark': 'Denmark',
        'turki': 'Turkey',
    }

    EVENT_KEYWORDS = {
        'gol': 'Shot',
        'goal': 'Shot',
        'skor': 'Shot',
        'tembakan': 'Shot',
        'shot': 'Shot',
        'kartu': 'Foul Committed',
        'pelanggaran': 'Foul Committed',
        'foul': 'Foul Committed',
        'penalti': 'Shot',
        'penalty': 'Shot',
        'dribel': 'Dribble',
        'dribble': 'Dribble',
        'substitusi': 'Substitution',
        'ganti': 'Substitution',
        'sub': 'Substitution',
    }

    def analyze(self, query: str) -> Dict:
        q_lower = query.lower()

        stage = None
        for kw, val in self.STAGES.items():
            if kw in q_lower:
                stage = val
                break

        teams = []
        for alias, canonical in self.TEAM_ALIASES.items():
            if alias in q_lower and canonical not in teams:
                teams.append(canonical)
        for candidate in self.TEAMS:
            if candidate.lower() in q_lower and candidate not in teams:
                teams.append(candidate)

        team = None
        if teams:
            team = teams[0]

        event_type = None
        for kw, val in self.EVENT_KEYWORDS.items():
            if kw in q_lower:
                event_type = val
                break

        return {
            'stage': stage,
            'team': team,
            'teams': teams,
            'event_type': event_type,
        }


class LocalEmbedder:
    def __init__(self, model_name: str = EMBEDDING_MODEL):
        print(f"Loading embedding model: {model_name}...")
        self.model = TextEmbedding(model_name=model_name)
        self.dim = 384

    def embed(self, texts: List[str]) -> List[List[float]]:
        embeddings = list(self.model.embed(texts))
        return [e.tolist() for e in embeddings]


class VectorStore:
    def __init__(self, embedder: LocalEmbedder):
        self.embedder = embedder
        self.analyzer = QueryAnalyzer()
        self.client = chromadb.PersistentClient(path=CHROMA_PATH)
        self.collection = self.client.get_or_create_collection(name=COLLECTION_NAME)

    def _build_where(self, analysis: Dict) -> Any:
        conditions = []
        if analysis['stage']:
            conditions.append({'stage': analysis['stage']})

        if analysis['team']:
            conditions.append({
                '$or': [
                    {'home_team': analysis['team']},
                    {'away_team': analysis['team']},
                    {'team': analysis['team']},
                ]
            })

        if len(conditions) == 1:
            return conditions[0]
        elif len(conditions) > 1:
            return {'$and': conditions}
        return None

    def _build_goal_where(self, analysis: Dict) -> Any:
        conditions = []
        if analysis['stage']:
            conditions.append({'stage': {'$eq': analysis['stage']}})

        teams = analysis['teams']
        if len(teams) == 2:
            first_team, second_team = teams
            conditions.append({
                '$or': [
                    {
                        '$and': [
                            {'home_team': {'$eq': first_team}},
                            {'away_team': {'$eq': second_team}},
                        ]
                    },
                    {
                        '$and': [
                            {'home_team': {'$eq': second_team}},
                            {'away_team': {'$eq': first_team}},
                        ]
                    },
                ]
            })

        if analysis['team']:
            conditions.append({'team': {'$eq': analysis['team']}})

        conditions.append({'event_type': {'$eq': 'Shot'}})
        if len(conditions) == 1:
            return conditions[0]
        return {'$and': conditions}

    def _execute_query(self, query: str, limit: int, where: Any) -> Any:
        query_vector = self.embedder.embed([query])[0]
        kwargs = {
            'query_embeddings': [query_vector],
            'n_results': limit,
            'include': ['documents', 'metadatas'],
        }
        if where:
            kwargs['where'] = where

        try:
            results = self.collection.query(**kwargs)
        except Exception as e:
            logger.error(f"ChromaDB search error: {e}")
            try:
                kwargs.pop('where', None)
                results = self.collection.query(**kwargs)
            except Exception as e2:
                logger.error(f"Fallback error: {e2}")
                return None

        return results

    def search(self, query: str, limit: int = TOP_K_RESULTS) -> List[Dict]:
        analysis = self.analyzer.analyze(query)
        print(f"Query analysis: {analysis}")

        q_lower = query.lower()
        wants_goal = any(kw in q_lower for kw in [
            'mencetak gol', 'gol', 'goal', 'skor', 'siapa yang cetak'
        ])

        if wants_goal and analysis['event_type'] == 'Shot':
            if not analysis['team']:
                return []

            results = self.collection.get(
                where=self._build_goal_where(analysis),
                include=['documents', 'metadatas'],
            )
            documents = results.get('documents') or []
            metadatas = results.get('metadatas') or []
            items = []
            for i, doc in enumerate(documents):
                if 'Hasil: Goal' not in doc:
                    continue
                meta = metadatas[i] if i < len(metadatas) else {}
                items.append({'text': doc, **meta})
                if len(items) >= limit:
                    break
            return items

        where = self._build_where(analysis)
        fetch_limit = limit * 4 if wants_goal else limit

        results = self._execute_query(query, fetch_limit, where)

        items = []
        if results and results.get("documents") and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                meta = results["metadatas"][0][i] if results.get("metadatas") else {}

                if analysis['event_type'] and meta.get('event_type') != analysis['event_type']:
                    continue

                items.append({"text": doc, **meta})

                if len(items) >= limit:
                    break

        print(f"Found {len(items)} items (stage={analysis['stage']}, team={analysis['team']}, type={analysis['event_type']}).")
        return items


class HudlBot:
    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        self.llm_model = LLM_MODEL

    def _build_prompt(self, query: str, context: List[Dict]) -> str:
        context_lines = []
        total_chars = 0
        for c in context:
            text = c.get("text", "")
            if total_chars + len(text) > MAX_CONTEXT_CHARS:
                break
            context_lines.append(f"- {text}")
            total_chars += len(text)

        context_text = "\n".join(context_lines) if context_lines else "(tidak ada data relevan)"

        prompt = f"""Kamu adalah analis sepak bola untuk Euro 2024. Jawab dalam Bahasa Indonesia.

ATURAN WAJIB:
1. Jawab HANYA berdasarkan DATA di bawah.
2. Jika pertanyaan meminta DAFTAR (misal "siapa saja", "berapa"), sebutkan SEMUA item yang ada di data.
3. Jangan mengarang data yang tidak ada.
4. Sertakan menit kejadian dan tim pemain.
5. Jika data tidak ada, katakan "Tidak ada data untuk pertanyaan itu."

DATA:
{context_text}

PERTANYAAN: {query}

JAWABAN (sebutkan SEMUA item yang relevan dari data):"""

        return prompt

    def chat(self, query: str) -> Dict:
        context = self.vector_store.search(query, limit=TOP_K_RESULTS)
        prompt = self._build_prompt(query, context)
        print(f"Prompt: {len(prompt)} chars, context: {len(context)} items.")
        try:
            response = ollama.chat(
                model=self.llm_model,
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": 0.2, "num_predict": 500, "num_ctx": 2048},
            )
            answer = response.get("message", {}).get("content", "").strip()
            if not answer:
                answer = "Maaf, saya tidak bisa menghasilkan jawaban."
        except Exception as e:
            print(f"Ollama error:\n{traceback.format_exc()}")
            answer = f"❌ Error: {str(e)}"

        return {
            "query": query,
            "answer": answer,
            "context": context,
            "context_count": len(context),
            "model": self.llm_model,
        }


_bot = None

def get_bot():
    global _bot
    if _bot is None:
        print("Initializing Hudl Bot...")
        embedder = LocalEmbedder()
        vector_store = VectorStore(embedder)
        _bot = HudlBot(vector_store)
        print(f"Hudl Bot ready. Events: {vector_store.collection.count()}.")
    return _bot