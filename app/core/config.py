# app/core/config.py
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

DATA_DIR = Path(os.getenv("DATA_DIR", "data/raw"))
if not DATA_DIR.is_absolute():
    DATA_DIR = BASE_DIR / DATA_DIR
DATA_DIR.mkdir(parents=True, exist_ok=True)

COMPETITION_ID = 55
SEASON_ID = 282

REDIS_URL = os.getenv("REDIS_URL", "").strip()

CHROMA_DB_PATH = Path(os.getenv("CHROMA_DB_PATH", "data/chroma_db"))
if not CHROMA_DB_PATH.is_absolute():
    CHROMA_DB_PATH = BASE_DIR / CHROMA_DB_PATH


def get_cors_origins() -> list[str]:
    origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "").split(",")
        if origin.strip()
    ]
    if os.getenv("APP_ENV", "development").strip().lower() == "production" and "*" in origins:
        raise ValueError("CORS_ORIGINS must not include '*' in production.")
    return origins