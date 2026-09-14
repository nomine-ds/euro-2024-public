# app/core/config.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

DATA_DIR = BASE_DIR / "data" / "raw"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Hardcode Euro 2024 (gak akan berubah, ngapain ribet)
COMPETITION_ID = 55
SEASON_ID = 282

# Redis buat nanti (kalau belum pake, gak usah dipaksa)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")