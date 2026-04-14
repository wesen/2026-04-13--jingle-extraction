---
Title: MiniMax Generation and Track Selection UX Architecture and Implementation Guide
Ticket: JINGLE-011
Status: active
Topics:
    - frontend
    - backend
    - minimax
    - ux
    - jingle-extractor
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: jingle-extractor-backend/app/database.py
      Note: Current track schema and persistence constraints
    - Path: jingle-extractor-backend/app/routes/analyze.py
      Note: Current path-based analyze contract that should become track-centric
    - Path: jingle-extractor-backend/app/routes/tracks.py
      Note: Current completed-only track listing behavior
    - Path: jingle-extractor-ui/src/App.tsx
      Note: Current top-level app shell lacks generation/library workflow
    - Path: jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx
      Note: Existing single-track extraction workbench to preserve and wrap
    - Path: jingle_extractor.py
      Note: Existing MiniMax CLI generation and full pipeline entrypoints
    - Path: out/vocal_jingles/README.md
      Note: Operator-facing artifact showing phrase-oriented jingle usage and output expectations
ExternalSources: []
Summary: Detailed intern-facing analysis and design for productizing MiniMax generation and track selection in the jingle extractor app.
LastUpdated: 2026-04-14T16:48:09.320663574-04:00
WhatFor: 'Design the next major product surface: generating multiple tracks with MiniMax, browsing them, comparing them, selecting keepers, and handing chosen tracks into the extraction workbench.'
WhenToUse: Use when implementing generation APIs, track library/catalog UI, studio-screen workflows, or onboarding engineers to the generation-to-extraction product model.
---


# MiniMax Generation and Track Selection UX Architecture and Implementation Guide

## Executive summary

The repository already contains two important pieces of the future product, but they live in different worlds.

1. The original CLI pipeline already knows how to call MiniMax and create multiple generated tracks in a batch. That behavior lives in `jingle_extractor.py`, especially `minimax_generate()` and the `generate` / `full` commands (`jingle_extractor.py:66-127`, `jingle_extractor.py:422-434`, `jingle_extractor.py:488-547`).
2. The productized frontend/backend stack already provides a reasonably strong extraction workbench for a single selected track. That workbench lives in the FastAPI routes and the React `JingleExtractor` shell (`jingle-extractor-backend/app/main.py:26-50`, `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx:44-384`).

The gap is that there is still no first-class product workflow for the step that comes before extraction: generating several candidate songs, auditioning them, keeping the interesting ones visible, and explicitly selecting which track should enter analysis. Today the system jumps from “track path exists on disk” straight into “analyze this one track.” That is fine for engineering smoke tests, but it is not a believable workflow for a human operator who is actually making jingles.

This document now recommends a simpler track-centric product model with one main studio workspace plus the existing mining screen:

- **Studio screen** — compose a MiniMax request, watch the current run, browse the track library, inspect a selected track, and trigger analysis.
- **Mining screen** — open one selected analyzed track in the existing extraction workbench and continue with analysis/mining/export.

The recommendation is to **keep the existing extraction workbench mostly intact** and add one focused studio screen in front of it rather than splitting the new UX into multiple tabs or modes. On the backend, the recommendation is to add a dedicated generation service and routes, plus richer track catalog metadata, rather than overloading the existing path-based `/api/analyze` flow. The most important product move is to stop thinking in terms of “the current hard-coded track ID” and instead think in terms of **track assets with lineage**.

---

## Problem statement and scope

### User request

The user asked to tackle the MiniMax generation part and track selection, then create a new `docmgr` ticket with a detailed, intern-friendly analysis / design / implementation guide, including ASCII screenshots, prose, bullets, pseudocode, diagrams, API references, and file references, and to upload the result to reMarkable.

### What this ticket covers

This ticket covers the design of:

1. A productized MiniMax generation workflow in the FastAPI + React application.
2. A track-selection workflow for generated and imported tracks.
3. The UX that bridges generation output to the existing extractor workbench.
4. The backend/API/data-model changes needed to support that workflow.
5. A phased implementation plan suitable for a new intern.

### What this ticket does **not** implement yet

This ticket is a research/design ticket, not a code-implementation ticket. It does not yet:

- add a new generation route,
- add a track-library UI,
- add a production generation/library screen,
- or change the extraction workbench runtime behavior.

### Why this scope matters

The current product is strong at **post-selection analysis** but weak at **pre-selection creative iteration**. That mismatch matters because real jingle creation is not “analyze the only track that exists”; it is “generate a handful of candidates, discard weak ones quickly, keep the interesting ones visible, and then invest analysis time in the winner.”

---

## How to read this document if you are a new intern

If you are new to the repository, read the sections in this order:

1. **System primer** — what the product actually is.
2. **Current-state analysis** — what already exists and what is missing.
3. **Operator workflow and UX goals** — what the human user needs.
4. **Proposed solution** — the target architecture and UI.
5. **Implementation plan** — the file-by-file build sequence.
6. **Testing strategy** — how to verify each phase.

If you need the short version, read only:

- the Executive summary,
- the ASCII screenshots,
- the API sketch section,
- and the Phase plan.

---

## System primer: what this product is today

At a high level, the product is trying to become an end-to-end jingle studio:

```text
Prompt / Lyrics
      │
      ▼
  MiniMax generation
      │
      ▼
   full song(s)
      │
      ├── select promising track(s)
      ▼
Demucs stem separation
      │
      ▼
WhisperX alignment + rhythm analysis
      │
      ▼
candidate mining
      │
      ▼
preview / trim / export jingles
```

Today, the repository already contains these layers:

```text
┌──────────────────────────────────────────────────────────────────────┐
│  CLI prototype layer                                                │
│  jingle_extractor.py                                                │
│  - MiniMax generation                                               │
│  - Demucs split                                                     │
│  - WhisperX alignment                                               │
│  - librosa mining                                                   │
│  - pydub export                                                     │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Productized backend layer                                          │
│  jingle-extractor-backend/app/*                                     │
│  - FastAPI routes                                                   │
│  - SQLite persistence                                               │
│  - background analysis pipeline                                     │
│  - export endpoints                                                 │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Productized frontend layer                                         │
│  jingle-extractor-ui/src/*                                          │
│  - extraction workbench                                             │
│  - transport                                                        │
│  - timeline                                                         │
│  - candidate list/detail                                            │
│  - debug panel                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

The missing part is not the analysis pipeline itself; the missing part is the **user-facing front door** for generation and selection.

---

## Current-state analysis

This section is evidence-backed. The goal is to explain what is already true in the repository before recommending changes.

### 1. MiniMax generation already exists, but only in the CLI prototype

The CLI script explicitly advertises MiniMax generation as part of the pipeline (`jingle_extractor.py:3-16`). The actual MiniMax API call lives in `minimax_generate()` (`jingle_extractor.py:66-127`). The script also already knows how to:

- generate one or more tracks via `cmd_generate()` (`jingle_extractor.py:422-434`),
- run a “generate several then mine them” flow via `cmd_full()` (`jingle_extractor.py:488-547`),
- and expose those features in the CLI parser (`jingle_extractor.py:577-609`).

This is important because it means:

- the generation logic does not need to be invented from scratch,
- but it **does** need to be moved into a backend service that the UI can call,
- and it needs stronger persistence and job-status reporting than the CLI currently provides.

### 2. The productized backend does not expose a generation API yet

The FastAPI app currently includes only these routers: `analyze`, `analysis`, `mine`, `export`, `tracks`, and `presets` (`jingle-extractor-backend/app/main.py:39-44`). There is no `generations` router.

The only current MiniMax-related backend evidence is configuration:

- `MINIMAX_API_KEY`
- `MINIMAX_API_URL`

in `jingle-extractor-backend/app/config.py:36-41`.

Observed implication:

- the backend knows MiniMax exists,
- but no HTTP route currently uses those settings,
- so the browser cannot initiate generation through the productized API.

### 3. The current analyze flow is path-based, not track-centric

The current `POST /api/analyze` endpoint accepts an `audio_file` string path (`jingle-extractor-backend/app/models.py:165-167`). In the route implementation, that path is validated as a server-local filesystem path and converted into a `track_id` from the file stem (`jingle-extractor-backend/app/routes/analyze.py:19-45`).

This is fine for internal development, but it is a poor product contract for generated assets because:

- the browser should not need to know server file paths,
- generated tracks already live on the server and should be selected by ID,
- and path-based requests blur the boundary between “import a file” and “analyze a known catalog track.”

### 4. The current backend pipeline is analysis-only

The background pipeline imports these functions from the CLI script:

- `analyze_rhythm`
- `demucs_split`
- `extract_words`
- `whisperx_transcribe`

(`jingle-extractor-backend/app/pipeline.py:20-25`)

It does **not** import `minimax_generate()`. The pipeline begins from an existing audio path, materializes `orig.mp3`, then runs separation/transcription/rhythm/mining (`jingle-extractor-backend/app/pipeline.py:117-246`).

So the backend already productizes the “after a track exists” part, but not the “create tracks” part.

### 5. The track catalog exists, but it is too thin for generation UX

The database already has a `tracks` table with fields such as:

- `id`
- `original_path`
- `inst_path`
- `vox_path`
- `duration`
- `bpm`
- `language`
- `status`
- `error_message`

(`jingle-extractor-backend/app/database.py:17-32`)

That is enough for analysis persistence, but not enough for generation UX. The schema currently lacks first-class fields for:

- prompt text,
- lyrics text,
- model used,
- whether vocals were requested,
- generation batch/run identity,
- operator keep/reject decision,
- display label,
- preview notes,
- and library grouping.

### 6. `/api/tracks` exists, but it only returns completed analyses

The backend route `GET /api/tracks` returns only rows where `status == "complete"` (`jingle-extractor-backend/app/routes/tracks.py:23-36`).

That means the current track list cannot represent:

- newly generated but unanalyzed tracks,
- pending analyses,
- failed generations,
- or a library of tracks still under operator review.

This is a critical product limitation because track selection happens **before** many tracks are fully analyzed.

### 7. The frontend app is still a single-track extraction shell

The React app renders `<JingleExtractor />` directly in `App.tsx` (`jingle-extractor-ui/src/App.tsx:10-26`). There is no top-level workspace shell, route switcher, or library state.

Inside `JingleExtractor`, the `trackId` prop defaults to `'thrash_metal_01'` (`jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx:38-45`). The component queries analysis for exactly one track ID and then renders the workbench around that one track (`jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx:62-384`).

There is also an API hook for `useListTracksQuery`, but it is not used anywhere outside the RTK Query definition (`jingle-extractor-ui/src/api/jingleApi.ts:132-161`; search result confirms the hook is otherwise unused).

Observed implication:

- the frontend is currently an **analysis workbench**, not a studio shell,
- and it has no first-class affordance for choosing which track to work on.

### 8. The current menu bar is informational, not navigational

`MenuBar.tsx` displays passive menu labels and track info (`jingle-extractor-ui/src/components/MenuBar/MenuBar.tsx`). It does not provide:

- track switching,
- generation entry,
- recent-run access,
- or a library view.

This matters because the top bar is one of the most natural places to expose studio context, selected-track context, and navigation back from mining without making the UI feel fragmented.

### 9. The original prototype also assumed a fixed mock track

The original prototype file `ttmp/.../sources/local/jingle-extractor-mac.jsx` starts from hard-coded `INIT_DATA` for `thrash_metal_01` and a single mock timeline/candidate set (`.../jingle-extractor-mac.jsx:19-45`).

That means the productization effort faithfully evolved the prototype’s assumptions, but those assumptions were intentionally narrow. This is a good reminder: the current lack of track selection is not a bug so much as an unfinished phase boundary.

### 10. The operator-facing artifacts already reveal the intended jingle affordances

The older vocal-jingle README is useful because it describes the output the operator actually cares about:

- named phrases,
- multiple render flavors (`vocal_*`, `inst_*`, `mixed_*`),
- short stings vs medium hooks vs long sections,
- “recommended” mixed outputs,
- and use-case-driven selection language.

See `out/vocal_jingles/README.md:5-18`, `:30-41`, and `:51-67`.

This is the most important user-experience clue in the repository. The real operator workflow is not abstractly “process audio”; it is:

- make a few candidate songs,
- find the best one quickly,
- then find the best phrases inside it,
- then export them in forms that are useful in production.

---

## Gap analysis

The current architecture leaves a gap between **creative generation** and **technical extraction**.

### Current reality

```text
local file path exists
      │
      ▼
/analyze
      │
      ▼
track analysis workbench
```

### Needed product reality

```text
write prompt / optional lyrics
      │
      ▼
generate N track variants
      │
      ▼
preview / keep / reject
      │
      ▼
select one (or several) tracks
      │
      ▼
analyze chosen track
      │
      ▼
extract jingles
```

### Main gaps

1. **No generation API**
   - the UI cannot start MiniMax generation.
2. **No generation job persistence**
   - the backend cannot show batch progress or a run history.
3. **No first-class track library**
   - generated tracks cannot be browsed or triaged before analysis.
4. **No track-centric analyze contract**
   - the product still leans on server-local file paths.
5. **No product shell above the extractor**
   - the existing UI assumes the track is already chosen.

---

## Operator workflow and UX goals

This section reframes the feature in human terms.

### What a jingle creator actually needs to do

A user creating jingles is usually not trying to inspect a track in isolation. They are trying to make a fast series of editorial decisions.

Typical decisions include:

1. “Did MiniMax give me anything worth keeping?”
2. “Which of these 4–8 tracks has the right energy and hook density?”
3. “Is this one instrumental, lyric-led, or cluttered?”
4. “Should I analyze this track now, or throw it away?”
5. “If I analyze it, which preset and mining mode should I start with?”

### Product implications

The UI therefore needs to optimize for:

- **batch generation**, not just one-off submission,
- **fast preview and rejection**, not just detailed inspection,
- **clear lineage**, so the user knows which prompt produced which track,
- **library-style selection**, not hidden hard-coded IDs,
- **quick handoff to extraction**, not a separate disconnected tool.

### Good affordances for this product

For this particular app, good affordances include:

- large primary “Generate” action,
- clear batch/run grouping,
- per-track actions: `Preview`, `Keep`, `Reject`, `Analyze`,
- badges for `generated`, `instrumental`, `lyrics`, `analyzed`, `keeper`,
- recent-run history,
- selected-track inspector,
- and a prominent “Open in Extractor” / “Analyze this track” CTA.

### Affordances that would be misleading

Avoid UX that makes the workflow feel like a generic file manager. For example:

- a raw table of server file paths,
- JSON-first controls as the main entrypoint,
- or a hidden track switcher buried inside the extractor pane.

That would optimize for engineers, not creators.

---

## Proposed solution overview

The proposed solution is a **single Studio screen** that combines three things in one place:

1. the generation form,
2. the current run results,
3. the broader track library with a selected-track inspector.

The existing `JingleExtractor` remains a separate, dedicated mining screen that the user enters only after choosing a track to analyze.

### Top-level information architecture

```text
App shell
├── Studio screen   → generate, browse current run, browse library, inspect track
└── Mining screen   → open selected track in existing JingleExtractor workbench
```

### Key design principle

Do **not** invent three separate product views if one focused workspace is enough. Instead:

- keep generation and library browsing together on one screen,
- keep the current run visible without navigation,
- keep a library pane visible for older tracks,
- and hand off to `JingleExtractor` only when the user is ready to mine jingles.

This keeps the UX simple, preserves the validated mining workbench, and matches the user request to avoid overcomplication.

---

## Proposed UI design

### Primary screen: Studio screen

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🍎 Jingle Extractor Studio                                                selected: none    │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌ Generate Track Batch ───────────────────────┐ ┌ Current Run / Results ─────────────────┐ │
│ │ Prompt                                      │ │ Run: Thrash hooks v5   status: complete │ │
│ │ [ death/thrash metal stings with hook     ] │ │                                         │ │
│ │                                             │ │ thrash_hook_01  0:55  vocal   [▶][Analyze]│ │
│ │ Lyrics (optional)                           │ │ thrash_hook_02  0:56  vocal   [▶][Analyze]│ │
│ │ [ [Hook] spinning power / burning fast   ] │ │ thrash_hook_03  0:54  vocal   [▶][Analyze]│ │
│ │                                             │ │ thrash_hook_04  0:55  vocal   [▶][Analyze]│ │
│ │ Model [music-2.6 ▼] Count [4]               │ │                                         │ │
│ │ Type  (•) vocal  ( ) instrumental           │ │ [Preview selected] [Analyze selected]   │ │
│ │ Prefix [ thrash_hook ]                      │ └─────────────────────────────────────────┘ │
│ │                                             │                                              │
│ │ [ Generate batch ] [ Save prompt ]          │ ┌ Library ────────────────────────────────┐ │
│ └─────────────────────────────────────────────┘ │ Search [ thrash                   ]      │ │
│                                                 │ Filters [all ▼] [generated ▼] [newest ▼] │ │
│ ┌ Selected Track Inspector ───────────────────┐ │                                          │ │
│ │ Track: thrash_hook_02                       │ │ ★ thrash_hook_02   generated  analyzed   │ │
│ │ Prompt: death/thrash metal stings...        │ │   doom_bed_01      generated  pending    │ │
│ │ Lyrics: [Hook] spinning power...            │ │   power_metal_01   analyzed   complete   │ │
│ │ Status: generated / not analyzed            │ │   upload_take_03   imported   complete   │ │
│ │ Duration: 0:56                              │ │                                          │ │
│ │                                             │ │ click row to inspect / preview / analyze │ │
│ │ [▶ Preview] [Analyze track] [Open in Mining]│ └──────────────────────────────────────────┘ │
│ └─────────────────────────────────────────────┘                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Why this screen works

- It keeps the creation form, the fresh batch output, and the historical library visible at the same time.
- It does not force the user to mentally switch between separate “Generate” and “Library” worlds.
- It preserves the important distinction between the **studio workflow** and the **mining workflow** without fragmenting the studio itself.
- It makes the handoff explicit: `Analyze track` first, then `Open in Mining` when analysis is ready.

### Secondary screen: existing mining screen with light context bar

This ticket still assumes a separate mining screen, but it should remain minimal and familiar.

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🍎 Jingle Extractor Mining                                               track: hook_02  │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Back to Studio]   thrash_hook_02   generated / analyzed / ready                          │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Existing JingleExtractor workbench                                                         │
│ Presets | Config | Transport | Timeline | Candidates | Detail | Debug                     │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

The mining screen should not gain generation UI. It remains the specialized screen for candidate mining and export.

### Concise YAML DSL for the studio screen

The goal of this YAML is not to be runtime code. It is a concise handoff representation of the intended React markup and widget composition so a UX designer can map it to the design system quickly.

```yaml
screen: StudioScreen
widget: StudioShell
props:
  title: Jingle Extractor Studio
children:
  - widget: MenuBar
    props:
      mode: studio
      selectedTrackLabel: "thrash_hook_02"

  - widget: LayoutRow
    props: { gap: md, align: stretch }
    children:
      - widget: LayoutColumn
        props: { width: 0.42, gap: md }
        children:
          - widget: MacWindow
            props: { title: "Generate Track Batch" }
            children:
              - widget: GenerationComposer   # new
                props:
                  fields:
                    - prompt
                    - lyrics
                    - model
                    - count
                    - type
                    - namingPrefix
                  actions:
                    - generateBatch
                    - savePrompt

          - widget: MacWindow
            props: { title: "Selected Track Inspector" }
            children:
              - widget: TrackInspector       # new
                props:
                  sections:
                    - summary
                    - prompt
                    - lyrics
                    - status
                    - actions
                  actions:
                    - preview
                    - analyzeTrack
                    - openInMining

      - widget: LayoutColumn
        props: { width: 0.58, gap: md }
        children:
          - widget: MacWindow
            props: { title: "Current Run / Results" }
            children:
              - widget: RunSummaryBar       # new
                props:
                  fields: [runName, status, requestedCount, completedCount]
              - widget: TrackResultsList    # new
                props:
                  rowActions: [preview, analyze]
                  selectable: true

          - widget: MacWindow
            props: { title: "Library" }
            children:
              - widget: LibraryToolbar      # new
                props:
                  fields: [search, statusFilter, sourceFilter, sort]
              - widget: TrackLibraryList    # new
                props:
                  rowActions: [preview, analyze]
                  selectable: true
```

### Widget reuse guidance for the design system handoff

#### Reuse existing widgets where possible

- `MenuBar`
- `MacWindow`
- existing button styling/tokens
- existing theme / spacing / typography tokens

#### Add new widgets only where the existing system has no equivalent

- `GenerationComposer`
- `TrackResultsList`
- `TrackLibraryList`
- `TrackInspector`
- `RunSummaryBar`
- `LibraryToolbar`
- simple layout primitives if needed (`LayoutRow`, `LayoutColumn`)

#### Important handoff note

The designer should treat `TrackResultsList` and `TrackLibraryList` as siblings with a shared row language. The current run is not a totally different control system; it is a focused subset of the broader library.

### Existing widget inventory available today

This section is meant as a direct handoff aid for the UX designer. It lists the React widgets that already exist in the repository and the props they accept today, so the designer can prefer reuse over unnecessary invention.

#### 1. `MacWindow`

Source: `jingle-extractor-ui/src/components/MacWindow/MacWindow.tsx`

```ts
{
  title: string;
  children: ReactNode;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}
```

Use for: framed panels, tool windows, inspectors, lists, transport boxes.

#### 2. `MenuBar`

Source: `jingle-extractor-ui/src/components/MenuBar/MenuBar.tsx`

```ts
{
  track: Track;
}
```

Use for: top application chrome. Today it is track-oriented, so the studio screen will likely need either a small extension or a studio-specific wrapper around it.

#### 3. `PresetPanel`

Source: `jingle-extractor-ui/src/components/PresetPanel/PresetPanel.tsx`

```ts
{
  presets: PresetName[];
  activePreset: PresetName | null;
  onSelect: (name: PresetName) => void;
}
```

Use for: preset picking in the mining screen. Not directly needed on the studio screen, but part of the existing mining workbench.

#### 4. `ConfigEditor`

Source: `jingle-extractor-ui/src/components/ConfigEditor/ConfigEditor.tsx`

```ts
{
  config: AnalysisConfig;
  onChange: (config: AnalysisConfig) => void;
  onRun: () => void;
  onReset: () => void;
  isLoading?: boolean;
  style?: CSSProperties;
}
```

Use for: mining configuration editing. It already includes explicit strategy buttons for `rhythmic` and `lyric_aligned`.

#### 5. `TransportBar`

Source: `jingle-extractor-ui/src/components/TransportBar/TransportBar.tsx`

```ts
{
  playhead: number;
  duration: number;
  stem: StemType;
  onStemChange: (stem: StemType) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
  isPlaying?: boolean;
}
```

Use for: full-track playback controls in the mining screen. Parts of its visual language may also inform simple track preview controls on the studio screen.

#### 6. `Timeline`

Source: `jingle-extractor-ui/src/components/Timeline/Timeline.tsx`

```ts
{
  data: TimelineData;
  candidates: Candidate[];
  vocals: VocalSegment[];
  selectedId: number | null;
  playhead: number;
  onSelect: (id: number) => void;
  onCandidateUpdate: (id: number, edge: 'start' | 'end', time: number) => void;
  onPlayheadChange: (time: number) => void;
}
```

Use for: mining timeline only. Not recommended for the main studio screen.

#### 7. `CandidateList`

Source: `jingle-extractor-ui/src/components/CandidateList/CandidateList.tsx`

```ts
{
  candidates: Array<Candidate & { edited?: boolean }>;
  selectedId: number | null;
  previewingId?: number | null;
  onSelect: (id: number) => void;
  onPreview: (id: number) => void;
}
```

Use for: mined jingle list. Its dense row style is a useful reference for future track-result rows.

#### 8. `CandidateDetail`

Source: `jingle-extractor-ui/src/components/CandidateDetail/CandidateDetail.tsx`

```ts
{
  candidate: Candidate & { edited?: boolean };
  stem: StemType;
  isPreviewing?: boolean;
  onPreview: () => void;
  onExport: () => void;
  onResetEdit: () => void;
}
```

Use for: mining detail panel. Its overall inspector composition is a strong precedent for a future `TrackInspector` widget.

#### 9. `ScoreBar`

Source: `jingle-extractor-ui/src/components/ScoreBar/ScoreBar.tsx`

```ts
{
  label: string;
  value: number;
  className?: string;
}
```

Use for: quality metrics. Could be reused for generation/run quality indicators later if scoring concepts are added.

#### 10. `DebugPanel`

Source: `jingle-extractor-ui/src/components/DebugPanel/DebugPanel.tsx`

```ts
{
  candidates: Array<Candidate & { edited?: boolean }>;
  vocals: VocalSegment[];
  selectedCandidateId: number | null;
  activePreset: PresetName | null;
  config: AnalysisConfig;
  onSelectCandidate?: (id: number) => void;
}
```

Use for: mining/debug workflows only.

#### 11. `JingleExtractor`

Source: `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`

```ts
{
  trackId?: string;
}
```

Use for: the existing mining screen container. This should remain the main entry point for the post-selection extraction workflow.

### Existing widget summary table

| Widget | Exists now | Best reuse target | Notes |
|---|---|---|---|
| `MacWindow` | yes | studio + mining | strongest chrome primitive |
| `MenuBar` | yes | studio + mining | likely needs a studio-aware variant or wrapper |
| `PresetPanel` | yes | mining | no need on studio screen |
| `ConfigEditor` | yes | mining | no need on studio screen |
| `TransportBar` | yes | mining | preview controls may borrow its visual language |
| `Timeline` | yes | mining | too detailed for studio screen |
| `CandidateList` | yes | mining | row density useful as a pattern |
| `CandidateDetail` | yes | mining | inspector pattern useful for `TrackInspector` |
| `ScoreBar` | yes | mining / possible future analytics | simple reusable meter |
| `DebugPanel` | yes | mining | internal/debug oriented |
| `JingleExtractor` | yes | mining screen container | preserve rather than rewrite |

---

## Proposed frontend architecture

### High-level component structure

```text
App
├── StudioScreen
│   ├── StudioHeader
│   ├── GenerationComposer
│   ├── RunResultsPanel
│   │   ├── RunSummaryBar
│   │   └── TrackResultsList
│   ├── LibraryPanel
│   │   ├── LibraryToolbar
│   │   └── TrackLibraryList
│   └── TrackInspector
└── MiningScreen
    ├── MiningContextBar
    └── JingleExtractor   (existing component)
```

### Recommended Redux / UI state additions

The current `analysisSlice` only stores extractor-specific state (`jingle-extractor-ui/src/features/analysis/analysisSlice.ts:9-28`). That is too narrow for a generation-driven studio screen.

Add a new top-level slice, for example `studioSlice`, with state such as:

```ts
interface StudioState {
  activeScreen: 'studio' | 'mining';
  selectedTrackId: string | null;
  selectedRunId: string | null;
  previewTrackId: string | null;
  libraryFilters: {
    source: 'all' | 'generated' | 'imported';
    status: 'all' | 'pending' | 'generated' | 'analyzed' | 'failed';
    sort: 'newest' | 'oldest' | 'name';
    search: string;
  };
}
```

### Frontend API additions

Extend `jingle-extractor-ui/src/api/jingleApi.ts` with endpoints like:

- `createGeneration`
- `listGenerationRuns`
- `getGenerationRun`
- `listTrackCatalog`
- `analyzeTrack`

Keep the existing extraction endpoints intact.

### Frontend file layout recommendation

Add files such as:

```text
jingle-extractor-ui/src/components/StudioScreen/*
jingle-extractor-ui/src/components/GenerationComposer/*
jingle-extractor-ui/src/components/RunResultsPanel/*
jingle-extractor-ui/src/components/TrackLibraryList/*
jingle-extractor-ui/src/components/TrackInspector/*
jingle-extractor-ui/src/features/studio/studioSlice.ts
```

Do not overload `JingleExtractor.tsx` with generation concerns. Keep it focused on mining/extraction.

---

## Proposed backend architecture

### Core idea

Treat generation as a first-class background job with durable metadata.

### Recommended entities

#### 1. `generation_runs`
One row per user batch request.

Suggested fields:

- `id`
- `created_at`
- `prompt`
- `lyrics`
- `model`
- `instrumental`
- `count_requested`
- `status` (`queued`, `generating`, `complete`, `partial_failed`, `failed`)
- `error_message`

#### 2. `tracks` (extend existing table)
Keep `tracks` as the canonical audio asset table, but enrich it.

Suggested new fields:

- `source_type` (`generated`, `imported`, `uploaded`)
- `display_name`
- `generation_run_id` (nullable FK)
- `variant_index` (nullable)
- `decision` (`pending`, `keep`, `reject`)
- `prompt_snapshot` (nullable)
- `lyrics_snapshot` (nullable)
- `minimax_model` (nullable)
- `instrumental_requested` (nullable boolean)

### Why not store everything only in `tracks`?

Because `generation_runs` and `tracks` represent different concepts:

- a **run** is a batch request,
- a **track** is one audio asset that came out of that request.

Keeping them separate makes it possible to show “Thrash hooks v4” as a run that contains four variants, which is exactly how creators think.

### Backend routes to add

#### Generation routes

```text
POST /api/generations
GET  /api/generations
GET  /api/generations/{generation_id}
```

#### Track catalog routes

```text
GET   /api/library/tracks
PATCH /api/library/tracks/{track_id}
POST  /api/library/tracks/{track_id}/analyze
```

### Why a new `analyzeTrack` route is preferable

Today, `/api/analyze` is path-based (`audio_file`) (`jingle-extractor-backend/app/models.py:165-167`). For product UX, a selected track should be analyzed by **track ID**, not by asking the browser to submit a server file path.

Recommended v1 behavior:

- keep `/api/analyze` for internal compatibility if needed,
- introduce `POST /api/library/tracks/{track_id}/analyze`,
- move the main UI to the track-centric endpoint,
- optionally deprecate direct path usage later.

---

## API reference sketch

These are proposal-level contracts, not yet implemented code.

### `POST /api/generations`

Request:

```json
{
  "prompt": "Death/thrash metal bumper with chantable hook, aggressive guitars, 170 BPM",
  "lyrics": "[Hook]\nSpinning power / burning fast",
  "instrumental": false,
  "model": "music-2.6",
  "count": 4,
  "naming_prefix": "thrash_hook"
}
```

Accepted response:

```json
{
  "generation_id": "gen_20260414_001",
  "status": "queued",
  "count_requested": 4
}
```

### `GET /api/generations/{generation_id}`

Response:

```json
{
  "id": "gen_20260414_001",
  "status": "generating",
  "prompt": "Death/thrash metal bumper with chantable hook, aggressive guitars, 170 BPM",
  "lyrics": "[Hook]\nSpinning power / burning fast",
  "model": "music-2.6",
  "instrumental": false,
  "count_requested": 4,
  "tracks": [
    {
      "id": "thrash_hook_01",
      "display_name": "thrash_hook_01",
      "status": "generated",
      "duration": 55.4,
      "decision": "pending",
      "analysis_status": null
    }
  ]
}
```

### `GET /api/library/tracks`

Suggested query params:

- `origin=generated|imported|all`
- `decision=pending|keep|reject|all`
- `analyzed=yes|no|all`
- `generation_id=<id>`

Response item sketch:

```json
{
  "id": "thrash_hook_02",
  "display_name": "thrash_hook_02",
  "source_type": "generated",
  "generation_run_id": "gen_20260414_001",
  "variant_index": 2,
  "duration": 55.8,
  "decision": "keep",
  "analysis_status": "complete",
  "prompt_snapshot": "Death/thrash metal bumper ...",
  "lyrics_snapshot": "[Hook] Spinning power ...",
  "instrumental_requested": false
}
```

### `PATCH /api/library/tracks/{track_id}`

Request:

```json
{
  "display_name": "keeper_fast_hook",
  "decision": "keep",
  "notes": "Clean attack, strongest hook"
}
```

### `POST /api/library/tracks/{track_id}/analyze`

Request:

```json
{
  "config": {
    "min_dur": 0.5,
    "max_dur": 4.0,
    "min_score": 35,
    "vocal_mode": "vocal",
    "candidate_mode": "lyric_aligned",
    "lyric_padding_before": 0.5,
    "lyric_padding_after": 0.5,
    "atk_w": 3,
    "end_w": 3,
    "nrg_w": 2,
    "beat_w": 1,
    "max_cand": 10,
    "fade_in": 20,
    "fade_out": 50,
    "fmt": "mp3",
    "br": 320
  }
}
```

Accepted response:

```json
{
  "track_id": "thrash_hook_02",
  "status": "uploaded"
}
```

---

## Recommended runtime flows

### Flow A: generate a batch

```text
User submits generation form
      │
      ▼
POST /api/generations
      │
      ▼
backend creates generation_run row (queued)
      │
      ▼
background task starts MiniMax calls
      │
      ├── for each variant: save mp3, create track row, update progress
      ▼
run marked complete / partial_failed / failed
      │
      ▼
frontend polls GET /api/generations/{id}
      │
      ▼
results grid populates with generated track cards
```

### Flow B: select a track for extraction

```text
User previews several tracks
      │
      ▼
marks one as keep
      │
      ▼
clicks Analyze or Open in Extractor
      │
      ▼
POST /api/library/tracks/{track_id}/analyze
      │
      ▼
backend runs existing analysis pipeline for that track
      │
      ▼
frontend navigates to Extract view and polls analysis status
      │
      ▼
existing JingleExtractor UI becomes available for that selected track
```

### Flow C: return from mining to the studio screen

```text
User finishes listening to mined candidates
      │
      ▼
clicks Back to Studio
      │
      ▼
studio screen restores selected track + current filters
      │
      ▼
user can generate another run or choose another library track
```

---

## Pseudocode sketches

### Backend: generation service

```python
async def create_generation_run(request: CreateGenerationRequest) -> GenerationAccepted:
    run_id = db.insert_generation_run(
        prompt=request.prompt,
        lyrics=request.lyrics,
        model=request.model,
        instrumental=request.instrumental,
        count_requested=request.count,
        status="queued",
    )
    background_tasks.add_task(run_generation_batch, run_id, request)
    return GenerationAccepted(generation_id=run_id, status="queued")


async def run_generation_batch(run_id: str, request: CreateGenerationRequest) -> None:
    db.update_generation_run(run_id, status="generating")
    for i in range(request.count):
        try:
            track_id = f"{safe_prefix(request.naming_prefix)}_{i+1:02d}"
            out_path = generation_track_path(track_id)
            minimax_generate(
                prompt=request.prompt,
                lyrics=request.lyrics,
                instrumental=request.instrumental,
                model=request.model,
                out_path=out_path,
            )
            db.create_track(
                track_id=track_id,
                original_path=str(out_path),
                status="generated",
                source_type="generated",
                generation_run_id=run_id,
                variant_index=i + 1,
                prompt_snapshot=request.prompt,
                lyrics_snapshot=request.lyrics,
                minimax_model=request.model,
                instrumental_requested=request.instrumental,
            )
        except Exception as e:
            db.record_generation_variant_failure(run_id, i + 1, str(e))
    db.finalize_generation_run_status(run_id)
```

### Frontend: generate view orchestration

```ts
function StudioScreen() {
  const [createGeneration] = useCreateGenerationMutation();
  const selectedRunId = useAppSelector((s) => s.studio.selectedRunId);
  const { data: run } = useGetGenerationRunQuery(selectedRunId, { skip: !selectedRunId });
  const { data: library } = useListTrackCatalogQuery();

  async function handleSubmit(form: GenerationFormState) {
    const accepted = await createGeneration(form).unwrap();
    dispatch(setSelectedRunId(accepted.generation_id));
  }

  return (
    <StudioLayout
      composer={<GenerationComposer onSubmit={handleSubmit} />}
      runResults={<TrackResultsList tracks={run?.tracks ?? []} />}
      library={<TrackLibraryList tracks={library ?? []} />}
      inspector={<TrackInspector />}
    />
  );
}
```

### Frontend: open selected track in extractor

```ts
function handleOpenInMining(trackId: string) {
  dispatch(setSelectedTrackId(trackId));
  dispatch(setActiveScreen('mining'));
}
```

---

## Detailed implementation plan

This plan is intentionally explicit so a new intern can execute it with low ambiguity.

### Phase 1: establish backend generation data model and routes

#### Goal
Create a minimal but honest generation API and persistence layer.

#### Files to change

- `jingle-extractor-backend/app/database.py`
- `jingle-extractor-backend/app/models.py`
- `jingle-extractor-backend/app/main.py`
- `jingle-extractor-backend/app/config.py`
- `jingle-extractor-backend/tests/test_endpoints.py`

#### Files to add

- `jingle-extractor-backend/app/routes/generations.py`
- `jingle-extractor-backend/app/services/generation_service.py`

#### Work items

1. Add `generation_runs` schema.
2. Extend `tracks` with generation/catalog metadata.
3. Add Pydantic models for create/list/get generation responses.
4. Add `POST /api/generations`.
5. Add `GET /api/generations` and `GET /api/generations/{id}`.
6. Include the new router in `main.py`.
7. Add tests using monkeypatched MiniMax generation.

#### Notes

Start with synchronous/sequential generation inside a background task. Do not optimize concurrency first. Cost control, simpler failure handling, and deterministic logs matter more than throughput in v1.

### Phase 2: make tracks a real library, not only completed analyses

#### Goal
Support browsing and filtering generated/imported tracks before analysis.

#### Files to change

- `jingle-extractor-backend/app/database.py`
- `jingle-extractor-backend/app/models.py`
- `jingle-extractor-backend/app/routes/tracks.py`
- `jingle-extractor-backend/tests/test_endpoints.py`

#### Work items

1. Add a richer track summary model for library use.
2. Stop limiting `GET /api/tracks` to only `status == complete`.
3. Either:
   - repurpose `/api/tracks` into a full library endpoint, or
   - add a clearer `/api/library/tracks` endpoint.
4. Add track decision update support (`keep`, `reject`, `pending`).
5. Add server-side filtering by origin, decision, analyzed state, and generation run.

#### Recommendation

Prefer a dedicated library endpoint so the semantics are unambiguous. The existing `/api/tracks` behavior was designed around the extractor and transport playback, not around editorial browsing.

### Phase 3: add track-centric analyze flow

#### Goal
Allow the UI to analyze a selected catalog track by ID rather than server path.

#### Files to change

- `jingle-extractor-backend/app/routes/analyze.py`
- `jingle-extractor-backend/app/models.py`
- `jingle-extractor-backend/app/pipeline.py`
- `jingle-extractor-backend/tests/test_endpoints.py`

#### Work items

1. Add `POST /api/library/tracks/{track_id}/analyze`.
2. Resolve the selected track from the catalog.
3. Feed its `original_path` into the existing pipeline.
4. Keep `/api/analyze` temporarily for backwards compatibility and dev seeding.
5. Document the new preferred route.

### Phase 4: build the frontend studio shell

#### Goal
Introduce a top-level app shell that can switch between Generate / Library / Extract.

#### Files to change

- `jingle-extractor-ui/src/App.tsx`
- `jingle-extractor-ui/src/api/jingleApi.ts`
- `jingle-extractor-ui/src/api/types.ts`
- `jingle-extractor-ui/src/app/store.ts`
- `jingle-extractor-ui/src/mocks/handlers.ts`

#### Files to add

- `jingle-extractor-ui/src/features/studio/studioSlice.ts`
- `jingle-extractor-ui/src/components/StudioShell/*`
- `jingle-extractor-ui/src/components/GenerationComposer/*`
- `jingle-extractor-ui/src/components/TrackGrid/*`
- `jingle-extractor-ui/src/components/TrackInspector/*`
- `jingle-extractor-ui/src/components/CompareTray/*`

#### Work items

1. Add workspace navigation state.
2. Replace the direct `<JingleExtractor />` render in `App.tsx` with `<StudioShell />`.
3. Nest `JingleExtractor` inside the Extract view only.
4. Keep theming and Mac-window aesthetics consistent with existing components.

### Phase 5: implement the generate workflow UI

#### Goal
Make generation usable from the browser.

#### Work items

1. Build a `GenerationComposer` form.
2. Add run polling.
3. Render generated tracks as cards or dense list rows.
4. Provide per-track preview/keep/reject/analyze actions.
5. Show clear status for queued / generating / complete / failed.

#### Important UX note

Do not make the user leave the generate view just to see results. The result list should be on the same screen as the generation form.

### Phase 6: implement library and compare mode

#### Goal
Support rapid editorial decisions across multiple generated tracks.

#### Work items

1. Add searchable/sortable track library.
2. Add keep/reject/pending badges and filters.
3. Add compare tray for two selected tracks.
4. Add notes or lightweight annotations if time permits.

### Phase 7: integrate handoff to extraction

#### Goal
Make selection feel seamless.

#### Work items

1. Add `Open in Extractor` action from results grid and inspector.
2. Add top-of-screen track context bar in Extract view.
3. When selected track is not yet analyzed, show a clear `Analyze this track` action.
4. Reuse the existing `JingleExtractor` component for the actual extraction surface.

---

## Testing and validation strategy

### Backend tests

Add tests for:

1. creating a generation run,
2. polling run status,
3. persistence of generated track metadata,
4. track library filtering,
5. decision updates,
6. track-centric analyze route.

### Frontend tests

Add tests for:

1. generation form submission,
2. polling and rendering run results,
3. selecting a track,
4. switching to Extract view,
5. library filters,
6. compare tray behavior.

### Storybook coverage

Add stories for:

- generation form idle/loading/error,
- run with 0 / 1 / 4 results,
- library with keepers/rejected/pending tracks,
- compare tray open/closed,
- extract view with analyzed vs unanalyzed selected track.

### Manual validation checklist

```bash
# backend
cd jingle-extractor-backend && python3 -m pytest -q tests

# frontend build/lint/test
cd jingle-extractor-ui && npm run build
cd jingle-extractor-ui && npm run lint
cd jingle-extractor-ui && npx vitest run
```

### Live workflow validation

Run this product scenario end-to-end:

1. Submit a 4-track MiniMax batch.
2. Wait for generation completion.
3. Preview all 4 tracks.
4. Mark 1 keep, 2 reject, 1 pending.
5. Analyze the keeper.
6. Open it in Extract view.
7. Preview and export at least one candidate.

That is the real product acceptance test for this ticket line.

---

## Risks, tradeoffs, and open questions

### Risk 1: generation cost and latency

MiniMax generation is slower and costlier than a simple metadata write. The UI must not pretend generation is instantaneous.

Mitigation:

- use accepted/polling contracts,
- show clear queued/generating states,
- keep run history durable.

### Risk 2: overloading the existing `tracks` concept

The current `tracks` table already carries analysis state. Extending it too casually could create confusion between generation status and analysis status.

Mitigation:

- keep `generation_runs` separate,
- be explicit about field naming,
- distinguish `source_type`, `decision`, and `analysis_status` clearly.

### Risk 3: server-side secret handling

MiniMax keys must remain server-side. The frontend must never receive raw API keys.

Mitigation:

- generation only via backend routes,
- continue storing the key in local environment configuration,
- never commit or echo secret values in code/docs.

### Risk 4: UI complexity explosion

If generation, library, compare, and extraction are all jammed into one monolithic component, maintainability will collapse.

Mitigation:

- use a top-level shell with distinct workspaces,
- keep the existing extractor separate,
- avoid putting generation state into `analysisSlice`.

### Open questions

1. Should v1 support importing arbitrary local files into the same library flow, or only generated tracks?
2. Should compare mode allow only 2 tracks, or up to 3?
3. Should generation preview use the same audio player hook as extractor playback, or a separate simpler controller?
4. Should auto-analysis of “kept” tracks be an optional toggle later?
5. Should run history show prompt templates / reusable prompt presets in the same surface, or later?

---

## Alternatives considered

### Alternative A: bolt generation controls directly into `JingleExtractor`

Rejected because it would mix two different jobs:

- choosing what track to work on,
- and extracting candidates from a chosen track.

That would make the current extractor shell harder to reason about.

### Alternative B: keep `/api/analyze` path-based and let the UI remember file paths

Rejected because it is not a clean product contract. The browser should deal in **track IDs and generation IDs**, not backend-local filesystem paths.

### Alternative C: only add a dropdown of completed tracks

Rejected because it misses the real workflow. Track selection usually happens **before** analysis is complete, and often before analysis has even started.

### Alternative D: force generation and analysis to happen in one combined “full pipeline” job

Rejected for v1 product UX because creators need to listen to raw tracks before spending time on deeper analysis. The right separation is:

- generate batch,
- select winners,
- analyze chosen winners.

---

## File-by-file reference map

These files matter most for the eventual implementation:

### Existing generation logic

- `jingle_extractor.py:66-127` — MiniMax API call.
- `jingle_extractor.py:422-434` — CLI `generate` command.
- `jingle_extractor.py:488-547` — CLI `full` batch flow.

### Existing backend runtime

- `jingle-extractor-backend/app/main.py:26-50` — current FastAPI router set.
- `jingle-extractor-backend/app/config.py:36-41` — MiniMax env config.
- `jingle-extractor-backend/app/routes/analyze.py:19-45` — current path-based analyze contract.
- `jingle-extractor-backend/app/pipeline.py:102-246` — existing analysis pipeline.
- `jingle-extractor-backend/app/database.py:17-82` — current DB schema.
- `jingle-extractor-backend/app/routes/tracks.py:23-36` — completed-only track listing.

### Existing frontend runtime

- `jingle-extractor-ui/src/App.tsx:10-26` — direct render of extractor without studio shell.
- `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx:44-384` — current single-track workbench.
- `jingle-extractor-ui/src/components/MenuBar/MenuBar.tsx` — informational top bar.
- `jingle-extractor-ui/src/api/jingleApi.ts:63-149` — current API surface.
- `jingle-extractor-ui/src/features/analysis/analysisSlice.ts:20-94` — current extraction-only UI state.

### Historical / operator-behavior references

- `ttmp/2026/04/13/JINGLE-002--jingle-extractor-react-application-storybook-vite-rtk-query-msw-css-themable/sources/local/jingle-extractor-mac.jsx:19-45` — original prototype assumed a single mock track.
- `out/vocal_jingles/README.md:5-18` — multiple export flavors and phrase-centric operator framing.
- `out/vocal_jingles/README.md:30-41` — short/medium/long editorial buckets.
- `out/vocal_jingles/README.md:51-67` — use-case-driven output framing.

---

## Recommended first implementation slice

If the next ticket implements this design, the best first slice is:

1. backend generation run table + routes,
2. richer track library endpoint,
3. minimal frontend Generate view,
4. minimal track list with Preview / Analyze,
5. handoff into the existing Extract view.

Do **not** start with compare mode or advanced notes. First make the basic loop work:

```text
generate batch → see results → preview → analyze selected → open extractor
```

That is the shortest path to a believable product.

---

## Conclusion

The repo is already good at extraction once a track is selected. The next major product milestone is to make track creation and track choice explicit, durable, and pleasant.

The central design recommendation is simple:

- make **generation runs** first-class,
- make **tracks** first-class library assets,
- make **selection** a visible editorial step,
- and let the existing extractor remain the specialized tool used after that selection.

That direction matches both the current codebase and the real human workflow of a jingle creator.

## References

- `jingle_extractor.py`
- `jingle-extractor-backend/app/main.py`
- `jingle-extractor-backend/app/config.py`
- `jingle-extractor-backend/app/database.py`
- `jingle-extractor-backend/app/pipeline.py`
- `jingle-extractor-backend/app/routes/analyze.py`
- `jingle-extractor-backend/app/routes/tracks.py`
- `jingle-extractor-backend/app/models.py`
- `jingle-extractor-ui/src/App.tsx`
- `jingle-extractor-ui/src/api/jingleApi.ts`
- `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
- `jingle-extractor-ui/src/components/MenuBar/MenuBar.tsx`
- `jingle-extractor-ui/src/features/analysis/analysisSlice.ts`
- `ttmp/2026/04/13/JINGLE-002--jingle-extractor-react-application-storybook-vite-rtk-query-msw-css-themable/sources/local/jingle-extractor-mac.jsx`
- `out/vocal_jingles/README.md`
