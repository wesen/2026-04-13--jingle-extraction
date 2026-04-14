# Section 6: Project Structure

This section covers the file layout, configuration, startup procedure, and testing strategy.

---

## 6.1 File Layout

```
jingle-extractor-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app factory, CORS, lifespan, router includes
│   ├── config.py             # Configuration (DATA_DIR, env vars, path helpers)
│   ├── database.py           # SQLite wrapper (create_tables, CRUD operations)
│   ├── models.py             # Pydantic models (all request/response schemas)
│   ├── presets.py            # Hardcoded preset configurations
│   ├── pipeline.py           # Background pipeline (wraps jingle_extractor.py)
│   ├── scoring.py            # Score computation (attack, ending, energy, beat)
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── analyze.py        # POST /api/analyze
│   │   ├── analysis.py       # GET /api/analysis/{track_id}
│   │   ├── mine.py           # POST /api/mine
│   │   ├── export.py         # POST /api/export, POST /api/export/batch
│   │   ├── tracks.py         # GET /api/tracks
│   │   └── presets.py        # GET /api/presets
│   └── schema.sql            # SQLite CREATE TABLE statements
├── tests/
│   ├── __init__.py
│   ├── conftest.py           # pytest fixtures (test client, test DB)
│   ├── test_analyze.py       # Tests for POST /api/analyze
│   ├── test_analysis.py      # Tests for GET /api/analysis/{id}
│   ├── test_mine.py          # Tests for POST /api/mine
│   ├── test_export.py        # Tests for export endpoints
│   ├── test_tracks.py        # Tests for GET /api/tracks
│   ├── test_presets.py       # Tests for GET /api/presets
│   └── test_scoring.py       # Unit tests for scoring functions
├── data/                     # Runtime data (gitignored)
│   ├── tracks/               # Audio files organized by track ID
│   └── jingle_extractor.db   # SQLite database
├── run.py                    # uvicorn startup script
├── pyproject.toml            # Python project config (dependencies, tool settings)
├── requirements.txt          # Pinned dependencies
├── Dockerfile                # Container build (optional, for deployment)
└── README.md                 # Setup and usage instructions
```

---

## 6.2 Configuration (app/config.py)

All configuration is via environment variables with sensible defaults:

```python
# app/config.py

import os
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
# Base directory for all data (audio files, database)
DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))

def track_dir(track_id: str) -> Path:
    """Directory for a specific track's files."""
    return DATA_DIR / "tracks" / track_id

def stem_path(track_id: str, stem: str) -> Path:
    """Path to a specific stem file."""
    d = track_dir(track_id)
    ext = "mp3"  # could be configurable
    return d / f"{stem}.{ext}"

def clips_dir(track_id: str) -> Path:
    """Directory for exported clips."""
    return track_dir(track_id) / "clips"

def db_path() -> Path:
    """Path to the SQLite database file."""
    return DATA_DIR / "jingle_extractor.db"

# ── External Services ──────────────────────────────────────────────────────
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "")
MINIMAX_API_URL = os.getenv("MINIMAX_API_URL", "https://api.minimax.io/v1/music_generation")

# ── Pipeline Settings ──────────────────────────────────────────────────────
DEMUCS_MODEL = os.getenv("DEMUCS_MODEL", "htdemucs")
WHISPERX_MODEL = os.getenv("WHISPERX_MODEL", "large-v2")
WHISPERX_DEVICE = os.getenv("WHISPERX_DEVICE", "cpu")  # or "cuda"

# ── Server Settings ────────────────────────────────────────────────────────
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:6006").split(",")

# ── Logging ────────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
```

---

## 6.3 Dependencies (requirements.txt)

Add to the existing `requirements.txt`:

```
# Existing (from jingle_extractor.py)
requests>=2.31.0
numpy>=1.24.0
scipy>=1.11.0
librosa>=0.10.1
soundfile>=0.12.1
pydub>=0.25.1
demucs>=4.0.0
whisperx>=3.1.0
torch>=2.0.0
torchaudio>=2.0.0
ffmpeg-python>=0.2.0

# New (for the FastAPI server)
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
pydantic>=2.10.0
python-multipart>=0.0.18     # for file uploads (v2)
aiosqlite>=0.20.0            # async SQLite (optional, if we go async DB)
httpx>=0.28.0                # for async test client
pytest>=8.0.0
pytest-asyncio>=0.25.0
```

---

## 6.4 Startup Procedure

### Development

```bash
# 1. Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set environment variables (already in .envrc)
source .envrc  # or: export MINIMAX_API_KEY=...

# 4. Create data directory
mkdir -p data/tracks

# 5. Run the server
python run.py
# or: uvicorn app.main:app --reload --port 8000
```

### Verifying It Works

```bash
# Check the API docs
open http://localhost:8000/docs

# Get presets
curl http://localhost:8000/api/presets | python3 -m json.tool

# List tracks (should be empty initially)
curl http://localhost:8000/api/tracks

# Analyze an existing file
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "audio_file": "out/metal_variety/thrash_metal_01.mp3",
    "config": {
      "min_dur": 2.0, "max_dur": 4.5, "min_score": 75,
      "vocal_mode": "inst", "atk_w": 6, "end_w": 4, "nrg_w": 3, "beat_w": 3,
      "max_cand": 5, "fade_in": 8, "fade_out": 18, "fmt": "mp3", "br": 192
    }
  }'

# Poll for results
curl http://localhost:8000/api/analysis/thrash_metal_01 | python3 -m json.tool
```

---

## 6.5 Connecting the Frontend

The React frontend's `jingleApi.ts` already has `baseUrl: '/api/'`. In development, the frontend runs on port 5173 and the backend on port 8000. You need a **proxy** to avoid CORS issues.

### Option A: Vite proxy (recommended for dev)

Add to `jingle-extractor-ui/vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

Now when the frontend fetches `/api/tracks`, Vite proxies it to `http://localhost:8000/api/tracks`.

### Option B: CORS (already configured in FastAPI)

The backend allows `http://localhost:5173` via CORS middleware. The frontend can make cross-origin requests directly.

---

## 6.6 Testing Strategy

### Unit Tests (fast, no ML models)

```python
# tests/test_scoring.py

import numpy as np
from app.scoring import compute_attack_score, compute_ending_score

def test_attack_score_perfect():
    """Onset exactly at start → score 100."""
    onsets = np.array([1.0, 2.0, 3.0])
    assert compute_attack_score(1.0, onsets) == 100.0

def test_attack_score_far():
    """Onset 300ms away → score 0."""
    onsets = np.array([1.0, 2.0, 3.0])
    assert compute_attack_score(1.5, onsets) == 0.0

def test_attack_score_linear():
    """Onset 100ms away → score ~50."""
    onsets = np.array([0.0, 0.2, 0.4])
    score = compute_attack_score(0.1, onsets)
    assert 40 < score < 60
```

### Integration Tests (with test database)

```python
# tests/conftest.py

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Database
from app.config import db_path

@pytest.fixture(autouse=True)
def test_db(tmp_path, monkeypatch):
    """Use a temporary database for each test."""
    test_db_path = tmp_path / "test.db"
    monkeypatch.setattr("app.config.DATA_DIR", tmp_path)
    db = Database()
    db.create_tables()
    yield db

@pytest.fixture
def client():
    return TestClient(app)


# tests/test_presets.py

def test_get_presets(client):
    resp = client.get("/api/presets")
    assert resp.status_code == 200
    data = resp.json()
    assert "Default" in data
    assert "Short Stings" in data
    assert data["Default"]["vocal_mode"] == "inst"


# tests/test_tracks.py

def test_list_tracks_empty(client):
    resp = client.get("/api/tracks")
    assert resp.status_code == 200
    assert resp.json() == []

def test_analyze_file_not_found(client):
    resp = client.post("/api/analyze", json={
        "audio_file": "/nonexistent/file.mp3",
        "config": { ... },
    })
    assert resp.status_code == 404
```

### End-to-End Test (with real audio, manual)

Not automated — but document the steps:

```bash
# 1. Start the server
python run.py

# 2. Analyze a real file
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"audio_file": "out/metal_variety/thrash_metal_01.mp3", "config": {...}}'

# 3. Wait 5-15 minutes, then check
curl http://localhost:8000/api/analysis/thrash_metal_01 | python3 -m json.tool

# 4. Verify candidates exist
# 5. Export a clip
curl -X POST http://localhost:8000/api/export \
  -H "Content-Type: application/json" \
  -d '{"trackId": "thrash_metal_01", "candidateId": 1, "stem": "inst", "fmt": "mp3"}' \
  --output test_clip.mp3

# 6. Play the clip
ffplay test_clip.mp3
```

---

## 6.7 SQL Schema File

```sql
-- app/schema.sql

CREATE TABLE IF NOT EXISTS tracks (
    id              TEXT PRIMARY KEY,
    original_path   TEXT NOT NULL,
    inst_path       TEXT,
    vox_path        TEXT,
    duration        REAL NOT NULL DEFAULT 0,
    bpm             REAL NOT NULL DEFAULT 0,
    language        TEXT DEFAULT 'en',
    lang_conf       REAL DEFAULT 0.0,
    sr              INTEGER DEFAULT 44100,
    dr_db           REAL DEFAULT 0.0,
    status          TEXT DEFAULT 'uploaded',
    error_message   TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS timelines (
    track_id        TEXT PRIMARY KEY,
    beats_json      TEXT NOT NULL,
    rms_json        TEXT NOT NULL,
    onsets_json     TEXT,
    hop_length      INTEGER DEFAULT 512,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vocal_segments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id        TEXT NOT NULL,
    segment_idx     INTEGER NOT NULL,
    start_time      REAL NOT NULL,
    end_time        REAL NOT NULL,
    text            TEXT NOT NULL,
    confidence      REAL NOT NULL,
    words_json      TEXT,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidates (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id        TEXT NOT NULL,
    candidate_idx   INTEGER NOT NULL,
    rank            INTEGER NOT NULL,
    start_time      REAL NOT NULL,
    end_time        REAL NOT NULL,
    score           INTEGER NOT NULL,
    attack          INTEGER NOT NULL,
    ending          INTEGER NOT NULL,
    energy          INTEGER NOT NULL,
    vocal_overlap   INTEGER DEFAULT 0,
    is_best         INTEGER DEFAULT 0,
    config_hash     TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidates_track ON candidates(track_id);
CREATE INDEX IF NOT EXISTS idx_vocal_segments_track ON vocal_segments(track_id);
CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);
```
