# Section 1: System Overview

## 1.1 Executive Summary

The Jingle Extractor is a two-part system for **generating, analyzing, and extracting short audio clips** (jingles, stings, bumpers) from AI-generated or uploaded music:

1. **Backend** (this document) — A Python **FastAPI** web server that wraps an audio processing pipeline (MiniMax music generation → Demucs stem separation → WhisperX transcription → librosa rhythm analysis → pydub clip export). It exposes a REST API that the frontend consumes.

2. **Frontend** (JINGLE-002) — A **React + TypeScript** single-page application built with Vite, RTK Query, and Storybook. It provides a visual interface with a waveform timeline, candidate selection, drag-to-adjust handles, configuration presets, and theme switching.

The backend already exists as a command-line tool (`jingle_extractor.py`). This ticket wraps it in a web service so the React frontend can use it without shelling out to CLI commands.

**The core problem**: The React frontend currently runs against mock data (MSW handlers returning static JSON fixtures). We need a real HTTP server that:

- Accepts audio file uploads or generates music via MiniMax
- Runs the heavy processing pipeline (Demucs, WhisperX, librosa) in background workers
- Serves analysis results, candidate lists, and exported audio clips as JSON and binary responses
- Streams progress updates during long-running operations
- Manages a catalog of previously analyzed tracks

---

## 1.2 What is a "Jingle" in This System?

A **jingle** is a short audio clip (typically 1–8 seconds) extracted from a longer piece of music. The system scores candidate clips based on:

- **Attack quality**: Does the clip start on a clean transient (beat/onset)?
- **Ending quality**: Does it end cleanly on a beat with energy tapering off?
- **Energy level**: Is the RMS energy in the clip's range high enough to be interesting?
- **Beat alignment**: Do the clip boundaries align with musical beats?
- **Vocal overlap**: Does the clip contain vocals (good for hooks, bad for instrumental beds)?

The frontend displays candidates on a timeline with score bars, and the user picks the best one.

---

## 1.3 System Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              React Frontend (JINGLE-002)                 │   │
│  │                                                          │   │
│  │  RTK Query ──→ fetch('/api/...') ──→ JSON / Blob        │   │
│  │                                                          │   │
│  │  Components:                                             │   │
│  │  • MenuBar      • TransportBar      • ConfigEditor      │   │
│  │  • Timeline     • CandidateList     • CandidateDetail   │   │
│  │  • PresetPanel  • ScoreBar          • MacWindow          │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │ HTTP (REST)                            │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (JINGLE-003)                   │
│                                                                 │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │  REST API   │   │  Background  │   │   File Storage     │  │
│  │  Endpoints  │──→│  Task Queue  │──→│   (disk)           │  │
│  │  (7 routes) │   │  (asyncio)   │   │                    │  │
│  └─────────────┘   └──────┬───────┘   │  data/              │  │
│       │                   │           │  ├── tracks/        │  │
│       │                   │           │  │   └── {id}/      │  │
│       │                   │           │  │       ├── orig.* │  │
│       │                   │           │  │       ├── inst.* │  │
│       │                   │           │  │       ├── vox.*  │  │
│       │                   │           │  │       ├── clips/ │  │
│       │                   │           │  │       └── meta.* │  │
│       │                   │           │  └── exports/       │  │
│       │                   │           └────────────────────┘  │
│       │                   │                                    │
│       │           ┌───────▼────────┐                          │
│       │           │  Pipeline      │                          │
│       │           │  (existing)    │                          │
│       │           │                │                          │
│       │           │  MiniMax API   │  ← AI music generation   │
│       │           │  Demucs        │  ← stem separation       │
│       │           │  WhisperX      │  ← speech transcription  │
│       │           │  librosa       │  ← beat/onset detection  │
│       │           │  pydub         │  ← audio slicing/export  │
│       │           └────────────────┘                          │
│       │                                                       │
│  ┌────▼──────┐                                                │
│  │  SQLite   │  Track metadata, analysis state, presets       │
│  │  + WAL    │  (lightweight, no external DB needed)          │
│  └───────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
   MiniMax API    GPU/CPU for      Python ML
   (cloud)        Demucs/WhisperX  packages
```

---

## 1.4 Data Flow: The Happy Path

Here's what happens when a user clicks "Analyze" on an uploaded track:

```
  Browser                              FastAPI Server                         External / Disk
    │                                      │                                      │
    │  POST /api/analyze                   │                                      │
    │  { audio_file, config }              │                                      │
    │─────────────────────────────────────→│                                      │
    │                                      │                                      │
    │                                      │  1. Save uploaded file                │
    │                                      │     to data/tracks/{id}/orig.mp3     │
    │                                      │────────────────────────────────────→ │
    │                                      │                                      │
    │  202 Accepted                        │  2. Create Track row in SQLite       │
    │  { track_id, status: "processing" }  │     status = "separating_stems"      │
    │←─────────────────────────────────────│                                      │
    │                                      │                                      │
    │                                      │  3. Start background task:           │
    │                                      │     ┌──────────────────────┐         │
    │                                      │     │ demucs_split()       │         │
    │                                      │     │   → inst.mp3, vox.mp3│────────→│ disk
    │                                      │     │                      │         │
    │                                      │     │ whisperx_transcribe()│         │
    │                                      │     │   → segments JSON    │────────→│ disk
    │                                      │     │                      │         │
    │                                      │     │ analyze_rhythm()     │         │
    │                                      │     │   → beats, rms, bpm  │         │
    │                                      │     │                      │         │
    │                                      │     │ mine_candidates()    │         │
    │                                      │     │   → ranked list      │         │
    │                                      │     │                      │         │
    │                                      │     │ check_vocal_overlap()│         │
    │                                      │     │   → overlap flags    │         │
    │                                      │     │                      │         │
    │                                      │     │ Update SQLite:       │         │
    │                                      │     │   status = "complete"│         │
    │                                      │     └──────────────────────┘         │
    │                                      │                                      │
    │  GET /api/analysis/{track_id}        │                                      │
    │─────────────────────────────────────→│                                      │
    │                                      │                                      │
    │  200 OK                              │  Read from SQLite + disk             │
    │  { track, timeline, vocals,          │                                      │
    │    candidates }                      │                                      │
    │←─────────────────────────────────────│                                      │
    │                                      │                                      │
    │  POST /api/export                    │                                      │
    │  { track_id, candidate_id, stem }    │                                      │
    │─────────────────────────────────────→│                                      │
    │                                      │  pydub: slice + fade + encode        │
    │                                      │────────────────────────────────────→ │ disk
    │  200 OK (audio/mpeg blob)            │                                      │
    │←─────────────────────────────────────│                                      │
    │                                      │                                      │
```

---

## 1.5 The Pipeline Components (What Already Exists)

The existing `jingle_extractor.py` is a 380-line CLI tool. It has five main functions that the backend will call internally. You don't need to modify this file — the FastAPI server imports and calls its functions.

### 1.5.1 MiniMax Music Generation (`minimax_generate`)

- **What it does**: Sends a text prompt to the MiniMax cloud API, which generates a complete music track (typically 30–60 seconds).
- **Input**: Text prompt (e.g. "Thrash metal, fast aggressive riffs, 170 BPM"), optional lyrics with `[Hook]`/`[Verse]` tags, instrumental flag.
- **Output**: An MP3 or WAV file saved to disk.
- **Time**: ~10–30 seconds per track (network-bound, depends on MiniMax load).
- **External dependency**: Requires `MINIMAX_API_KEY` environment variable.

### 1.5.2 Demucs Stem Separation (`demucs_split`)

- **What it does**: Takes a full mix and separates it into **vocals** and **instrumental** (no-vocals) stems using a deep learning model.
- **Input**: Path to an audio file (MP3, WAV, etc.).
- **Output**: Two files — `vocals.mp3` and `no_vocals.mp3`.
- **Time**: ~2–5 minutes on CPU, ~10–30 seconds on GPU.
- **Why it matters**: Users want **instrumental-only jingles** (no vocals) or **vocal hooks**. The backend must separate stems before mining candidates so it can check vocal overlap.

### 1.5.3 WhisperX Transcription (`whisperx_transcribe`)

- **What it does**: Transcribes the vocals stem with **word-level timestamps** using OpenAI's Whisper model enhanced with forced alignment (wav2vec2).
- **Input**: Path to vocals audio file.
- **Output**: JSON file with segments, each containing words with `start`/`end` timestamps and confidence scores.
- **Time**: ~10–15 minutes on CPU (large-v2 model), ~30 seconds on GPU.
- **Why it matters**: The frontend shows vocal segments on the timeline so users can see where lyrics fall relative to candidate clips. It also determines `vocal_overlap` flags on candidates.

### 1.5.4 Rhythm Analysis (`analyze_rhythm`)

- **What it does**: Uses librosa to detect beats, onsets, and RMS energy envelope from the audio.
- **Input**: Path to audio file.
- **Output**: Tempo (BPM), beat timestamps, onset timestamps, RMS energy array, duration, sample rate.
- **Time**: ~2–5 seconds (fast, CPU-only).
- **Why it matters**: Beats and onsets drive the candidate mining algorithm — clips that start/end on beats score higher.

### 1.5.5 Candidate Mining (`mine_candidates`)

- **What it does**: Evaluates thousands of possible clip windows (start position × duration) and scores them on attack quality, ending quality, energy, and beat alignment. Returns the top N non-overlapping candidates.
- **Input**: Audio path, min/max duration, top N count.
- **Output**: List of `Candidate` objects with `start`, `end`, `score`, `rank`.
- **Time**: ~5–10 seconds (depends on audio length and beat density).
- **Why it matters**: This is the core algorithm — the whole point of the application.

---

## 1.6 Why FastAPI?

We chose **FastAPI** (not Flask, not Django) for specific reasons:

| Criterion | FastAPI | Flask | Django |
|-----------|---------|-------|--------|
| Async support | Native async/await | Sync (need extensions) | Limited async |
| Auto-generated docs | OpenAPI + ReDoc | Manual | Built-in but heavy |
| Type validation | Pydantic (automatic) | Manual (Marshmallow) | Django forms |
| Background tasks | Built-in `BackgroundTasks` | Need Celery | Need Celery |
| WebSocket support | Native | Extensions | Channels |
| Performance | High (Starlette/Uvicorn) | Medium | Medium |
| Learning curve | Low (if you know Python types) | Low | Medium-High |

The key reason: **background tasks**. The audio pipeline takes minutes. FastAPI's `BackgroundTasks` lets us return a `202 Accepted` immediately and process in the background. For production scaling, we can upgrade to Celery + Redis later.

---

## 1.7 Technology Stack

```
Layer              Technology           Version    Why
─────────────────  ───────────────────  ────────   ───────────────────────
Web framework      FastAPI              0.115+     Async, auto-docs, Pydantic
ASGI server        Uvicorn              0.34+      Production-grade async server
Data validation    Pydantic v2          2.10+      Request/response schemas
Database           SQLite + aiosqlite   3.45+      Zero-config, file-based
ORM (optional)     SQLAlchemy 2.0       2.0+       If we outgrow raw SQL
Audio processing   librosa              0.10+      Beat/onset detection
Audio processing   pydub                0.25+      Slicing, fading, export
Stem separation    demucs               4.0+       Vocal/instrumental split
Transcription      whisperx             3.1+       Word-level timestamps
AI generation      MiniMax API          music-2.6  Cloud-based music gen
Task queue         asyncio.BackgroundTasks         Simple; Celery later
Testing            pytest + httpx       Latest     Async test client
```

---

## 1.8 Key Design Decisions

### D1: SQLite over PostgreSQL

**Decision**: Use SQLite with WAL mode for local development and single-server deployment.

**Rationale**:
- The application manages a catalog of tracks (tens to hundreds, not millions).
- SQLite requires zero setup — no Docker, no connection strings, no migrations framework.
- WAL mode allows concurrent reads while a write is in progress.
- If we need to scale to multi-server, we can swap to PostgreSQL with minimal code changes (SQLAlchemy makes this easy).

**Trade-off**: No concurrent writes from multiple processes. Acceptable because the heavy lifting is in background tasks (single worker).

### D2: File-based audio storage over cloud storage

**Decision**: Store audio files on local disk under `data/tracks/{track_id}/`.

**Rationale**:
- Audio files are large (5–50 MB each). Database BLOBs would bloat SQLite.
- Demucs and librosa need file paths, not byte streams.
- For local development and single-server deployment, disk is simplest.

**Trade-off**: Not horizontally scalable. If we need S3, we add an abstraction layer.

### D3: Background tasks via FastAPI (not Celery)

**Decision**: Use FastAPI's built-in `BackgroundTasks` for v1.

**Rationale**:
- Simpler setup — no Redis, no worker processes.
- The pipeline is sequential (Demucs → WhisperX → analyze → mine), so a single background coroutine per track is sufficient.
- Progress tracking via polling (`GET /api/analysis/{id}` returns `status` field).

**Trade-off**: If the server restarts, in-flight background tasks are lost. For v2, we can upgrade to Celery + Redis with persistent task queues.

### D4: No authentication for v1

**Decision**: No login, no JWT, no API keys for the initial implementation.

**Rationale**: This is a local development tool / single-user application. The frontend and backend run on the same machine. Authentication can be added later via FastAPI's `Depends()` middleware.

**Trade-off**: Not safe to expose on the public internet without an auth layer.

### D5: SSE for progress (v2), polling for v1

**Decision**: v1 uses polling (`GET /api/analysis/{id}` returns current status). v2 will use Server-Sent Events (SSE) for real-time progress.

**Rationale**: Polling is simpler and the frontend already has the `useGetAnalysisQuery` hook that re-fetches periodically via RTK Query's `pollingInterval`.

---

## 1.9 Glossary

| Term | Definition |
|------|-----------|
| **Track** | A complete piece of music (30–60 seconds). Either uploaded by the user or generated by MiniMax. |
| **Stem** | An isolated audio channel. `orig` = full mix, `inst` = instrumental (no vocals), `vox` = vocals only. |
| **Candidate** | A scored time window within a track that might make a good jingle. Has start/end times, scores, rank. |
| **Jingle** | The final exported audio clip — a candidate that the user selected and exported. |
| **Preset** | A named configuration (e.g. "Short Stings", "Long Beds") that sets mining parameters. |
| **Mining** | The algorithm that evaluates all possible clip windows and ranks them by quality. |
| **Onset** | A transient detection — a sudden change in energy that often corresponds to a note hit or drum strike. |
| **Beat** | A regularly-spaced rhythmic pulse detected by librosa, corresponding to the musical tempo. |
| **RMS** | Root Mean Square — a measure of average energy in an audio signal. Used to compute the energy envelope. |
| **Fade in/out** | A brief volume ramp at clip boundaries to prevent audio clicks. Typically 20ms in, 50ms out. |
