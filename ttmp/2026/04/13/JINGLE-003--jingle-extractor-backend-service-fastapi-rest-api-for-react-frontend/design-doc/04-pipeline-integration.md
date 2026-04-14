# Section 4: Pipeline Integration

This section explains how the FastAPI server wraps the existing `jingle_extractor.py` CLI tool. The key challenge: the pipeline is **CPU/GPU-heavy** (Demucs takes minutes, WhisperX takes 10+ minutes on CPU) while HTTP requests must return quickly.

---

## 4.1 The Problem: Blocking vs. Non-Blocking

A naive approach would call `demucs_split()` directly in the request handler:

```python
# ❌ BAD — blocks the entire server for minutes
@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    stems = demucs_split(req.audio_file, ...)    # 2-5 minutes!
    transcription = whisperx_transcribe(...)      # 10-15 minutes!
    candidates = mine_candidates(...)             # 5-10 seconds
    return AnalysisResponse(...)
```

This blocks the async event loop. While one user's track is being processed, no other requests can be served. The browser's fetch() would time out.

**The solution**: Return `202 Accepted` immediately, then process in a background task.

---

## 4.2 Background Task Architecture

FastAPI provides two mechanisms for background work:

### Option A: `BackgroundTasks` (v1 — our choice)

Simple, built-in, no external dependencies. The function runs in the same process after the response is sent.

```python
from fastapi import BackgroundTasks

@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    track_id = derive_track_id(req.audio_file)

    # Create DB record immediately
    db.create_track(track_id, status="uploaded")

    # Schedule the heavy work
    background_tasks.add_task(run_pipeline, track_id, req.audio_file, req.config)

    # Return immediately
    return AnalyzeAcceptedResponse(track_id=track_id, status="uploaded")
```

**Pros**: Zero setup, runs in-process, can access the same DB.
**Cons**: Lost on server restart, blocks the event loop during CPU work (but we solve this with `asyncio.to_thread`).

### Option B: Celery + Redis (v2 — future upgrade)

A proper task queue with persistence, retry, and multi-worker support:

```python
from celery import Celery

@celery.task(bind=True)
def run_pipeline_task(self, track_id, audio_file, config):
    # ... same pipeline logic ...
    self.update_state(state="PROGRESS", meta={"step": "separating", "pct": 20})
```

We don't need this for v1, but the architecture should make this upgrade easy by keeping the pipeline logic in a separate service module.

---

## 4.3 The Pipeline Service

Create a `pipeline.py` module that wraps `jingle_extractor.py` functions with database state management:

```python
# app/pipeline.py

import asyncio
import json
import logging
from pathlib import Path

import numpy as np

# Import from the existing CLI tool
from jingle_extractor import (
    demucs_split,
    whisperx_transcribe,
    analyze_rhythm,
    mine_candidates,
    extract_words,
)

from app.database import Database
from app.config import track_dir, stem_path, clips_dir
from app.models import AnalysisStatus, StemType

logger = logging.getLogger(__name__)


async def run_pipeline(
    track_id: str,
    audio_path: str,
    config,  # AnalysisConfig
) -> None:
    """
    Full analysis pipeline — runs in background.
    
    Steps:
    1. Demucs stem separation
    2. WhisperX transcription (on vocals stem)
    3. Rhythm analysis (beats, onsets, RMS on instrumental)
    4. Candidate mining with config weights
    5. Vocal overlap checking
    6. Persist results to database
    """
    db = Database()
    tdir = track_dir(track_id)
    tdir.mkdir(parents=True, exist_ok=True)

    try:
        # ── Step 1: Stem Separation ──────────────────────────────
        db.update_status(track_id, AnalysisStatus.SEPARATING)
        logger.info(f"[{track_id}] Starting Demucs stem separation...")

        # Run in thread pool to avoid blocking the event loop
        stems = await asyncio.to_thread(
            demucs_split,
            Path(audio_path),
            tdir,
        )

        # Move Demucs outputs to our canonical paths
        # Demucs creates: tdir/htdemucs/{song}/vocals.mp3 and no_vocals.mp3
        # We want: tdir/inst.mp3 and tdir/vox.mp3
        inst_dest = tdir / "inst.mp3"
        vox_dest = tdir / "vox.mp3"
        if not inst_dest.exists():
            stems["no_vocals"].rename(inst_dest)
        if not vox_dest.exists():
            stems["vocals"].rename(vox_dest)

        db.update_stems(track_id, str(inst_dest), str(vox_dest))

        # ── Step 2: WhisperX Transcription ───────────────────────
        db.update_status(track_id, AnalysisStatus.TRANSCRIBING)
        logger.info(f"[{track_id}] Starting WhisperX transcription...")

        vocal_segments = []
        language = "en"
        lang_conf = 0.0

        try:
            lyrics_json = tdir / "lyrics_aligned.json"
            await asyncio.to_thread(
                whisperx_transcribe,
                vox_dest,
                lyrics_json,
            )
            words = extract_words(lyrics_json)
            # Group words into segments (gap > 0.5s = new segment)
            vocal_segments = group_words_into_segments(words)
            # TODO: extract language from WhisperX output

        except Exception as e:
            logger.warning(f"[{track_id}] Transcription failed (instrumental?): {e}")
            # Not fatal — continue without vocals

        # ── Step 3: Rhythm Analysis ──────────────────────────────
        db.update_status(track_id, AnalysisStatus.ANALYZING)
        logger.info(f"[{track_id}] Starting rhythm analysis...")

        rhythm = await asyncio.to_thread(
            analyze_rhythm,
            inst_dest,
        )

        # ── Step 4: Update track metadata ────────────────────────
        db.update_track_metadata(
            track_id,
            duration=rhythm["duration"],
            bpm=rhythm["tempo"],
            language=language,
            lang_conf=lang_conf,
            sr=rhythm["sr"],
            dr_db=compute_dynamic_range(rhythm["rms"]),
        )

        # ── Step 5: Store timeline data ──────────────────────────
        db.upsert_timeline(
            track_id,
            beats=rhythm["beat_times"],
            rms=rhythm["rms"],
            onsets=rhythm["onset_times"],
            hop_length=rhythm["hop"],
        )

        # ── Step 6: Store vocal segments ─────────────────────────
        db.delete_vocal_segments(track_id)
        for seg in vocal_segments:
            db.insert_vocal_segment(track_id, seg)

        # ── Step 7: Mine candidates ──────────────────────────────
        db.update_status(track_id, AnalysisStatus.MINING)
        logger.info(f"[{track_id}] Mining candidates...")

        raw_candidates = await asyncio.to_thread(
            mine_candidates,
            inst_dest,
            min_len=config.min_dur,
            max_len=config.max_dur,
            top_n=config.max_cand,
        )

        # ── Step 8: Compute subscores and vocal overlap ──────────
        candidates = []
        beat_arr = rhythm["beat_times"]
        onset_arr = rhythm["onset_times"]
        rms_arr = rhythm["rms"]
        sr = rhythm["sr"]
        hop = rhythm["hop"]

        for i, raw in enumerate(raw_candidates):
            # Compute subscores (0-100 scale)
            attack_score = compute_attack_score(raw.start, onset_arr)
            ending_score = compute_ending_score(raw.end, onset_arr, beat_arr, rms_arr, sr, hop)
            energy_score = compute_energy_score(raw.start, raw.end, rms_arr, sr, hop)
            beat_score = compute_beat_score(raw.start, raw.end, beat_arr)

            # Weighted combination
            total_weight = config.atk_w + config.end_w + config.nrg_w + config.beat_w
            overall = (
                (attack_score * config.atk_w +
                 ending_score * config.end_w +
                 energy_score * config.nrg_w +
                 beat_score * config.beat_w)
                / total_weight
            ) if total_weight > 0 else 0

            # Check vocal overlap
            overlap = any(
                raw.start < seg_end and raw.end > seg_start
                for seg_start, seg_end in [(s["start"], s["end"]) for s in vocal_segments]
            )

            # Filter by vocal_mode
            if config.vocal_mode == "inst" and overlap:
                continue
            if config.vocal_mode == "vocal" and not overlap:
                continue

            candidates.append({
                "idx": i + 1,
                "rank": 0,  # assigned after sorting
                "start": raw.start,
                "end": raw.end,
                "score": int(overall),
                "attack": int(attack_score),
                "ending": int(ending_score),
                "energy": int(energy_score),
                "vocal_overlap": overlap,
            })

        # Sort by score, assign ranks
        candidates.sort(key=lambda c: c["score"], reverse=True)
        for rank, cand in enumerate(candidates[:config.max_cand], start=1):
            cand["rank"] = rank
            cand["best"] = (rank == 1)

        # ── Step 9: Store candidates ─────────────────────────────
        db.delete_candidates(track_id)
        for cand in candidates[:config.max_cand]:
            db.insert_candidate(track_id, cand)

        # ── Done! ────────────────────────────────────────────────
        db.update_status(track_id, AnalysisStatus.COMPLETE)
        logger.info(f"[{track_id}] Pipeline complete. {len(candidates)} candidates.")

    except Exception as e:
        logger.error(f"[{track_id}] Pipeline failed: {e}", exc_info=True)
        db.update_status(track_id, AnalysisStatus.FAILED, error_message=str(e))
```

---

## 4.4 Why `asyncio.to_thread`?

The pipeline functions (`demucs_split`, `whisperx_transcribe`, etc.) are **synchronous** — they use CPU/GPU and block the calling thread. If we call them directly in a FastAPI handler, they block the **async event loop**, preventing the server from handling other requests.

`asyncio.to_thread()` runs a synchronous function in a **thread pool executor**, allowing the event loop to continue serving other requests while the heavy work happens in a separate thread.

```
Main thread (async event loop):
    ├── Accepts POST /api/analyze → returns 202
    ├── Accepts GET /api/analysis/xxx → returns current status
    ├── Accepts GET /api/presets → returns presets
    └── ...

Thread pool:
    ├── Thread 1: demucs_split(thrash_metal_01)
    │   (running for 3 minutes)
    └── Thread 2: demucs_split(doom_metal_01)
        (queued until Thread 1 finishes)
```

**Default thread pool size**: Python's `asyncio.to_thread` uses `ThreadPoolExecutor` with `min(32, os.cpu_count() + 4)` workers. For CPU-heavy tasks like Demucs, we probably want to limit concurrency to 1–2 to avoid OOM. This is configurable.

---

## 4.5 Progress Tracking

The frontend polls `GET /api/analysis/{track_id}` to check progress. The `status` field tells the user which step is running.

### Status State Machine

```
                  ┌──────────┐
                  │ uploaded │
                  └────┬─────┘
                       │ demucs_split() starts
                  ┌────▼─────────────┐
                  │ separating_stems │  ← 2-5 min
                  └────┬─────────────┘
                       │ demucs_split() completes
                  ┌────▼────────────┐
                  │ transcribing    │  ← 10-15 min CPU / 30s GPU
                  └────┬────────────┘
                       │ whisperx_transcribe() completes
                  ┌────▼──────────────┐
                  │ analyzing_rhythm  │  ← 2-5 seconds
                  └────┬──────────────┘
                       │ analyze_rhythm() completes
                  ┌────▼────────────────┐
                  │ mining_candidates   │  ← 5-10 seconds
                  └────┬────────────────┘
                       │ mine_candidates() completes
                  ┌────▼──────┐
                  │ complete  │
                  └───────────┘

       Any step can transition to:
                  ┌───────┐
                  │ failed │  (with error_message)
                  └───────┘
```

### Frontend Polling

RTK Query supports automatic polling:

```typescript
// In the frontend component:
const { data, isLoading } = useGetAnalysisQuery(trackId, {
  pollingInterval: data?.status !== 'complete' ? 3000 : 0, // poll every 3s while processing
});
```

This is not yet implemented in the frontend — it's a v2 enhancement. For now, the frontend calls `useGetAnalysisQuery` once and expects either full data or a 404.

---

## 4.6 Re-Mining: The Fast Path

When the user changes config sliders and clicks "Re-mine", the frontend calls `POST /api/mine`. This does **not** re-run the full pipeline — it only re-evaluates candidates using stored data.

```python
async def remine_candidates(track_id: str, config: AnalysisConfig) -> list[Candidate]:
    """
    Re-mine candidates from stored analysis data.
    Does NOT re-run Demucs or WhisperX.
    """
    db = Database()

    # Load stored data
    timeline = db.get_timeline(track_id)
    segments = db.get_vocal_segments(track_id)
    track = db.get_track(track_id)

    beats = np.array(json.loads(timeline["beats_json"]))
    rms = np.array(json.loads(timeline["rms_json"]))
    onsets = np.array(json.loads(timeline["onsets_json"])) if timeline["onsets_json"] else np.array([])

    # Build candidate windows from beats
    raw = build_candidates_from_data(beats, onsets, rms, track.sr, 512, config)

    # Score, filter, rank — same logic as the full pipeline steps 7-9
    candidates = score_and_rank(raw, segments, config)

    # Store new candidates
    db.delete_candidates(track_id)
    for cand in candidates:
        db.insert_candidate(track_id, cand)

    return candidates
```

**Time**: ~1-5 seconds (no ML inference, just numpy math).

---

## 4.7 Error Handling in Background Tasks

Background tasks in FastAPI run outside the normal request/response cycle. If they throw an exception, the client never sees it — the 202 was already sent.

**Solution**: Wrap the entire pipeline in a try/except that updates the database status to `failed`:

```python
try:
    run_pipeline_steps(...)
    db.update_status(track_id, "complete")
except Exception as e:
    logger.exception(f"Pipeline failed for {track_id}")
    db.update_status(track_id, "failed", error_message=str(e))
```

The frontend sees `status: "failed"` when it polls and can display the error message.

---

## 4.8 Concurrency: One Pipeline at a Time

Demucs and WhisperX are memory-intensive (2-8 GB GPU/CPU RAM). Running multiple pipelines simultaneously would likely OOM the machine.

**v1 solution**: Use an `asyncio.Lock` to serialize pipeline runs:

```python
pipeline_lock = asyncio.Lock()

async def run_pipeline(track_id, audio_path, config):
    async with pipeline_lock:
        # Only one pipeline runs at a time
        await _run_pipeline_inner(track_id, audio_path, config)
```

**v2 solution**: Celery with `--concurrency=1` worker, plus a task queue that users can see.

---

## 4.9 Importing from jingle_extractor.py

The existing `jingle_extractor.py` is a standalone script with no package structure. To import from it:

**Option A**: Add the project root to `sys.path`:

```python
# app/pipeline.py
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from jingle_extractor import demucs_split, whisperx_transcribe, ...
```

**Option B** (recommended): Refactor `jingle_extractor.py` into a proper package:

```
jingle_extractor/
    __init__.py
    generation.py    ← minimax_generate()
    separation.py    ← demucs_split()
    transcription.py ← whisperx_transcribe()
    analysis.py      ← analyze_rhythm(), mine_candidates()
    export.py        ← export_candidates()
    utils.py         ← ensure_dir(), safe_stem(), run(), nearest_distance(), mean_rms()
    cli.py           ← build_parser(), cmd_generate(), cmd_analyze(), cmd_full()
```

This makes imports clean: `from jingle_extractor.separation import demucs_split`.

For v1, Option A is fine. For v2, refactor.
