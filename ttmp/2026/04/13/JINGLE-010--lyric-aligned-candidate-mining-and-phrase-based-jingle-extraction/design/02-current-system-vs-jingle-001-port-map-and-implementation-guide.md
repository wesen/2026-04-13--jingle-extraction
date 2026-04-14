---
Title: Current System vs JINGLE-001 Port Map and Lyric-Aligned Mining Implementation Guide
Ticket: JINGLE-010
Status: active
Topics:
    - frontend
    - backend
    - architecture
    - fastapi
    - react
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: jingle-extractor-backend/app/models.py
      Note: Current API/config model surface relevant to candidate strategy design
    - Path: jingle-extractor-backend/app/pipeline.py
      Note: Current productized analysis pipeline showing lyric storage and rhythm-first mining
    - Path: jingle-extractor-backend/app/routes/export.py
      Note: Current export semantics and lack of mixed render mode
    - Path: jingle-extractor-backend/app/routes/mine.py
      Note: Current re-mine endpoint that uses lyric overlap as a filter rather than a candidate source
    - Path: jingle-extractor-ui/src/components/DebugPanel/DebugPanel.tsx
      Note: Current debug UI comparing lyric and jingle timestamps
    - Path: jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx
      Note: Current frontend orchestration for analyze/remine/preview/export
    - Path: jingle-extractor-ui/src/features/analysis/analysisSlice.ts
      Note: Current UI config state and absence of explicit candidate strategy
    - Path: jingle_extractor.py
      Note: Legacy JINGLE-001 CLI pipeline and rhythm-first candidate miner reference
    - Path: out/vocal_jingles/README.md
      Note: Legacy phrase-centered vocal/inst/mixed outputs and padding policy
    - Path: ttmp/2026/04/13/JINGLE-001--jingle-extractor-with-minimax-demucs-whisperx/reference/01-diary.md
      Note: Original diary documenting the manual phrase-centered vocal-jingle workflow
ExternalSources: []
Summary: Exhaustive onboarding guide describing the old JINGLE-001 pipeline, what was and was not ported into the current FastAPI + React product, why the current vocal behavior differs from earlier manual runs, and how to implement the missing lyric-aligned workflow.
LastUpdated: 0001-01-01T00:00:00Z
WhatFor: ""
WhenToUse: ""
---


# Current System vs JINGLE-001 Port Map and Lyric-Aligned Mining Implementation Guide

## Executive Summary

This document explains, in practical onboarding terms, how the current jingle extraction product works, how it differs from the original JINGLE-001 manual workflow, and exactly which parts of the older work were not yet ported into the React + FastAPI application.

The key architectural conclusion is straightforward:

- the current productized system is **rhythm-first and vocal-aware**
- the earlier manual vocal-jingle workflow was **phrase-first and lyric-aligned**

That distinction matters because the current backend does not construct candidate windows from lyric phrase boundaries. Instead, it mines beat-aligned windows from the instrumental stem, scores them, and only then uses lyric segments as a filter. That is why a candidate can legitimately report `vocal_overlap = true` while still sounding semantically “off” relative to the lyric phrase a human expected.

For a new engineer, the most important mental model is this:

1. **Current system**
   - analyze stems and rhythm
   - mine candidate windows from beats
   - filter windows by `vocal_mode`
   - preview/export from `orig`, `inst`, or `vox`
2. **Older manual workflow**
   - transcribe vocals
   - identify lyric phrases
   - pad each phrase
   - export `vocal`, `inst`, and `mixed` versions centered on those phrases

The current codebase already contains the building blocks required to close that gap:

- Demucs stem separation
- WhisperX transcription
- stored vocal segments and words
- beat/onset/RMS analysis
- stem-specific export and preview
- a debug UI showing lyric and jingle timestamps side by side

What is still missing is the **selection logic** and **API/UI semantics** for a true lyric-aligned mining mode.

---

## Problem Statement and Scope

The current React + FastAPI product exposes controls such as:

- `vocal_mode`
- stem selection (`orig`, `inst`, `vox`)
- preview/export of candidates

A user can therefore reasonably assume that selecting a vocal-oriented configuration means the system is already mining clips directly from lyric timing. That assumption is wrong today.

Observed current behavior:

- `vocal_mode = vocal` means “keep only windows that overlap vocal segments”
- `stem = vox` means “export this window from the vocals-only stem”
- the candidate boundaries themselves still come from beat/time-window enumeration rather than lyric phrase boundaries

Out of scope for this document:

- redesigning the entire application shell
- changing Demucs or WhisperX model choices
- solving multi-user upload/auth concerns

In scope:

- explain the current architecture and runtime flows
- map old JINGLE-001 work to the current codebase
- identify exactly what was not ported
- propose a detailed, staged implementation guide for lyric-aligned mining

---

## Audience and Reading Strategy

This guide is written for a new intern or engineer who needs to answer four questions quickly:

1. What does this system do today?
2. Why did earlier manual runs produce better vocal hooks than the productized app?
3. Which older behaviors are already present in the codebase as reusable building blocks?
4. What is the safest implementation order for adding true lyric-aligned extraction?

Recommended reading order:

1. Read **Current-State Architecture**
2. Read **Old Workflow vs Current Workflow**
3. Read **Port Map**
4. Read **Proposed Target Architecture**
5. Use **File Map** and **Implementation Phases** while coding

---

## Terminology

### Rhythmic miner
The existing candidate miner that enumerates beat-based start times and duration windows, then scores them using attack, ending, energy, and beat alignment.

### Vocal-aware
A system that knows where lyric segments are and can use them as a filter or annotation.

### Lyric-aligned
A system that uses lyric phrase or word timestamps as the *source* of candidate boundaries.

### Phrase-first extraction
A workflow where the user starts from a lyric phrase such as `"BURNING FAST!"`, applies padding, and exports clips around that phrase.

### Stem selection
A choice of which audio source to export or preview:

- `orig` — original full track
- `inst` — instrumental/no-vocals stem
- `vox` — vocals-only stem

### Mixed export
A clip created by overlaying a vocal clip over the matching instrumental clip. This existed in the older manual workflow as `mixed_*` files but is not yet a first-class backend export mode.

---

## Current-State Architecture

### High-level stack

```text
+---------------------------+
| React / Vite frontend     |
| - Redux UI state          |
| - RTK Query API client    |
| - playback controller     |
| - debug timestamp panel   |
+-------------+-------------+
              |
              | HTTP / JSON + Blob responses
              v
+---------------------------+
| FastAPI backend           |
| - analyze route           |
| - analysis route          |
| - mine route              |
| - export route            |
| - tracks/stems route      |
+-------------+-------------+
              |
              | filesystem + SQLite
              v
+---------------------------+
| Runtime assets            |
| - orig.mp3               |
| - inst.mp3               |
| - vox.mp3                |
| - lyrics_aligned.json    |
| - SQLite metadata        |
+---------------------------+
```

### Important current files

Backend:

- `jingle-extractor-backend/app/pipeline.py`
- `jingle-extractor-backend/app/routes/mine.py`
- `jingle-extractor-backend/app/routes/export.py`
- `jingle-extractor-backend/app/models.py`
- `jingle-extractor-backend/app/scoring.py`

Frontend:

- `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
- `jingle-extractor-ui/src/features/analysis/analysisSlice.ts`
- `jingle-extractor-ui/src/components/DebugPanel/DebugPanel.tsx`
- `jingle-extractor-ui/src/hooks/useAudioPlayer.ts`

Legacy/manual references:

- `jingle_extractor.py`
- `out/vocal_jingles/README.md`
- `ttmp/2026/04/13/JINGLE-001--jingle-extractor-with-minimax-demucs-whisperx/reference/01-diary.md`

---

## Evidence-Backed Current Runtime Flow

### 1. Full analysis pipeline

The current backend pipeline does the following in sequence:

1. materialize `orig.mp3`
2. run Demucs on the source audio
3. store canonical `inst.mp3` and `vox.mp3`
4. transcribe `vox.mp3` with WhisperX
5. group words into segments using a `0.5s` gap threshold
6. analyze rhythm on `inst.mp3`
7. mine raw candidates from `inst.mp3`
8. score/filter them using `vocal_mode`
9. store candidates in SQLite

Key evidence:

- word grouping into segments: `app/pipeline.py:45-80`
- transcription and grouping: `app/pipeline.py:146-160`
- rhythm analysis runs on `inst_dest`: `app/pipeline.py:164-168`
- raw candidates are mined from `inst_dest`: `app/pipeline.py:203-213`
- `vocal_mode` is applied after scoring via overlap checks: `app/pipeline.py:237-245`

### 2. Current re-mine flow

The re-mine endpoint does not use phrase boundaries as candidate seeds. Instead it:

1. loads stored beats/RMS/onsets from SQLite
2. loads stored vocal segments from SQLite
3. enumerates beat-based starts plus duration increments
4. scores windows rhythmically
5. uses lyric segments only for overlap filtering
6. persists the new candidates

Key evidence:

- beat-based window generation: `app/routes/mine.py:49-60`
- rhythmic scoring: `app/routes/mine.py:62-73`
- lyric overlap as filter only: `app/routes/mine.py:75-82`

### 3. Current export flow

The export route does not know whether a candidate was rhythm-derived or lyric-derived. It simply:

1. loads the chosen candidate boundaries
2. resolves the selected stem (`orig`, `inst`, `vox`)
3. slices the selected stem over the chosen time range
4. applies fades
5. encodes MP3 or WAV

Key evidence:

- stem resolution: `app/routes/export.py:17-27`
- slicing and fades: `app/routes/export.py:30-53`
- export uses request overrides or stored candidate boundaries: `app/routes/export.py:79-92`

### 4. Current frontend behavior

The React root widget now does the following:

- polls `GET /api/analysis/{track_id}`
- uses `POST /api/mine` for completed tracks when the user clicks Run
- uses `POST /api/analyze` for incomplete tracks
- previews candidates through `POST /api/export`
- displays a debug panel showing candidate timestamps and lyric segment timestamps side by side

Key evidence:

- remine-vs-analyze run logic: `JingleExtractor.tsx:88-101`
- preview/export path: `JingleExtractor.tsx:192-249`
- debug panel integration: `DebugPanel.tsx:35-139`
- current UI config state includes `stem`, `config`, and local edits: `analysisSlice.ts:20-28`, `analysisSlice.ts:46-58`

---

## Current API Surface Relevant to This Work

### Core request/response models

The backend models currently define:

- `VocalMode = any | inst | vocal`
- `StemType = orig | inst | vox`
- `AnalysisConfig` with rhythmic weights, duration range, score threshold, and export fades
- `Candidate` with score/attack/ending/energy and `vocal_overlap`

Key evidence:

- enums: `app/models.py:17-31`
- `AnalysisConfig`: `app/models.py:109-142`
- `Candidate`: `app/models.py:93-103`

### Current API references

#### `POST /api/analyze`
Purpose:
- run the full pipeline for a source path on the server

Current semantics:
- expects `audio_file` path + `config`
- returns `202 Accepted` envelope while work runs

#### `GET /api/analysis/{track_id}`
Purpose:
- retrieve complete analysis or in-progress status

Returns when complete:

```json
{
  "track": {...},
  "timeline": {...},
  "vocals": { "segments": [...] },
  "candidates": [...]
}
```

#### `POST /api/mine`
Purpose:
- re-mine candidates for an already analyzed track using stored timeline and lyric metadata

Important limitation:
- this endpoint still uses beat-based enumeration and only uses lyric timing as an overlap filter

#### `POST /api/export`
Purpose:
- render a single clip from a selected stem and candidate window

Important limitation:
- there is no `mixed` export mode

---

## Old JINGLE-001 Workflow: What It Actually Did

The original JINGLE-001 work covered two distinct tracks of functionality:

1. a generic rhythm-first extraction CLI
2. a later manual phrase-centered vocal-jingle workflow

This distinction is easy to miss because both lived near the same code and outputs.

### Old generic CLI workflow

The original `jingle_extractor.py` already supported:

- MiniMax generation
- Demucs split
- WhisperX transcription
- rhythm analysis
- beat-based candidate mining
- clip export
- manifest generation

Evidence:

- WhisperX transcription: `jingle_extractor.py:168-208`
- rhythm analysis: `jingle_extractor.py:232-276`
- beat-based candidate mining: `jingle_extractor.py:279-364`
- export with fades: `jingle_extractor.py:367-400`
- `cmd_analyze()` mines from `stems["no_vocals"]`: `jingle_extractor.py:437-485`

### Old manual vocal-jingle workflow

The crucial later work in JINGLE-001 Step 7 and Step 8 was not “just more of the same.” It was a different workflow:

1. parse WhisperX timestamps
2. identify specific lyric phrases
3. build clips centered on those phrases
4. apply padding before/after the phrase
5. render three versions per phrase:
   - `vocal_*`
   - `inst_*`
   - `mixed_*`

Evidence from the old diary:

- phrase-centered extraction and sample timings: `JINGLE-001 diary:396-455`
- mixed overlays using `overlay()`: `JINGLE-001 diary:461-518`

Evidence from the generated README:

- three versions of each jingle: `out/vocal_jingles/README.md:5-8`
- phrase-aligned timing table: `out/vocal_jingles/README.md:12-18`
- `mixed_*` as first-class deliverables: `out/vocal_jingles/README.md:23-27`, `out/vocal_jingles/README.md:53-57`
- technical policy: `20ms` / `50ms` fades and `0.5s` padding: `out/vocal_jingles/README.md:43-49`

---

## Why the Current Product Feels Different from Earlier Manual Runs

This is the most important conceptual section for a new engineer.

### Current product is rhythm-first

The current product starts with a large set of beat-anchored windows. It then scores them using rhythmic and energy metrics. After that, it checks whether each window overlaps vocal segments.

Pseudo-flow:

```text
for beat_start in beats:
  for duration in allowed_durations:
    window = [beat_start, beat_start + duration]
    score = rhythm_score(window)
    overlap = overlaps_any_vocal_segment(window)

    if vocal_mode == inst and overlap:
      reject
    if vocal_mode == vocal and not overlap:
      reject
    else:
      keep
```

This means a candidate can still be “rhythmically strong” while being “lyrically awkward.”

### Older manual workflow was phrase-first

The earlier manual extraction instead started with the lyric phrase itself.

Pseudo-flow:

```text
for phrase in whisperx_segments:
  padded = [phrase.start - 0.5s, phrase.end + 0.5s]
  export vocal clip from vox stem
  export instrumental clip from inst stem
  export mixed clip via inst.overlay(vocal)
```

That difference is why the old outputs felt more obviously aligned to what a human listener hears as “the vocal hook.”

### Consequence in the UI

Today, these two user choices can be misleading if not explained carefully:

- `vocal_mode = vocal`
- `stem = vox`

What they **do** mean today:

- `vocal_mode = vocal` → the candidate must overlap a vocal segment
- `stem = vox` → preview/export the chosen candidate from the vocals stem

What they **do not** mean today:

- build the candidate from lyric phrase boundaries
- build a mixed vocal+instrumental hook automatically

---

## Port Map: What Was Ported, Partially Ported, and Not Ported

### Fully ported from older work

#### Audio and ML building blocks
- Demucs separation
- WhisperX transcription
- word-level timing extraction
- grouping of words into vocal segments
- rhythm analysis on the instrumental path
- export with configurable fades
- preview/export from `orig`, `inst`, and `vox`

#### Product/runtime integrations
- SQLite persistence of track/timeline/vocal/candidate data
- status-bearing analysis API
- remine endpoint for completed tracks
- debug UI for candidate timestamps vs lyric timestamps

### Partially ported from older work

#### Generic CLI concepts
- the original Python code still exists and is reused internally
- some CLI-era operational concepts survive indirectly in the backend
- manifest-style information is now split across SQLite + files rather than one `manifest.json`

#### Vocal-aware workflows
- the backend stores lyric segments
- the miner can require overlap with lyric segments
- exports can target the vocals stem

But the system still lacks phrase-first selection semantics.

### Not ported yet

#### MiniMax generation as a product feature
The CLI still has this concept; the React/FastAPI product does not expose it.

#### `full` generate-then-extract workflow
Still present in `jingle_extractor.py`, not ported as an app feature.

#### Phrase-first lyric-aligned candidate construction
This is the core missing behavior.

#### `0.5s` phrase padding policy
Documented in the old workflow, not implemented as a first-class backend strategy.

#### Adaptive short-phrase padding
Mentioned in the old diary, not present in the backend.

#### `mixed_*` overlay export mode
The old manual workflow exported `mixed_*` assets using `overlay()`. The backend export route still exports one stem at a time.

#### Phrase-specific triplet outputs
The old manual workflow generated curated `vocal`, `inst`, and `mixed` outputs per phrase. The current product exposes candidate export, not phrase package generation.

#### Phrase-aware scoring and provenance metadata
Current candidates do not include:

- source phrase id
- source phrase text
- source words
- padding policy used
- snapped vs original boundaries

---

## ASCII Diagrams

### Diagram A — Current productized runtime

```text
                  CURRENT PRODUCT

source track
   |
   v
Demucs ------------------> inst.mp3
   |                         |
   +-----------------------> vox.mp3
   |
   +-----------------------> orig.mp3

vox.mp3 --WhisperX--> words --> grouped vocal segments
inst.mp3 --librosa--> beats + onsets + rms

beats + durations --> raw windows --> rhythmic scoring
                                       |
                                       v
                             vocal overlap filter
                                       |
                                       v
                                  candidates
                                       |
                            preview/export from chosen stem
```

### Diagram B — Older manual vocal-jingle workflow

```text
            OLD MANUAL VOCAL-JINGLE WORKFLOW

vox.mp3 --WhisperX--> words/segments
                        |
                        v
                 choose vocal phrases
                        |
             apply phrase padding (+/- 0.5s)
                        |
        +---------------+---------------+
        |                               |
        v                               v
   slice vox stem                  slice inst stem
        |                               |
        +---------------+---------------+
                        |
                        v
                 overlay for mixed clip
                        |
                        v
        vocal_* / inst_* / mixed_* outputs per phrase
```

### Diagram C — Desired future architecture

```text
candidate_mode = rhythmic | lyric_aligned | hybrid

                     +------------------+
                     | mining service    |
                     +---------+--------+
                               |
             +-----------------+------------------+
             |                                    |
             v                                    v
      rhythmic builder                     lyric builder
      (beats, onsets, rms)                 (segments, words, padding)
             |                                    |
             +-----------------+------------------+
                               |
                               v
                        ranking / metadata
                               |
                               v
                           candidates
```

---

## File-by-File Guide for a New Intern

### `jingle_extractor.py`
Use this file to understand the original implementation vocabulary and historical workflow.

Read these sections first:

- `whisperx_transcribe()`: `jingle_extractor.py:168-208`
- `analyze_rhythm()`: `jingle_extractor.py:232-276`
- `mine_candidates()`: `jingle_extractor.py:279-364`
- `cmd_analyze()`: `jingle_extractor.py:437-485`

Important interpretation:

- this file already proves the project started as a rhythm-first extractor
- it is *not* by itself evidence that the older product was lyric-aligned everywhere
- the phrase-first behavior came later as a more manual workflow layered on top

### `app/pipeline.py`
This is the canonical backend pipeline today.

Read in this order:

1. `_group_words_into_segments()`: `app/pipeline.py:45-63`
2. transcription step: `app/pipeline.py:146-160`
3. rhythm analysis step: `app/pipeline.py:164-168`
4. raw candidate mining: `app/pipeline.py:203-213`
5. `vocal_mode` filtering: `app/pipeline.py:237-245`

Important interpretation:

- the pipeline stores lyric data but does not yet use it as the primary candidate source

### `app/routes/mine.py`
This is the easiest file to inspect when you want to see exactly why `vocal_mode = vocal` is not the same as lyric-aligned mining.

Read:

- beat-based generation: `app/routes/mine.py:49-60`
- overlap filter: `app/routes/mine.py:75-82`

Important interpretation:

- candidates are generated from beats, not from lyric segments

### `app/routes/export.py`
This file explains why selecting `stem = vox` still does not create a true vocal-jingle workflow.

Read:

- stem resolution: `app/routes/export.py:17-27`
- slice-and-fade rendering: `app/routes/export.py:30-53`

Important interpretation:

- export chooses a source stem for a candidate window
- export does not define how candidate windows are chosen
- there is no `mixed` mode today

### `JingleExtractor.tsx`
This is the main frontend orchestration file.

Read:

- analyze vs remine run logic: `JingleExtractor.tsx:88-101`
- preview/export handlers: `JingleExtractor.tsx:192-249`

Important interpretation:

- the UI now honestly re-mines completed tracks
- but it still exposes only the current backend miner semantics

### `DebugPanel.tsx`
This panel exists specifically to make the mismatch visible.

Read:

- current summary and side-by-side tables: `DebugPanel.tsx:45-139`

Important interpretation:

- today it compares candidate timing against lyric timing
- in the future it should also show lyric provenance metadata per candidate

### `analysisSlice.ts`
This file defines the current frontend config/state shape.

Read:

- initial state: `analysisSlice.ts:20-28`
- config updates and preset clearing: `analysisSlice.ts:46-58`

Important interpretation:

- there is currently no explicit `candidate_mode` state field
- that will likely need to change for lyric-aligned mining

### `out/vocal_jingles/README.md`
Treat this as the clearest artifact proving what the older manual workflow produced.

Read:

- jingle triplet output structure: `out/vocal_jingles/README.md:5-18`
- technical policy: `out/vocal_jingles/README.md:43-49`

Important interpretation:

- this is the artifact users mentally compare the current app against

### JINGLE-001 diary Step 7 and Step 8
Read this to understand not just the outputs, but the operator intent.

Read:

- phrase-centered extraction: `JINGLE-001 diary:396-455`
- mixed overlays: `JINGLE-001 diary:461-518`

---

## Detailed Gap Analysis

### Gap 1 — Missing candidate source mode

Observed current design:
- `AnalysisConfig` contains `vocal_mode`, weights, duration range, fades, format, bitrate
- there is no field describing *how candidates are generated*

Evidence:
- `app/models.py:109-142`

Why this matters:
- `vocal_mode` currently conflates “filter intent” with “candidate semantics” in users’ minds

Recommended change:
- add a separate strategy field such as `candidate_mode`

### Gap 2 — Lyric timing is stored but underused

Observed:
- word and segment timing are already persisted
- mining still uses beat enumeration only

Why this matters:
- the system already has most of the expensive data acquisition work done
- the missing work is mostly mining logic and API/UI semantics

### Gap 3 — No mixed export mode

Observed:
- the old workflow created `mixed_*` files via `overlay()`
- current export only slices one chosen stem

Why this matters:
- users looking for ready-to-use vocal jingles still need either manual post-processing or a future backend feature

### Gap 4 — No phrase provenance on candidates

Observed:
- current `Candidate` has only generic score fields and `vocal_overlap`

Why this matters:
- the UI cannot explain *why* a candidate exists
- the debug panel can only show geometric overlap, not actual origin

### Gap 5 — No phrase package generation workflow

Observed:
- current app exports one clip at a time
- old workflow produced curated per-phrase bundles

Why this matters:
- the old workflow optimized for “usable assets” rather than “abstract candidate windows”

---

## Proposed Target Architecture

### Design goal

Keep the current rhythmic miner intact, but add a parallel lyric-aligned mining path.

### Proposed config extension

Add fields such as:

```json
{
  "candidate_mode": "rhythmic",
  "lyric_unit": "segment",
  "lyric_padding_before": 0.5,
  "lyric_padding_after": 0.5,
  "mixed_export": false
}
```

### Semantics

- `candidate_mode = rhythmic`
  - current behavior
- `candidate_mode = lyric_aligned`
  - build candidates from lyric segments/word spans first
- `candidate_mode = hybrid`
  - start from lyric phrases, then optionally snap boundaries toward nearby beats/onsets

### Proposed backend service split

Create a service layer, for example:

- `app/services/candidate_mining.py`
- `app/services/lyric_mining.py`
- optionally `app/services/export_rendering.py`

Reasoning:

- mining is currently duplicated between `app/pipeline.py` and `app/routes/mine.py`
- lyric-aligned support will become difficult to maintain unless window construction and scoring are centralized

---

## Pseudocode for the Proposed Future Miner

### Current miner, restated

```python
for beat_start in beats:
    for duration in durations:
        end = beat_start + duration
        score = rhythmic_score(beat_start, end)
        overlap = overlaps_any_vocal_segment(beat_start, end)
        if passes_filters(score, overlap, vocal_mode):
            keep_candidate(...)
```

### Proposed lyric-aligned segment miner

```python
for segment in vocal_segments:
    start = max(0, segment.start - lyric_padding_before)
    end = min(track_duration, segment.end + lyric_padding_after)

    rhythmic = rhythmic_score(start, end)
    phrase = phrase_score(segment, start, end)

    keep_candidate(
        start=start,
        end=end,
        vocal_overlap=True,
        source_kind="lyric_segment",
        source_segment_id=segment.id,
        source_text=segment.text,
        score=combine_scores(rhythmic, phrase),
    )
```

### Proposed hybrid snap-to-beat miner

```python
for segment in vocal_segments:
    raw_start = segment.start - lyric_padding_before
    raw_end = segment.end + lyric_padding_after

    snapped_start = snap_to_nearby_onset_or_beat(raw_start)
    snapped_end = snap_to_nearby_onset_or_beat(raw_end)

    candidate = build_candidate(
        start=snapped_start,
        end=snapped_end,
        source_start=raw_start,
        source_end=raw_end,
        source_kind="lyric_segment",
    )
```

### Proposed mixed export rendering

```python
vocal_clip = vox_audio[start_ms:end_ms]
inst_clip = inst_audio[start_ms:end_ms]
mixed_clip = inst_clip.overlay(vocal_clip)
render(mixed_clip, fade_in=20, fade_out=50)
```

---

## Proposed API Changes

### Extend `AnalysisConfig`

Proposed addition:

```python
class CandidateMode(str, Enum):
    RHYTHMIC = "rhythmic"
    LYRIC_ALIGNED = "lyric_aligned"
    HYBRID = "hybrid"
```

Then extend config with:

```python
candidate_mode: CandidateMode = CandidateMode.RHYTHMIC
lyric_unit: str = "segment"
lyric_padding_before: float = 0.5
lyric_padding_after: float = 0.5
```

### Extend `Candidate`

Add optional metadata fields:

```python
source_kind: str | None = None
source_segment_id: int | None = None
source_text: str | None = None
source_words: list[str] | None = None
source_start: float | None = None
source_end: float | None = None
```

### Extend export stem semantics carefully

Two safe options:

1. add `mixed` as a new `StemType`
2. keep `StemType` unchanged and add an explicit `mix_mode` / `render_mode`

Recommendation:
- prefer explicit render mode to avoid confusing “stem” with “derived mix”

Possible request sketch:

```json
{
  "trackId": "thrash_metal_01",
  "candidateId": 4,
  "render_mode": "mixed",
  "fmt": "mp3",
  "fade_in": 20,
  "fade_out": 50,
  "br": 192
}
```

---

## Frontend Design Guidance

### UI terminology cleanup

Do not rely on `vocal_mode` alone to communicate mining behavior.

Recommended UI split:

- **Candidate strategy**
  - Rhythmic
  - Lyric-aligned
  - Hybrid
- **Vocal filter / intent**
  - Any
  - Prefer instrumental
  - Require vocals
- **Render source**
  - Original
  - Instrumental
  - Vocals
  - Mixed (future)

### Debug panel evolution

The current debug panel already shows:

- candidate timestamps
- lyric segment timestamps
- overlap against selected candidate

Future expansion should add:

- candidate source kind
- source phrase text
- source phrase id
- raw phrase bounds vs snapped bounds
- padding policy used

### Presets

Recommended future presets:

- `Lyric Hooks`
- `Word Punches`
- `Hybrid Hooks`

These should explicitly set candidate strategy fields, not merely `vocal_mode`.

---

## Recommended Implementation Phases

### Phase 1 — Refactor mining into a service layer

Goal:
- remove duplication between `app/pipeline.py` and `app/routes/mine.py`

Work:
- create reusable candidate mining service
- move rhythmic window generation and scoring there
- have both pipeline and remine route call the same service

Why first:
- adding lyric-aligned logic directly into both current codepaths would duplicate complexity

### Phase 2 — Add segment-based lyric-aligned mining

Goal:
- deliver the simplest true lyric-aligned path

Work:
- add `candidate_mode`
- construct candidates from stored vocal segments
- support configurable phrase padding
- attach provenance metadata to candidates

Why second:
- this produces immediate user-visible value and recreates the spirit of the older manual workflow

### Phase 3 — Add mixed export mode

Goal:
- recreate `mixed_*` behavior from the old manual workflow

Work:
- define mixed render semantics in the backend
- add frontend preview/export support for mixed rendering
- keep fades and bitrate options consistent with current export route

### Phase 4 — Add hybrid snap/refine mode

Goal:
- preserve phrase semantics while improving musical cleanliness

Work:
- allow lyric-aligned windows to snap to nearby onsets/beats
- store raw vs snapped boundaries for debugging and trust

### Phase 5 — Expand UI and tests

Goal:
- make the new behavior understandable and hard to misuse

Work:
- expose strategy in config UI
- expand debug panel metadata
- add backend tests for lyric mining
- add frontend tests for strategy switching and mixed export behavior

---

## Testing and Validation Strategy

### Validation target A — behavioral parity with old manual workflow

Use `thrash_metal_01` and compare:

- old manual phrase outputs documented in `out/vocal_jingles/README.md`
- new lyric-aligned candidate outputs from the backend

Check:

- does the candidate center on the expected lyric phrase?
- does padding match the old policy?
- does preview feel phrase-complete?

### Validation target B — current rhythmic miner must not regress

For `candidate_mode = rhythmic`, existing behavior should remain unchanged.

Backend tests should assert:

- same candidate count under known fixtures
- same overlap filtering semantics
- same export behavior for `orig`, `inst`, `vox`

### Validation target C — mixed export correctness

For future mixed export support, test:

- non-empty output bytes
- duration matches window duration
- rendering succeeds when both `inst` and `vox` exist
- meaningful error when a required stem is missing

### Suggested commands

```bash
cd jingle-extractor-ui && npm run build
cd jingle-extractor-ui && npm run lint
python3 -m pytest -q jingle-extractor-backend/tests
curl -s http://127.0.0.1:8000/api/analysis/thrash_metal_01 | jq .
```

---

## Risks, Alternatives, and Tradeoffs

### Risk 1 — WhisperX segment boundaries are imperfect

Consequence:
- segment-based mining can still sound awkward if the ASR timing is noisy

Mitigation:
- keep hybrid snapping as a follow-up mode
- store raw and snapped bounds separately

### Risk 2 — Too much complexity in one release

Consequence:
- trying to add candidate strategy, mixed export, word-span mining, provenance metadata, and UI changes simultaneously could destabilize the current product

Mitigation:
- stage the work exactly as outlined above

### Risk 3 — Confusing “stem” with “mix mode”

Consequence:
- adding `mixed` naively as another stem may blur the distinction between source material and rendered output mode

Mitigation:
- consider `render_mode` instead of overloading `StemType`

### Alternative — keep only the current rhythmic miner

Pros:
- simpler system

Cons:
- never reproduces the strongest phrase-centered vocal hooks from the older workflow
- keeps the current conceptual mismatch in place

This is not recommended if the goal is to recover earlier successful vocal-jingle behavior.

---

## Open Questions

1. Should the first lyric-aligned implementation use only segments, or also enumerate short word spans?
2. Should `mixed` be represented as a new stem or as a rendering mode?
3. Should the backend persist lyric provenance metadata for every candidate, or compute it dynamically?
4. Should phrase padding remain global config or be preset-specific?
5. Should the app eventually support “export all phrase triplets” as a batch workflow like the older manual process?

---

## Recommended Reading Checklist for the Next Engineer

Read these in order:

1. `jingle-extractor-backend/app/pipeline.py`
2. `jingle-extractor-backend/app/routes/mine.py`
3. `jingle-extractor-backend/app/routes/export.py`
4. `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
5. `jingle-extractor-ui/src/components/DebugPanel/DebugPanel.tsx`
6. `out/vocal_jingles/README.md`
7. `ttmp/2026/04/13/JINGLE-001--jingle-extractor-with-minimax-demucs-whisperx/reference/01-diary.md` Step 7 and Step 8

If you remember only one sentence after reading this document, remember this one:

> The current app already has the stems, transcription, and export plumbing; what it does **not** yet have is lyric phrases as first-class candidate sources.

---

## References

### Current product files
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/pipeline.py`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/mine.py`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/export.py`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/models.py`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/DebugPanel/DebugPanel.tsx`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/features/analysis/analysisSlice.ts`

### Legacy/manual references
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle_extractor.py`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/out/vocal_jingles/README.md`
- `/home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/2026/04/13/JINGLE-001--jingle-extractor-with-minimax-demucs-whisperx/reference/01-diary.md`
