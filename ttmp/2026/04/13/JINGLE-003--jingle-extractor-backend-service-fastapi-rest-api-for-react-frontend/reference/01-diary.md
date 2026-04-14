# Diary — JINGLE-003: Backend Service Implementation

## Goal

Implement a FastAPI REST API that wraps the existing `jingle_extractor.py` pipeline, serving the React frontend (JINGLE-002).

---

## Step 1: Scaffold + Models + Database + All Routes + Tests

**Prompt Context:**
> User prompt (verbatim): "ok, create tasks and implement. commit at appropriate intervals, when running long processes, run them in tmux to have full control over the polling and cancellation. keep a diary as you work."

**Assistant interpretation:** Implement the full JINGLE-003 backend, committing at logical intervals, using tmux for long processes, keeping this diary.

**Inferred user intent:** Get a working FastAPI server that the React frontend can talk to, tested end-to-end with real audio.

**Commit (code):** `ceee9de` — scaffold + routes + tests
**Commit (fix):** `37b05ea` — VocalWord.score optional

### What I did
- Created `jingle-extractor-backend/` with 21 Python files
- Implemented Pydantic models matching frontend `api/types.ts` exactly
- Implemented SQLite database wrapper with 4 tables (tracks, timelines, vocal_segments, candidates)
- Implemented all 7 API endpoints across 6 route modules
- Implemented scoring functions (attack, ending, energy, beat alignment)
- Implemented pipeline wrapper with `asyncio.to_thread` + `asyncio.Lock`
- Wrote 20 tests (15 scoring unit tests + 5 endpoint integration tests)
- Added Vite proxy config to frontend
- Started server in tmux, triggered analysis of thrash_metal_01
- Verified all endpoints end-to-end with real data

### Why
The frontend (JINGLE-002) runs against MSW mocks. We need a real HTTP server that runs the pipeline and serves analysis results.

### What worked
- All 20 tests pass immediately after fixing test DB isolation
- Server starts cleanly with `python run.py`
- `POST /api/analyze` → 202 Accepted → background pipeline runs through all stages (Demucs ~3min, WhisperX ~15min, analyze+mine ~5s)
- `GET /api/analysis/thrash_metal_01` → full JSON response: 150 beats, 4789 RMS values, 8 vocal segments, 5 candidates
- `POST /api/export` → valid 4-second MP3 clip (97KB)
- `POST /api/export/batch` → ZIP with 2 clips
- `POST /api/mine` → re-mines in <1 second with new config, returns 3 new candidates
- `GET /api/presets` → 4 presets matching frontend MSW handlers
- `GET /api/tracks` → lists completed tracks

### What didn't work
1. **ModuleNotFoundError: librosa** — `pipeline.py` imports from `jingle_extractor.py` at module level, which imports librosa/demucs/whisperx. Tests don't have these installed. **Fix**: lazy import in `analyze.py` route (deferred to function body).
2. **Same issue with pydub** — `export.py` imported pydub at module level. **Fix**: lazy import inside handler functions.
3. **Test DB isolation** — Routes create `Database()` using default `db_path()`, but tests patch `config.db_path` via monkeypatch. The Database class still used the real path. **Fix**: monkeypatch `Database.__init__` in conftest.
4. **VocalWord.score required** — `extract_words()` from `jingle_extractor.py` only extracts `word`/`start`/`end` but `VocalWord` model required `score`. **Fix**: made `score` optional with default `0.0`.
5. **FastAPI not in project .venv** — The project's `.venv` has librosa/demucs/whisperx but not fastapi. **Fix**: `pip install fastapi uvicorn pydantic` into the project .venv.

### What I learned
- FastAPI's `BackgroundTasks` works well for CPU-heavy pipeline — returns 202 immediately, runs in background
- `asyncio.to_thread()` is essential — without it, Demucs blocks the event loop and the server can't even serve `/api/health`
- SQLite WAL mode is critical for concurrent reads during pipeline writes
- The pipeline lock (`asyncio.Lock`) correctly serializes runs — only one at a time

### What was tricky to build
- **Test isolation**: Getting the test DB to be used by all route handlers that create `Database()` instances required monkeypatching the class `__init__`
- **Lazy imports**: ML deps (librosa, demucs, whisperx, pydub) can't be at module level or tests fail — had to defer to function bodies
- **Demucs output path**: Demucs creates `output_dir/model/song/vocals.mp3` — had to handle moving to canonical paths (`inst.mp3`/`vox.mp3`)

### What warrants a second pair of eyes
- The pipeline's `sys.path.insert(0, ...)` hack to import `jingle_extractor.py` — fragile, should be a proper package
- The scoring normalization (energy score divides by 3.0) — arbitrary, may need tuning
- The candidate filtering (min_score not applied in mine endpoint) — should filter after scoring

### What should be done in the future
- Add `min_score` filtering in the mine endpoint
- Extract language/confidence from WhisperX output
- Add SSE or WebSocket for real-time progress instead of polling
- Add file upload (multipart) instead of server-path-only
- Refactor `jingle_extractor.py` into a proper package
- Add the Vite proxy test (run frontend + backend together)

### Code review instructions
- Start with `app/main.py` → `app/routes/` → `app/pipeline.py` → `app/scoring.py`
- Verify: `cd jingle-extractor-backend && python -m pytest tests/ -v`
- Verify live: `curl http://localhost:8000/api/analysis/thrash_metal_01`

### Technical details
- Server: `tmux attach -t backend` (running on port 8000)
- Python: project's `.venv/bin/python` (has fastapi + librosa + demucs + whisperx)
- Data: `jingle-extractor-backend/data/tracks/thrash_metal_01/` (orig, inst, vox stems + lyrics_aligned.json)
- DB: `jingle-extractor-backend/data/jingle_extractor.db`
