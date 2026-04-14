# Section 3: Data Models

This section defines the Pydantic models (request/response schemas), the SQLite table structure, and the file storage layout. Every model maps directly to a TypeScript interface in the frontend's `api/types.ts`.

---

## 3.1 Pydantic Models (Request/Response Schemas)

Pydantic models serve three purposes in FastAPI:
1. **Request validation** — FastAPI automatically validates incoming JSON against these models and returns `422 Unprocessable Entity` if fields are missing or wrong types.
2. **Response serialization** — FastAPI converts model instances to JSON for the response body.
3. **Auto-generated documentation** — The OpenAPI/Swagger docs at `/docs` show these schemas.

### 3.1.1 Enums

```python
# app/models.py

from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional

class VocalMode(str, Enum):
    """Which candidates to include based on vocal content."""
    ANY = "any"        # include all candidates regardless of vocals
    INST = "inst"      # only instrumental (no vocal overlap)
    VOCAL = "vocal"    # only those with vocal overlap

class ExportFormat(str, Enum):
    """Audio export format."""
    MP3 = "mp3"
    WAV = "wav"

class StemType(str, Enum):
    """Which audio stem to use for export."""
    ORIG = "orig"      # full mix
    INST = "inst"      # instrumental (no vocals)
    VOX = "vox"        # vocals only

class AnalysisStatus(str, Enum):
    """Processing state of an analysis job."""
    UPLOADED = "uploaded"
    SEPARATING = "separating_stems"
    TRANSCRIBING = "transcribing"
    ANALYZING = "analyzing_rhythm"
    MINING = "mining_candidates"
    COMPLETE = "complete"
    FAILED = "failed"
```

### 3.1.2 Track Metadata

```python
class Track(BaseModel):
    """Static metadata about an analyzed audio track."""
    id: str                     # unique identifier (filename stem)
    duration: float             # total length in seconds
    bpm: float                  # estimated tempo
    language: str               # ISO 639-1 code (e.g. "en")
    lang_conf: float            # language detection confidence 0.0–1.0
    sr: int                     # sample rate in Hz (e.g. 44100)
    dr_db: float                # dynamic range in dB
```

**Maps to**: `Track` in `api/types.ts`

### 3.1.3 Timeline Data

```python
class TimelineData(BaseModel):
    """Time-series data for waveform display."""
    duration: float             # same as track.duration
    beats: list[float]          # beat timestamps in seconds
    rms: list[float]            # RMS energy envelope (one per hop)
    onsets: Optional[list[float]] = None  # onset timestamps (optional)
```

**Maps to**: `TimelineData` in `api/types.ts`

### 3.1.4 Vocal Transcription

```python
class VocalWord(BaseModel):
    """A single word with timing and confidence."""
    word: str
    start: float                # seconds
    end: float                  # seconds
    score: float                # 0.0–1.0 from wav2vec2 alignment

class VocalSegment(BaseModel):
    """A continuous phrase of closely-spaced words."""
    id: int                     # segment number (1-based)
    start: float                # seconds
    end: float                  # seconds
    text: str                   # joined words
    conf: float                 # average confidence 0.0–1.0
    words: Optional[list[VocalWord]] = None

class VocalsData(BaseModel):
    """All vocal segments from WhisperX transcription."""
    segments: list[VocalSegment]
```

**Maps to**: `VocalWord`, `VocalSegment`, `VocalsData` in `api/types.ts`

### 3.1.5 Candidates

```python
class Candidate(BaseModel):
    """A scored jingle candidate."""
    id: int                     # candidate number (1-based)
    rank: int                   # quality rank (1 = best)
    start: float                # seconds
    end: float                  # seconds
    score: int                  # 0–100 overall quality
    attack: int                 # 0–100 attack quality
    ending: int                 # 0–100 ending quality
    energy: int                 # 0–100 energy level
    vocal_overlap: bool         # does it overlap with vocals?
    best: bool                  # true for the single top candidate
```

**Maps to**: `Candidate` in `api/types.ts`

### 3.1.6 Analysis Configuration

```python
class AnalysisConfig(BaseModel):
    """Parameters controlling candidate mining and export."""
    min_dur: float = Field(ge=0.1, le=60.0, description="Min clip duration (s)")
    max_dur: float = Field(ge=0.1, le=60.0, description="Max clip duration (s)")
    min_score: int = Field(ge=0, le=100, description="Min quality score")
    vocal_mode: VocalMode = VocalMode.INST
    atk_w: int = Field(ge=0, le=20, description="Attack weight")
    end_w: int = Field(ge=0, le=20, description="Ending weight")
    nrg_w: int = Field(ge=0, le=20, description="Energy weight")
    beat_w: int = Field(ge=0, le=20, description="Beat alignment weight")
    max_cand: int = Field(ge=1, le=50, description="Max candidates to return")
    fade_in: int = Field(ge=0, le=1000, description="Fade-in duration (ms)")
    fade_out: int = Field(ge=0, le=1000, description="Fade-out duration (ms)")
    fmt: ExportFormat = ExportFormat.MP3
    br: Optional[int] = Field(None, ge=64, le=320, description="Bitrate (kbps), null for WAV")

    class Config:
        # Pydantic v2: use model_config instead
        json_schema_extra = {
            "example": {
                "min_dur": 2.0, "max_dur": 4.5, "min_score": 75,
                "vocal_mode": "inst", "atk_w": 6, "end_w": 4,
                "nrg_w": 3, "beat_w": 3, "max_cand": 5,
                "fade_in": 8, "fade_out": 18, "fmt": "mp3", "br": 192
            }
        }
```

**Maps to**: `AnalysisConfig` in `api/types.ts`

**Key insight**: The `Field(ge=..., le=...)` constraints mean FastAPI automatically rejects out-of-range values with a `422` error. The frontend doesn't need to validate these — the backend does it.

### 3.1.7 Request Models

```python
class AnalyzeRequest(BaseModel):
    """POST /api/analyze request body."""
    audio_file: str = Field(description="Path to audio file on server")
    config: AnalysisConfig

class MineRequest(BaseModel):
    """POST /api/mine request body."""
    trackId: str = Field(description="Track identifier")
    config: AnalysisConfig

class ExportRequest(BaseModel):
    """POST /api/export request body."""
    trackId: str
    candidateId: int
    stem: StemType
    fmt: ExportFormat

class ExportBatchRequest(BaseModel):
    """POST /api/export/batch request body."""
    trackId: str
    candidates: list[int]
    stem: StemType
    fmt: ExportFormat
```

### 3.1.8 Response Models

```python
class AnalysisResponse(BaseModel):
    """GET /api/analysis/{track_id} response."""
    track: Track
    timeline: TimelineData
    vocals: VocalsData
    candidates: list[Candidate]

class AnalyzeAcceptedResponse(BaseModel):
    """POST /api/analyze 202 response."""
    track_id: str
    status: AnalysisStatus
```

---

## 3.2 SQLite Schema

SQLite stores metadata and processing state. Audio files live on disk (see §3.3).

```sql
-- Tracks: one row per analyzed audio file
CREATE TABLE tracks (
    id              TEXT PRIMARY KEY,           -- e.g. "thrash_metal_01"
    original_path   TEXT NOT NULL,              -- path to original audio file
    inst_path       TEXT,                       -- path to instrumental stem
    vox_path        TEXT,                       -- path to vocals stem
    duration        REAL NOT NULL,              -- seconds
    bpm             REAL NOT NULL,              -- estimated tempo
    language        TEXT DEFAULT 'en',          -- ISO 639-1
    lang_conf       REAL DEFAULT 0.0,           -- confidence 0.0–1.0
    sr              INTEGER DEFAULT 44100,      -- sample rate
    dr_db           REAL DEFAULT 0.0,           -- dynamic range
    status          TEXT DEFAULT 'uploaded',    -- processing state
    error_message   TEXT,                       -- if status = 'failed'
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- Timeline data: beats, RMS, onsets for a track
CREATE TABLE timelines (
    track_id        TEXT PRIMARY KEY REFERENCES tracks(id),
    beats_json      TEXT NOT NULL,              -- JSON array of floats
    rms_json        TEXT NOT NULL,              -- JSON array of floats
    onsets_json     TEXT,                       -- JSON array of floats (nullable)
    hop_length      INTEGER DEFAULT 512,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- Vocal segments from WhisperX
CREATE TABLE vocal_segments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id        TEXT NOT NULL REFERENCES tracks(id),
    segment_idx     INTEGER NOT NULL,           -- 1-based segment number
    start_time      REAL NOT NULL,
    end_time        REAL NOT NULL,
    text            TEXT NOT NULL,
    confidence      REAL NOT NULL,
    words_json      TEXT,                       -- JSON array of VocalWord
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- Candidates: scored time windows
CREATE TABLE candidates (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id        TEXT NOT NULL REFERENCES tracks(id),
    candidate_idx   INTEGER NOT NULL,           -- 1-based within this track
    rank            INTEGER NOT NULL,
    start_time      REAL NOT NULL,
    end_time        REAL NOT NULL,
    score           INTEGER NOT NULL,           -- 0–100
    attack          INTEGER NOT NULL,           -- 0–100
    ending          INTEGER NOT NULL,           -- 0–100
    energy          INTEGER NOT NULL,           -- 0–100
    vocal_overlap   INTEGER DEFAULT 0,          -- 0/1 boolean
    is_best         INTEGER DEFAULT 0,          -- 0/1 boolean
    config_hash     TEXT,                       -- hash of the config used to mine
    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- Index for common queries
CREATE INDEX idx_candidates_track ON candidates(track_id);
CREATE INDEX idx_vocal_segments_track ON vocal_segments(track_id);
CREATE INDEX idx_tracks_status ON tracks(status);
```

### Why JSON columns for arrays?

Beats, RMS, and onset arrays contain hundreds of float values. Storing them as JSON text in SQLite is simpler than a separate `beat_events` table with one row per beat. The overhead of `json.loads()` / `json.dumps()` is negligible for arrays of this size (<1000 elements).

Alternative considered: SQLite's JSON1 extension (`json_extract()`). We don't query inside these arrays — we always load the full array — so plain TEXT columns are fine.

---

## 3.3 File Storage Layout

Audio files are stored on disk under a configurable `DATA_DIR` (default: `./data`).

```
data/
├── tracks/
│   ├── thrash_metal_01/
│   │   ├── orig.mp3              ← original uploaded/generated file
│   │   ├── inst.mp3              ← Demucs: instrumental stem
│   │   ├── vox.mp3               ← Demucs: vocals stem
│   │   ├── analysis.json         ← cached full analysis (optional)
│   │   └── clips/
│   │       ├── clip_01.mp3       ← exported candidate clips (generated on demand)
│   │       └── clip_02.mp3
│   ├── doom_metal_01/
│   │   ├── orig.mp3
│   │   ├── inst.mp3
│   │   └── vox.mp3
│   └── ...
├── exports/                       ← batch export zip files (temporary)
│   └── thrash_metal_01_20260413_143022.zip
└── jingle_extractor.db            ← SQLite database file
```

### Path Resolution

```python
# app/config.py
DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))

def track_dir(track_id: str) -> Path:
    return DATA_DIR / "tracks" / track_id

def stem_path(track_id: str, stem: StemType) -> Path:
    """Return path to a stem file."""
    d = track_dir(track_id)
    mapping = {
        StemType.ORIG: "orig.mp3",
        StemType.INST: "inst.mp3",
        StemType.VOX:  "vox.mp3",
    }
    return d / mapping[stem]

def clips_dir(track_id: str) -> Path:
    return track_dir(track_id) / "clips"

def db_path() -> Path:
    return DATA_DIR / "jingle_extractor.db"
```

---

## 3.4 Model ↔ TypeScript Mapping

Every Pydantic model maps to a TypeScript interface in the frontend. Here's the correspondence:

| Pydantic Model | TypeScript Interface | File |
|----------------|---------------------|------|
| `Track` | `Track` | `api/types.ts` |
| `TimelineData` | `TimelineData` | `api/types.ts` |
| `VocalWord` | `VocalWord` | `api/types.ts` |
| `VocalSegment` | `VocalSegment` | `api/types.ts` |
| `VocalsData` | `VocalsData` | `api/types.ts` |
| `Candidate` | `Candidate` | `api/types.ts` |
| `AnalysisConfig` | `AnalysisConfig` | `api/types.ts` |
| `AnalysisResponse` | `AnalysisResponse` | `api/types.ts` |

**Key rule**: The JSON key names must match **exactly**. Python's `snake_case` fields would serialize as `snake_case` by default, but the frontend expects `camelCase` in some places (e.g., `trackId` not `track_id` in request bodies).

**Solution**: Use Pydantic's `alias` feature or configure `populate_by_name=True`:

```python
class MineRequest(BaseModel):
    track_id: str = Field(alias="trackId")  # accept both trackId and track_id
    config: AnalysisConfig

    model_config = ConfigDict(populate_by_name=True)
```

For response models, the frontend expects `snake_case` (e.g., `vocal_overlap`, `min_dur`) so no aliasing needed there. Check `api/types.ts` to confirm — **yes, the frontend uses snake_case for API fields** (e.g., `vocal_overlap`, `min_dur`, `lang_conf`).
