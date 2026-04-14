# Section 2: API Reference

This section defines every REST endpoint the backend must implement. These are **not** suggestions — they are the exact contract that the React frontend's RTK Query layer (`jingleApi.ts`) expects. Every URL, every request body field, every response shape must match.

The frontend uses `fetchBaseQuery({ baseUrl: '/api/' })`, so all endpoints are relative to `/api/`.

---

## 2.1 Endpoint Summary

| # | Method | Path | Purpose | Returns |
|---|--------|------|---------|---------|
| 1 | `POST` | `/api/analyze` | Start analysis pipeline on an audio file | `202 { track_id, status }` |
| 2 | `GET` | `/api/analysis/{track_id}` | Get analysis results (track, timeline, vocals, candidates) | `200 AnalysisResponse` |
| 3 | `POST` | `/api/mine` | Re-mine candidates with different config | `200 Candidate[]` |
| 4 | `POST` | `/api/export` | Export a single candidate clip | `200 audio blob` |
| 5 | `POST` | `/api/export/batch` | Export multiple clips as a zip | `200 application/zip` |
| 6 | `GET` | `/api/tracks` | List all analyzed tracks | `200 Track[]` |
| 7 | `GET` | `/api/presets` | Get preset configurations | `200 Presets` |

---

## 2.2 POST `/api/analyze` — Start Analysis Pipeline

This is the main entry point. The user either uploads an audio file or provides a path to one on disk (or asks the server to generate one via MiniMax). The server starts the full pipeline in the background and returns immediately.

### Request

```json
{
  "audio_file": "path/to/song.mp3",
  "config": {
    "min_dur": 2.0,
    "max_dur": 4.5,
    "min_score": 75,
    "vocal_mode": "inst",
    "atk_w": 6,
    "end_w": 4,
    "nrg_w": 3,
    "beat_w": 3,
    "max_cand": 5,
    "fade_in": 8,
    "fade_out": 18,
    "fmt": "mp3",
    "br": 192
  }
}
```

**Fields explained**:

- `audio_file` (`string`, required) — Path to an audio file on the server's filesystem, **or** a URL to download. In v2, this will accept multipart file uploads.
- `config` (`AnalysisConfig`, required) — Mining configuration. Controls how candidates are scored and filtered.
  - `min_dur` / `max_dur` — Duration range in seconds. Candidates outside this range are discarded.
  - `min_score` — Minimum quality score (0–100). Candidates below this are excluded.
  - `vocal_mode` — `"any"` (include all), `"inst"` (instrumental only, reject vocal overlap), `"vocal"` (vocal only, require vocal overlap).
  - `atk_w` / `end_w` / `nrg_w` / `beat_w` — Scoring weights for attack, ending, energy, and beat alignment. Higher = that factor matters more.
  - `max_cand` — Maximum number of candidates to return.
  - `fade_in` / `fade_out` — Fade durations in milliseconds for exported clips.
  - `fmt` — Export format: `"mp3"` or `"wav"`.
  - `br` — Bitrate in kbps for MP3. `null` for WAV.

### Response (202 Accepted)

```json
{
  "track_id": "thrash_metal_01",
  "status": "processing"
}
```

The frontend polls `GET /api/analysis/{track_id}` until `status` becomes `"complete"`.

### Processing States

The `status` field progresses through these states:

```
uploaded → separating_stems → transcribing → analyzing_rhythm → mining_candidates → complete
                                                            └→ failed: "error message"
```

### Error Responses

| Status | When |
|--------|------|
| `400 Bad Request` | Missing `audio_file` or `config` |
| `404 Not Found` | `audio_file` path does not exist on disk |
| `500 Internal Server Error` | Pipeline crashed (Demucs OOM, WhisperX failure, etc.) |

---

## 2.3 GET `/api/analysis/{track_id}` — Get Analysis Results

Returns the complete analysis for a previously processed track. This is what the frontend calls to populate the entire UI: track metadata, timeline data (beats, RMS, onsets), vocal segments, and candidate list.

### Request

```
GET /api/analysis/thrash_metal_01
```

- `track_id` is a URL path parameter — the unique identifier for the track.

### Response (200 OK)

```json
{
  "track": {
    "id": "thrash_metal_01",
    "duration": 55.59,
    "bpm": 166.7,
    "language": "en",
    "lang_conf": 0.76,
    "sr": 44100,
    "dr_db": 49.9
  },
  "timeline": {
    "duration": 55.59,
    "beats": [0.348, 0.708, 1.069, ...],
    "rms": [0.001, 0.002, 0.003, ...],
    "onsets": [0.116, 0.232, 0.348, ...]
  },
  "vocals": {
    "segments": [
      {
        "id": 1,
        "start": 17.245,
        "end": 18.006,
        "text": "YOW!",
        "conf": 0.93,
        "words": [
          { "word": "YOW!", "start": 17.245, "end": 18.006, "score": 0.934 }
        ]
      }
    ]
  },
  "candidates": [
    {
      "id": 1,
      "rank": 1,
      "start": 39.102,
      "end": 43.102,
      "score": 92,
      "attack": 95,
      "ending": 88,
      "energy": 78,
      "vocal_overlap": false,
      "best": true
    }
  ]
}
```

**Field-by-field explanation**:

- `track` — Static metadata about the audio file.
  - `id` — Unique identifier derived from the filename stem (no extension, spaces → underscores).
  - `duration` — Total length in seconds.
  - `bpm` — Estimated tempo from librosa beat tracking.
  - `language` — ISO 639-1 code detected by WhisperX (e.g. `"en"`, `"de"`).
  - `lang_conf` — WhisperX's language detection confidence (0.0–1.0).
  - `sr` — Sample rate in Hz (typically 44100).
  - `dr_db` — Dynamic range in dB (ratio of loudest peak to RMS floor).

- `timeline` — Time-series data for the waveform display.
  - `beats` — Timestamps of detected beats (one per beat, ~166 per minute at 166 BPM).
  - `rms` — RMS energy values, one per hop (512 samples at 44100 Hz ≈ one value every ~11.6ms). The frontend draws the waveform envelope from this.
  - `onsets` — Timestamps of detected onsets (transient events).

- `vocals` — Transcription results from WhisperX.
  - `segments` — Continuous phrases (groups of closely-spaced words).
    - `id` — Segment number (1-based).
    - `start`/`end` — Segment time range in seconds.
    - `text` — Joined text of all words in the segment.
    - `conf` — Average confidence across all words.
    - `words` — Per-word breakdown with individual `score` values.

- `candidates` — Ranked jingle candidates.
  - `id` — Candidate number (1-based).
  - `rank` — Quality rank (1 = best).
  - `start`/`end` — Time window in seconds.
  - `score` — Overall quality score (0–100, weighted combination).
  - `attack` — Attack quality subscore (0–100).
  - `ending` — Ending quality subscore (0–100).
  - `energy` — Energy level subscore (0–100).
  - `vocal_overlap` — Whether the clip overlaps with any vocal segment.
  - `best` — `true` for the single highest-ranked candidate (convenience flag for the UI).

### Error Responses

| Status | When |
|--------|------|
| `404 Not Found` | No track with this `track_id` |
| `202 Accepted` | Track exists but analysis is still processing (include partial status) |

### When Still Processing

If the analysis is in progress, return a partial response:

```json
{
  "track": { "id": "thrash_metal_01", "duration": 55.59, ... },
  "status": "transcribing",
  "progress": 0.4
}
```

The frontend can use RTK Query's `pollingInterval` to re-fetch every 2–5 seconds.

---

## 2.4 POST `/api/mine` — Re-Mine Candidates

After the initial analysis, the user might change the config (adjust weights, duration range, vocal mode) and re-run just the mining step. This does **not** re-run Demucs or WhisperX — it only re-evaluates candidates using the stored rhythm data and vocal segments.

### Request

```json
{
  "trackId": "thrash_metal_01",
  "config": {
    "min_dur": 1.0,
    "max_dur": 2.5,
    "min_score": 80,
    "vocal_mode": "any",
    "atk_w": 8,
    "end_w": 5,
    "nrg_w": 4,
    "beat_w": 2,
    "max_cand": 8,
    "fade_in": 4,
    "fade_out": 10,
    "fmt": "mp3",
    "br": 192
  }
}
```

### Response (200 OK)

Returns **just the candidates array** (not the full analysis):

```json
[
  {
    "id": 1,
    "rank": 1,
    "start": 39.102,
    "end": 43.102,
    "score": 95,
    "attack": 97,
    "ending": 92,
    "energy": 85,
    "vocal_overlap": false,
    "best": true
  },
  {
    "id": 2,
    "rank": 2,
    "start": 26.0,
    "end": 28.5,
    "score": 91,
    "attack": 88,
    "ending": 90,
    "energy": 80,
    "vocal_overlap": false,
    "best": false
  }
]
```

**Why a separate endpoint?** The full analysis takes minutes (Demucs + WhisperX). Re-mining takes seconds because the heavy data (beats, RMS, vocals) is already stored. The frontend calls this when the user adjusts config sliders.

### Implementation Note

The server loads the previously computed `beats`, `rms`, `onsets`, and `vocal_segments` from the database, then calls `mine_candidates()` with the new weights. The `vocal_overlap` flag for each candidate is computed by checking if `[candidate.start, candidate.end]` intersects any vocal segment.

---

## 2.5 POST `/api/export` — Export Single Clip

Takes a candidate ID and produces an audio file by slicing the source audio at the candidate's start/end times, applying fades, and encoding.

### Request

```json
{
  "trackId": "thrash_metal_01",
  "candidateId": 1,
  "stem": "inst",
  "fmt": "mp3"
}
```

**Fields**:

- `trackId` — Which track to slice from.
- `candidateId` — Which candidate's time window to use.
- `stem` — Which audio source: `"orig"` (full mix), `"inst"` (instrumental), `"vox"` (vocals only).
- `fmt` — Output format: `"mp3"` or `"wav"`.

### Response (200 OK)

Binary audio data with appropriate headers:

```
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Content-Disposition: attachment; filename="clip_1.mp3"
Content-Length: 48231

<raw MP3 bytes>
```

### Implementation Note

```python
# Pseudocode
audio = AudioSegment.from_file(stem_path(stem))       # load the stem file
clip = audio[int(start * 1000) : int(end * 1000)]     # slice milliseconds
clip = clip.fade_in(fade_in_ms).fade_out(fade_out_ms) # apply fades
buffer = io.BytesIO()
clip.export(buffer, format=fmt, bitrate=f"{br}k")     # encode
return StreamingResponse(buffer, media_type=mime_type)
```

---

## 2.6 POST `/api/export/batch` — Export Multiple Clips

Same as `/api/export` but for multiple candidates, returned as a ZIP archive.

### Request

```json
{
  "trackId": "thrash_metal_01",
  "candidates": [1, 2, 3],
  "stem": "inst",
  "fmt": "mp3"
}
```

### Response (200 OK)

```
HTTP/1.1 200 OK
Content-Type: application/zip
Content-Disposition: attachment; filename="thrash_metal_01_clips.zip"

<ZIP archive containing:
  clip_01.mp3
  clip_02.mp3
  clip_03.mp3
>
```

### Implementation Note

Use Python's `zipfile` module to create an in-memory ZIP:

```python
buffer = io.BytesIO()
with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
    for cand_id in candidate_ids:
        clip_bytes = render_clip(track_id, cand_id, stem, fmt)
        zf.writestr(f"clip_{cand_id:02d}.{fmt}", clip_bytes)
buffer.seek(0)
return StreamingResponse(buffer, media_type="application/zip")
```

---

## 2.7 GET `/api/tracks` — List All Tracks

Returns a list of all tracks that have been analyzed (or are being analyzed).

### Request

```
GET /api/tracks
```

No parameters.

### Response (200 OK)

```json
[
  {
    "id": "thrash_metal_01",
    "duration": 55.59,
    "bpm": 166.7,
    "language": "en",
    "lang_conf": 0.76,
    "sr": 44100,
    "dr_db": 49.9
  },
  {
    "id": "doom_metal_01",
    "duration": 62.34,
    "bpm": 78.2,
    "language": "en",
    "lang_conf": 0.65,
    "sr": 44100,
    "dr_db": 55.3
  }
]
```

Just the track metadata — no timeline, vocals, or candidates.

---

## 2.8 GET `/api/presets` — Get Preset Configurations

Returns named configuration presets that the user can select in the UI's PresetPanel.

### Request

```
GET /api/presets
```

### Response (200 OK)

```json
{
  "Default": {
    "min_dur": 2.0, "max_dur": 4.5, "min_score": 75,
    "vocal_mode": "inst", "atk_w": 6, "end_w": 4, "nrg_w": 3, "beat_w": 3,
    "max_cand": 5, "fade_in": 8, "fade_out": 18, "fmt": "mp3", "br": 192
  },
  "Short Stings": {
    "min_dur": 1.0, "max_dur": 2.5, "min_score": 80,
    "vocal_mode": "any", "atk_w": 8, "end_w": 5, "nrg_w": 4, "beat_w": 2,
    "max_cand": 8, "fade_in": 4, "fade_out": 10, "fmt": "mp3", "br": 192
  },
  "Long Beds": {
    "min_dur": 4.0, "max_dur": 8.0, "min_score": 60,
    "vocal_mode": "inst", "atk_w": 2, "end_w": 2, "nrg_w": 5, "beat_w": 4,
    "max_cand": 3, "fade_in": 50, "fade_out": 100, "fmt": "wav", "br": null
  },
  "Vocal Hooks": {
    "min_dur": 0.5, "max_dur": 4.0, "min_score": 70,
    "vocal_mode": "vocal", "atk_w": 3, "end_w": 3, "nrg_w": 2, "beat_w": 1,
    "max_cand": 10, "fade_in": 4, "fade_out": 8, "fmt": "mp3", "br": 320
  }
}
```

These presets are **server-defined** (hardcoded in a Python dict or config file). The frontend fetches them on startup and populates the PresetPanel. The user can override any preset value via the ConfigEditor.

---

## 2.9 Error Format

All errors return a consistent JSON shape:

```json
{
  "detail": "Human-readable error message",
  "code": "TRACK_NOT_FOUND"
}
```

**Standard error codes**:

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `INVALID_REQUEST` | 400 | Missing or malformed fields |
| `TRACK_NOT_FOUND` | 404 | No track with given ID |
| `CANDIDATE_NOT_FOUND` | 404 | No candidate with given ID |
| `PROCESSING_FAILED` | 500 | Pipeline crashed during processing |
| `STEM_NOT_AVAILABLE` | 404 | Requested stem doesn't exist |
| `EXPORT_FAILED` | 500 | Audio encoding failed |

---

## 2.10 CORS Configuration

The frontend runs on `http://localhost:5173` (Vite dev server) while the backend runs on `http://localhost:8000`. CORS must be configured to allow:

```
Allow-Origin: http://localhost:5173
Allow-Methods: GET, POST, OPTIONS
Allow-Headers: Content-Type
```

In production (if served from the same origin), CORS is not needed.
