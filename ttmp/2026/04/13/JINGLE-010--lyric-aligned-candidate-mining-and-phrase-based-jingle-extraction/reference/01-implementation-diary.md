---
Title: Implementation diary
Ticket: JINGLE-010
Status: active
Topics:
    - frontend
    - backend
    - fastapi
    - react
    - architecture
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: jingle-extractor-backend/app/routes/mine.py
      Note: Step 1 remine route switched to shared service and lyric-aligned mode
    - Path: jingle-extractor-backend/app/services/candidate_mining.py
      Note: Step 1 shared rhythmic and lyric-aligned candidate construction service
    - Path: jingle-extractor-ui/src/components/DebugPanel/DebugPanel.tsx
      Note: Step 1 UI summary now exposes candidate strategy and lyric padding
ExternalSources: []
Summary: Chronological diary for implementing lyric-aligned mining in the productized jingle extractor.
LastUpdated: 0001-01-01T00:00:00Z
WhatFor: ""
WhenToUse: ""
---


# Implementation Diary

## Goal

Capture the implementation work for bringing a first real lyric-aligned candidate miner into the current FastAPI + React application without rerunning Demucs or WhisperX for every iteration.

## Step 1: Add a first lyric-aligned mining mode that reuses stored vocal timestamps

The first implementation step was to add a new candidate construction mode that uses stored vocal segments as candidate seeds, rather than only using vocal timing as a post-hoc overlap filter on beat-generated windows.

### Prompt Context

**User prompt (verbatim excerpts):**
- "ok whatever. go ahead, and implement."
- "how is the current output of each stage stored int he db? can we rerun extraction without having to do everything (especially whisper X) stage each time?"

**Assistant interpretation:** Implement the first practical slice of JINGLE-010 now, and make sure it builds on already stored analysis data so iteration stays cheap.

### What I changed
- Added backend config support for:
  - `candidate_mode`
  - `lyric_padding_before`
  - `lyric_padding_after`
- Added a shared backend mining service:
  - `jingle-extractor-backend/app/services/candidate_mining.py`
- Moved candidate construction/scoring policy out of ad hoc route/pipeline duplication and into the shared service
- Implemented a new `lyric_aligned` mode that:
  - uses stored vocal segments as candidate seeds
  - applies configurable padding
  - automatically extends very short phrase windows up to `min_dur`
  - still uses the existing rhythmic score components for ranking
- Updated both:
  - `app/pipeline.py`
  - `app/routes/mine.py`
  to use the shared mining service
- Updated presets so `Vocal Hooks` now uses `candidate_mode = lyric_aligned`
- Updated frontend types, defaults, and config handling so the new fields round-trip through the app cleanly
- Updated the debug panel summary to show the active candidate strategy and lyric padding values
- Added a backend endpoint test proving that lyric-aligned re-mining can produce candidates from stored vocal segments without rerunning the full pipeline

### Why
This was the highest-value first implementation slice because it restores the most important missing behavior from the older manual workflow:

- lyric phrases become candidate sources
- the system can iterate using already-stored timeline/transcription data
- no full pipeline rerun is required just to test candidate selection behavior

### What worked
- Backend tests passed after the refactor and feature addition
- Frontend build still passed after the config/type changes
- The new implementation reused the stored `timelines` and `vocal_segments` data rather than depending on WhisperX reruns
- The mining logic is now more centralized than before, which makes future work safer

### What didn't work
- The local backend server was not running by the time I tried a live curl verification, so the final validation for this step relied on automated tests rather than a live tmux-backed manual request
- Lint remains in the same warnings-only Storybook state as before; no new lint errors were introduced, but the pre-existing warnings still exist

### What I learned
- The current persistence model was already strong enough to support lyric-aligned iteration without a schema migration for new analysis stages
- The main missing piece was candidate construction policy, not raw data availability
- Even a simple segment-based lyric-aligned mode becomes much more useful if short phrases are auto-extended to the configured minimum duration

### What was tricky to build
- Keeping the implementation honest required avoiding the temptation to bolt lyric-aligned logic directly into both `app/pipeline.py` and `app/routes/mine.py`; extracting a shared service first was the cleaner move
- The product still has no candidate provenance fields in the DB, so this phase had to focus on candidate construction rather than full metadata richness
- The frontend config editor needed compatibility handling so older JSON snippets without the new fields would not immediately become unusable

### What warrants a second pair of eyes
- The exact padding and short-phrase extension behavior in `app/services/candidate_mining.py`
- Whether the first `Vocal Hooks` preset defaults are now the most sensible ones for lyric-aligned mining, or whether they should be tuned further after more listening tests
- Whether we should persist candidate provenance metadata in the next phase

### Validation commands
```bash
cd jingle-extractor-backend && python3 -m pytest -q tests
cd jingle-extractor-ui && npm run build
cd jingle-extractor-ui && npm run lint
```

### Validation results
- `python3 -m pytest -q tests` → `25 passed`
- `npm run build` → passed
- `npm run lint` → warnings only, no new errors

### Files changed in this step
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/models.py`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/presets.py`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/pipeline.py`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/mine.py`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/services/candidate_mining.py`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/tests/conftest.py`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/tests/test_endpoints.py`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/api/types.ts`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/utils/constants.ts`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/mocks/handlers.ts`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/ConfigEditor/ConfigEditor.tsx`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/ConfigEditor/ConfigEditor.stories.tsx`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/DebugPanel/DebugPanel.tsx`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/api/jingleApi.test.ts`

## Step 2: Tune the first lyric-aligned preset and compare it against the rhythmic vocal-overlap miner

After the first implementation compiled and tested cleanly, I restarted the backend against the existing `thrash_metal_01` analysis data and compared the current rhythmic vocal-overlap miner against the new lyric-aligned miner using `POST /api/mine`.

### What I did
- Restarted the backend in tmux:
  ```bash
  tmux new-session -d -s backend 'cd /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend && python3 run.py'
  curl -sf http://127.0.0.1:8000/api/health
  ```
- Compared rhythmic vs lyric-aligned remine behavior on `thrash_metal_01`
- Found that the first lyric-aligned implementation was producing reasonable phrase-centered windows, but the old `Vocal Hooks` score threshold of `70` was far too high for the current rhythmic score model applied to lyric-seeded windows
- Lowered the `Vocal Hooks` preset `min_score` from `70` to `35` in backend/frontend/mock preset definitions
- Re-ran tests/build and live remine validation

### Key findings

#### Rhythmic + vocal overlap
With a vocal-only filter but still rhythmic candidate generation, the results looked like this:

```json
[
  { "rank": 1, "start": 26.006, "end": 30.006, "score": 73 },
  { "rank": 2, "start": 32.194, "end": 36.194, "score": 73 },
  { "rank": 3, "start": 15.824, "end": 19.824, "score": 72 }
]
```

These windows overlap lyrics, but they are still beat-window-first.

#### Lyric-aligned
With `candidate_mode = lyric_aligned`, the windows were instead seeded from the stored vocal segments and padded from there. After tuning the threshold, live remine returned results such as:

```json
[
  { "rank": 1, "start": 49.429, "end": 50.750, "score": 52 },
  { "rank": 2, "start": 29.335, "end": 31.516, "score": 48 },
  { "rank": 3, "start": 43.660, "end": 47.625, "score": 48 }
]
```

These are much closer to the older manual workflow in that the boundaries originate from lyric timing rather than only happening to overlap a lyric segment.

### Why the preset change was needed
The scoring model is still rhythm/attack/ending/energy-based. Once candidate construction becomes lyric-first, many windows no longer land on the same idealized onset/beat positions as the older rhythmic miner, so their overall scores are naturally lower even when the clip is qualitatively more useful for vocal-jingle extraction.

That means the old `min_score = 70` value for `Vocal Hooks` was effectively calibrated for the wrong miner. Lowering it to `35` makes the preset usable with the new lyric-aligned mode while still keeping a floor under obviously poor windows.

### Validation
- `cd jingle-extractor-backend && python3 -m pytest -q tests` → `25 passed`
- `cd jingle-extractor-ui && npm run build` → pass
- live remine call with `candidate_mode = lyric_aligned` and `min_score = 35` → returned non-empty vocal-overlapping candidates

### What warrants another pass later
- The current lyric-aligned scorer still uses only rhythmic quality dimensions; a future phase should add phrase-aware scoring so score thresholds become semantically meaningful again.
- The top-ranked lyric-aligned candidate is currently the short final `Crack` phrase in this track, which is plausible mathematically but may not be the most useful editorial result. That will need phrase-aware scoring or better preset tuning later.

## Step 3: Resolve live export 500 and verify `orig` export semantics

While manually testing the new lyric-aligned flow through the live frontend, the user reported a `500` from `POST /api/export` when exporting from the `orig` stem. The concern was whether the backend had started mixing stems behind the scenes instead of exporting from the original file.

### What I checked
- Reproduced the request through the Vite proxy
- Captured the backend tmux logs
- Confirmed that the failing line was not any mixing logic at all; the route crashed when trying to import `pydub`

The actual error was:

```text
ModuleNotFoundError: No module named 'pydub'
```

### Root cause
The backend tmux session had been started with the wrong Python interpreter:
- system `python3`
- instead of the project virtualenv Python

That meant the server process did not have the backend's runtime audio dependencies available, even though the project `.venv` did.

### What I did
- Verified `.venv/bin/python` had `pydub`
- Verified system `python3` did not
- Restarted the backend tmux session using:

```bash
tmux kill-session -t backend
tmux new-session -d -s backend \
  'cd /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend && /home/manuel/code/wesen/2026-04-13--jingle-extraction/.venv/bin/python run.py'
```

### Verification
After restarting with the correct interpreter:

```bash
curl -si http://127.0.0.1:5173/api/export \
  -H 'Content-Type: application/json' \
  -d '{
    "trackId":"thrash_metal_01",
    "candidateId":2,
    "stem":"orig",
    "fmt":"mp3",
    "fade_in":20,
    "fade_out":50,
    "br":192,
    "start":29.335,
    "end":31.516
  }'
```

returned `200 OK`, and the same request through a small Python check returned a non-empty `audio/mpeg` payload.

### Important conclusion
The backend is still behaving correctly for `stem = "orig"`:
- it resolves the original track
- slices the original track
- applies fades
- exports the result

It is **not** mixing `inst + vocal` for `orig`.

### What changed in the repo
No code changes were required for this step. This was an environment/runtime correction and live verification step only.
