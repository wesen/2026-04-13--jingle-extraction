---
Title: Lyric-Aligned Candidate Mining Design Guide
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
Summary: Design guide for adding phrase-aware, lyric-centered jingle extraction that complements the current beat/onset miner.
---

# Lyric-Aligned Candidate Mining Design Guide

## Problem Statement

The current backend mines candidates primarily from rhythmic structure on the instrumental stem, then uses lyric timestamps only as a filter:

- `vocal_mode = inst` means reject candidates that overlap vocal segments
- `vocal_mode = vocal` means require candidates to overlap vocal segments

That is useful, but it is **not** the same as phrase-aware lyric extraction. In earlier manual runs, the strongest results often came from starting with the lyric phrase boundaries themselves and then padding or refining around those phrase windows. The current pipeline does not explicitly do that.

As a result, a vocal-overlap candidate can still feel "off" in practice:
- it may catch only half a phrase
- it may start too early or too late relative to the lyric attack
- it may end before the phrase resolves
- it may score well rhythmically while still feeling semantically wrong to a listener

## Goal

Add a second mining strategy that is **lyric-centered** rather than purely beat-centered.

This mode should:
- build candidate windows from WhisperX word/segment timestamps
- preserve the currently successful beat/onset miner as a separate mode
- support the earlier manual workflow ideas such as phrase padding and lyric-focused preview/export
- make it obvious in the UI which miner produced the visible candidates

## Current State Summary

### Backend
- `app/pipeline.py` mines initial candidates from `inst.mp3`
- `app/routes/mine.py` re-mines from stored beats/RMS/onsets plus stored vocal segments
- `app/scoring.py` provides rhythmic/energy scoring helpers only
- vocal timestamps are stored as `vocal_segments` with optional word lists

### Frontend
- UI exposes `vocal_mode`, but not miner strategy explicitly
- debug panel now shows lyric and jingle timestamps side by side
- transport/export can already preview candidate windows, which is a good base for evaluating a lyric-centered miner

## Proposed Product Behavior

### New concept: mining strategy

Introduce a config field similar to:

```json
{
  "candidate_mode": "rhythmic" | "lyric_aligned" | "hybrid"
}
```

Suggested semantics:

- `rhythmic`
  - current behavior
  - beat/onset/energy first
- `lyric_aligned`
  - generate candidates directly from lyric phrases/words
- `hybrid`
  - generate lyric-centered candidates, then refine/snap boundaries toward nearby beats/onsets and score with both lyric and rhythmic features

## Candidate Construction Proposal

### Mode A: segment-based

Use each WhisperX segment as a starting unit:

```text
candidate.start = segment.start - left_padding
candidate.end   = segment.end + right_padding
```

Default initial policy:
- left padding: `0.5s`
- right padding: `0.5s`
- keep the existing export fades at `20ms` / `50ms`

This matches the earlier manual preference better than the current pure overlap filter.

### Mode B: word-span enumeration

For richer hooks, enumerate short contiguous word spans inside each segment:

Examples:
- one-word span: `"Yow!"`
- two-word span: `"Burning fast!"`
- phrase span: `"Stress attack"`
- longer span: `"Stress attack, no turning back"`

Then pad each span and score it.

This is likely the highest-value long-term approach because many radio jingle hooks are not full WhisperX segments; they are memorable sub-phrases.

## Proposed Scoring Model

Keep the existing rhythmic scores, but add lyric-aware ones.

### Existing scores to preserve
- attack
- ending
- energy
- beat alignment

### New lyric-aware scores
- **phrase completeness**
  - penalize windows that cut off words at the start/end
- **word coverage**
  - reward windows containing the full targeted word span
- **lyric density**
  - prefer phrase windows with enough lyric content to be recognizable
- **post-phrase release quality**
  - reward a small clean tail after the phrase resolves
- **semantic hook bias** (optional later)
  - bias toward emphasized or repeated phrases

### Example hybrid score sketch

```text
overall =
  attack * atk_w +
  ending * end_w +
  energy * nrg_w +
  beat_alignment * beat_w +
  phrase_completeness * phrase_w +
  word_coverage * coverage_w +
  release_quality * release_w
```

## Backend Design Proposal

### New service module

Create a dedicated mining service layer, for example:

- `app/services/candidate_mining.py`
- `app/services/lyric_mining.py`

Responsibilities:
- read stored timeline/vocal data
- build raw candidates for different mining strategies
- score/rank/filter candidates
- return a normalized candidate shape independent of route handlers

### Why this matters

Right now, mining logic is split between:
- `app/pipeline.py`
- `app/routes/mine.py`
- `jingle_extractor.py`

A new lyric-aware miner will become hard to maintain unless mining is centralized first.

## API Proposal

### Config changes

Extend analysis config with something like:

```json
{
  "candidate_mode": "rhythmic",
  "lyric_padding_before": 0.5,
  "lyric_padding_after": 0.5,
  "lyric_unit": "segment" | "word_span"
}
```

### Response enrichment

Add optional debug metadata to each candidate:

```json
{
  "id": 7,
  "start": 41.175,
  "end": 43.639,
  "source_kind": "lyric_segment",
  "source_segment_id": 6,
  "source_words": ["Stress", "attack,"],
  "edited": false
}
```

That would make the new debug UI much more informative.

## Frontend Design Proposal

### Config surface
- expose candidate mining strategy explicitly
- keep `vocal_mode` as a filter/intent control, but do not overload it to mean mining strategy
- provide a dedicated preset such as:
  - `Lyric Hooks`
  - `Word Punches`
  - `Phrase + Beat Hybrid`

### Debug panel expansion
The newly added debug panel is a good base for this work. It should later show:
- which lyric segment/word span generated the candidate
- padding before/after
- snapped vs original boundaries
- overlap percentage with the source lyric span

## Risks

- WhisperX segment boundaries may be imperfect, especially on aggressive vocals
- word-level timestamps may be noisier than segment-level timestamps
- pure lyric-centering can produce clips that sound musically abrupt if not rhythmically refined
- hybrid mode can become too complex if implemented all at once

## Recommended Delivery Plan

### Phase 1
- extract mining logic into a reusable backend service
- define config/API shape for candidate strategy
- implement segment-based lyric-centered candidates only

### Phase 2
- add hybrid snapping/scoring against beats/onsets
- expose strategy in the frontend config UI
- enrich debug panel with source metadata

### Phase 3
- add word-span enumeration
- add more targeted presets for short vocal hooks vs longer phrase hooks
- validate on extreme genres and noisier vocals

## Validation Plan

Use the known `thrash_metal_01` sample and compare:
- current `rhythmic + vocal overlap` behavior
- segment-based `lyric_aligned`
- hybrid `lyric_aligned + beat snap`

For each, review:
- candidate timestamps vs lyric timestamps
- subjective preview quality
- whether exports feel phrase-complete
- whether the 0.5s padding policy improves or hurts perceived cleanliness

## Open Questions

- Should lyric-centered mining be a separate endpoint or just a config strategy on `/api/mine`?
- Should phrase padding be global config or preset-only?
- Should the backend store source-word metadata for each candidate persistently?
- Should preview/export support showing the matched source lyric text in filenames or metadata?
