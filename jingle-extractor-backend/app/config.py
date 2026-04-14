"""
Configuration for the Jingle Extractor backend.
All settings come from environment variables with sensible defaults.
"""

import os
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────

DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))


def track_dir(track_id: str) -> Path:
    """Directory for a specific track's files."""
    return DATA_DIR / "tracks" / track_id


def stem_path(track_id: str, stem: str) -> Path:
    """Path to a specific stem file (orig, inst, vox)."""
    d = track_dir(track_id)
    mapping = {"orig": "orig.mp3", "inst": "inst.mp3", "vox": "vox.mp3"}
    return d / mapping[stem]


def clips_dir(track_id: str) -> Path:
    """Directory for exported clips."""
    return track_dir(track_id) / "clips"


def db_path() -> Path:
    """Path to the SQLite database file."""
    return DATA_DIR / "jingle_extractor.db"


# ── External Services ──────────────────────────────────────────────────────

MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "")
MINIMAX_API_URL = os.getenv(
    "MINIMAX_API_URL", "https://api.minimax.io/v1/music_generation"
)

# ── Pipeline Settings ──────────────────────────────────────────────────────

DEMUCS_MODEL = os.getenv("DEMUCS_MODEL", "htdemucs")
WHISPERX_MODEL = os.getenv("WHISPERX_MODEL", "large-v2")
WHISPERX_DEVICE = os.getenv("WHISPERX_DEVICE", "cpu")

# ── Server Settings ────────────────────────────────────────────────────────

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:6006"
).split(",")

# ── Logging ────────────────────────────────────────────────────────────────

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
