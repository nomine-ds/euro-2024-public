# app/routers/bot.py
"""
Hudl Bot router — RAG chatbot endpoints.

Endpoints:
    POST /bot/chat     — chat with RAG bot
    GET  /bot/health   — health check + indexed events
    POST /bot/reindex  — rebuild vector store
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import traceback

router = APIRouter(prefix="", tags=["bot"])


class ChatRequest(BaseModel):
    query: str


@router.post("/bot/chat")
async def hudl_bot_chat(request: ChatRequest):
    try:
        from app.services.rag_bot import get_bot
        bot = get_bot()
        result = bot.chat(request.query)
        return result
    except Exception as e:
        print(f"BOT ERROR:\n{traceback.format_exc()}")
        raise HTTPException(500, f"Bot error: {str(e)}")


@router.get("/bot/health")
async def hudl_bot_health():
    try:
        from app.services.rag_bot import get_bot
        bot = get_bot()
        return {
            "status": "online",
            "model": bot.llm_model,
            "vector_db": "ChromaDB (local)",
            "events_indexed": bot.vector_store.collection.count(),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/bot/reindex")
async def hudl_bot_reindex():
    try:
        import app.services.rag_bot as rag_module
        rag_module._bot = None
        from app.services.rag_bot import get_bot
        bot = get_bot()
        return {"status": "ok", "events_indexed": bot.vector_store.collection.count()}
    except Exception as e:
        raise HTTPException(500, f"Reindex error: {str(e)}")