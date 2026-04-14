---
Title: Full-Stack Architecture Review, Alignment Assessment, and Cleanup Plan
Ticket: JINGLE-004
Status: active
Topics:
    - frontend
    - backend
    - architecture
    - review
    - react
    - fastapi
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: jingle-extractor-backend/app/models.py
      Note: Backend data contracts mapped against frontend types
    - Path: jingle-extractor-backend/app/pipeline.py
      Note: Backend analysis pipeline orchestration and scoring flow
    - Path: jingle-extractor-backend/app/routes/mine.py
      Note: Candidate re-mining semantics and min_score gap
    - Path: jingle-extractor-ui/src/api/jingleApi.ts
      Note: Frontend API contracts and route typing assumptions
    - Path: jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx
      Note: Root widget orchestration and current interaction seams
    - Path: jingle-extractor-ui/src/components/Timeline/Timeline.tsx
      Note: Timeline rendering layers and candidate drag behavior
    - Path: ttmp/2026/04/13/JINGLE-002--jingle-extractor-react-application-storybook-vite-rtk-query-msw-css-themable/sources/local/jingle-extractor-mac.jsx
      Note: Original imported prototype used for extraction comparison
ExternalSources: []
Summary: Evidence-backed review of the current React + FastAPI jingle extractor implementation, including architecture mapping, prototype extraction assessment, frontend/backend alignment review, code quality findings, and a phased cleanup plan for follow-up work.
LastUpdated: 2026-04-13T21:45:00-04:00
WhatFor: Onboard a new engineer to the system and document where the implementation is strong, where it is incomplete, and what should be cleaned up next.
WhenToUse: Use when reviewing the current state of the jingle extractor UI/backend stack, planning cleanup work, or onboarding a new intern who needs a clear map of the system.
---


# Full-Stack Architecture Review, Alignment Assessment, and Cleanup Plan

## 1. Executive Summary

The jingle extractor project is already a credible v1 full-stack prototype. The core architecture is sound: the backend exposes a clean FastAPI surface over a long-running ML pipeline, the frontend has been decomposed from the original monolithic JSX prototype into a modular React component set, the UI theme system has been moved into stable CSS custom properties and `data-part` selectors, and the backend data model is broadly aligned with the TypeScript contracts. The system is understandable, demoable, and structurally positioned for production hardening.

The most important conclusion is that the *shape* of the product is now correct, but several *runtime seams* are still unfinished or inconsistent. The codebase is strongest in visual component extraction, data model normalization, and backend pipeline orchestration. It is weakest in interaction completeness, contract exactness, and cleanup hygiene. In particular, the transport/playback path is not fully implemented, candidate drag edits are not represented coherently across UI and backend, the frontend API typings do not exactly match all backend responses, and some configuration fields are currently accepted but ignored.

For a new intern, the right mental model is this:

1. The backend is the system of record for track analysis, stems, timeline arrays, vocal segments, and scored candidates.
2. The frontend is a presentation layer plus thin local UI state, not a second scoring engine.
3. The original imported JSX prototype has been successfully broken into the right top-level component families, but some behavior that existed conceptually in the prototype is still only partially implemented in the productionized version.
4. The next round of work should focus less on adding new widgets and more on making the current contracts, interactions, and validation paths internally consistent.

At a high level, I would judge the current state as:

- **Architecture direction:** strong
- **Component extraction quality:** strong
- **Backend scaffolding quality:** strong
- **Frontend/backend contract discipline:** medium
- **Interaction completeness:** medium to weak
- **Validation and cleanup hygiene:** medium

## 2. Scope and Review Questions

This review answers five concrete questions:

1. **What is the system, end to end?**
2. **Was the original imported prototype decomposed into the right React components?**
3. **Is the FastAPI backend aligned with the UI and with the original workflow goals?**
4. **What are the main code quality issues and architectural risks?**
5. **What should a new engineer do next, in what order, and why?**

The review covers:

- the React/Vite/Storybook frontend in `jingle-extractor-ui/`
- the FastAPI/SQLite/ML backend in `jingle-extractor-backend/`
- the original prototype import at `ttmp/.../sources/local/jingle-extractor-mac.jsx`
- the current build/test/lint posture

The review does **not** attempt to redesign the underlying audio/ML algorithm from scratch. It focuses on product architecture, runtime flows, contracts, code organization, and likely cleanup work.

## 3. System Orientation for a New Intern

### 3.1 What the product does

The product takes a music track, separates stems, transcribes vocals, analyzes rhythm/energy, mines candidate clip windows, and lets the user inspect/export likely jingle-worthy segments.

The user-facing workflow is:

1. pick or identify a track
2. run analysis with a preset or JSON config
3. inspect timeline, vocal regions, and candidate clips
4. preview/export the best clips
5. optionally re-mine with changed scoring weights or duration constraints

### 3.2 The main runtime layers

```text
┌────────────────────────────────────────────────────────────┐
│ React UI (Vite app / Storybook stories)                   │
│  - JingleExtractor root widget                            │
│  - modular visual components                              │
│  - RTK Query for API calls                                │
│  - Redux slices for local UI state                        │
└───────────────────────┬────────────────────────────────────┘
                        │ HTTP / JSON / Blob
                        ▼
┌────────────────────────────────────────────────────────────┐
│ FastAPI backend                                            │
│  - /api/analyze                                            │
│  - /api/analysis/{track_id}                                │
│  - /api/mine                                               │
│  - /api/export + /api/export/batch                         │
│  - /api/tracks + /api/presets + /api/health                │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│ Persistence + files                                        │
│  - SQLite (tracks, timelines, vocal_segments, candidates)  │
│  - per-track filesystem directories                        │
│  - exported stems / aligned lyric JSON / rendered clips    │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│ ML / audio pipeline                                         │
│  - MiniMax generation (outside backend runtime path here)   │
│  - Demucs stem separation                                   │
│  - WhisperX transcription                                   │
│  - librosa/pydub/ranking logic                              │
└────────────────────────────────────────────────────────────┘
```

### 3.3 The most important files to learn first

If I were onboarding an intern, I would ask them to read these first, in this order:

1. `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
2. `jingle-extractor-ui/src/api/jingleApi.ts`
3. `jingle-extractor-ui/src/api/types.ts`
4. `jingle-extractor-ui/src/components/Timeline/Timeline.tsx`
5. `jingle-extractor-backend/app/main.py`
6. `jingle-extractor-backend/app/models.py`
7. `jingle-extractor-backend/app/pipeline.py`
8. `jingle-extractor-backend/app/routes/analysis.py`
9. `jingle-extractor-backend/app/routes/mine.py`
10. `jingle-extractor-backend/app/routes/export.py`

Those files tell the story of the system better than any secondary document.

## 4. Current-State Architecture

## 4.1 Frontend architecture

The frontend is a Vite React app with Redux Toolkit and RTK Query. `main.tsx` mounts a Redux provider, conditionally enables MSW in development when `VITE_API_MOCKING=true`, and loads the three theme CSS files plus the token file (`jingle-extractor-ui/src/main.tsx`). This is a good production-minded default because the real backend is the default execution path, while mocked behavior is explicit and opt-in.

The root app component is intentionally thin. `App.tsx` reads the selected theme from Redux and applies it via `data-widget="jingle-extractor"` and `data-je-theme={theme}`. This is exactly the right outer-shell responsibility: theme and root layout only. The actual product widget is delegated into `JingleExtractor` (`jingle-extractor-ui/src/App.tsx`).

The store configuration is also straightforward: the app has one API slice (`jingleApi`) and two local slices (`analysis`, `audio`) in `jingle-extractor-ui/src/app/store.ts`. This is a reasonable split, but the `audio` slice is currently more aspirational than operational; the runtime playback work is happening in `useAudioPlayer`, not in Redux.

### 4.1.1 Frontend data flow

```text
JingleExtractor
  ├─ reads RTK Query: useGetAnalysisQuery(trackId)
  ├─ reads local UI state: selectedCandidate, playhead, stem, config, theme
  ├─ dispatches local UI actions
  ├─ triggers mutations: analyze / mine / export
  └─ passes props to leaf components

Leaf components
  ├─ are mostly presentation-focused
  ├─ render from typed props
  └─ raise callbacks upward
```

This is conceptually clean. The main issue is not the structure itself. The issue is that some callbacks currently do not correspond to a stable runtime model, especially playback and candidate editing.

### 4.1.2 Component structure

The component inventory under `jingle-extractor-ui/src/components/` contains ten focused component groups and ten story files. A quick story count shows **35 exported stories across 10 story files**. That is a strong sign that the leaf extraction work was real, not cosmetic.

The component set is:

- `MacWindow`
- `MenuBar`
- `PresetPanel`
- `ConfigEditor`
- `TransportBar`
- `Timeline`
- `CandidateList`
- `CandidateDetail`
- `ScoreBar`
- `JingleExtractor`

The theming boundary is further formalized in `parts.ts`, which defines stable `data-part` names rather than coupling theme consumers to class names.

### 4.1.3 Theming approach

The token strategy is strong. `tokens.css` defines a broad `--je-*` namespace for colors, typography, spacing, layout, and dither textures. This is a much better public contract than leaving values inline in JSX. The theme wrapper approach (`data-je-theme`) is also the correct choice for Storybook and embedding scenarios.

From a design-system perspective, the project is already using the right primitives:

- stable part names in `parts.ts`
- CSS custom properties in `tokens.css`
- per-theme overrides in separate CSS files
- a root widget marker (`data-widget="jingle-extractor"`)

This is one of the strongest parts of the frontend implementation.

## 4.2 Backend architecture

The backend is a FastAPI application that exposes a small REST surface and persists derived analysis data in SQLite.

The app startup path is easy to follow:

- `app.main` creates the FastAPI app
- the lifespan hook ensures `DATA_DIR`, `tracks/`, `exports/`, and DB tables exist
- routers are included for analyze, analysis, mine, export, tracks, and presets
- `/api/health` returns a small versioned payload

This is a pragmatic and appropriate design for a single-user or single-node v1.

### 4.2.1 Persistence model

`app.database` creates four tables:

- `tracks`
- `timelines`
- `vocal_segments`
- `candidates`

This table split maps cleanly to the UI. It is not over-normalized, and it is easy for a new engineer to understand. The use of WAL mode and row factories is sensible for small-scale concurrent read access.

The important design idea is that the backend stores *derived state* after each expensive phase so the frontend can cheaply fetch it later. That is exactly what we want in a system where Demucs and WhisperX are slow.

### 4.2.2 Pipeline orchestration

The pipeline wrapper in `app.pipeline` is the center of gravity of the backend. It serializes runs via a module-level `asyncio.Lock`, then runs the expensive sync functions in worker threads via `asyncio.to_thread`. This is the correct general shape for CPU-heavy or GPU-heavy Python code that should not block the event loop.

The pipeline does the following, in order:

1. stem separation
2. transcription
3. rhythm analysis
4. track metadata storage
5. timeline storage
6. vocal segment storage
7. candidate mining
8. score computation + ranking
9. candidate persistence

For a first productionization pass over an existing script, this is strong work. The main gaps are not in the broad orchestration model; they are in detail-level consistency and contract follow-through.

## 4.3 End-to-end data model alignment

The backend explicitly states that its Pydantic models map exactly to the TypeScript interfaces (`jingle-extractor-backend/app/models.py:1-4`). The TypeScript side defines matching structures in `jingle-extractor-ui/src/api/types.ts:3-115`. For the core successful analysis payload (`track`, `timeline`, `vocals`, `candidates`), this alignment is largely true.

That matters because the system uses the same conceptual payload end to end:

```text
Backend DB rows
  → Pydantic models
  → JSON responses
  → RTK Query typed responses
  → React props
```

This is another strong aspect of the project. However, there are still some response-contract mismatches at the route level, which I call out later in the review.

## 5. Prototype Extraction Assessment

## 5.1 Was the original import decomposed into the right components?

**Short answer: yes, structurally.**

The original prototype file at `ttmp/.../jingle-extractor-mac.jsx` contains the following logical pieces:

- Mac window chrome
- menu bar
- preset list
- JSON config editor
- transport bar
- timeline with waveform and drag handles
- candidate list
- detail pane
- score bars
- root application shell

Those pieces were decomposed into the production component set almost one-for-one.

## 5.2 Extraction matrix

| Prototype concern | Prototype evidence | Current extracted component | Assessment |
|---|---|---|---|
| window chrome | `const MacWindow` in prototype | `MacWindow` | Good extraction |
| timeline | `const Timeline` in prototype | `Timeline` + `useTimelineDrag` | Good extraction, still behavior-heavy |
| JSON config editor | `const JsonEditor` in prototype | `ConfigEditor` | Good semantic rename |
| score bar | `const Bar1Bit` in prototype | `ScoreBar` | Good extraction |
| menu bar | inline menu JSX in root | `MenuBar` | Good extraction |
| transport row | inline transport JSX in root | `TransportBar` | Good extraction, runtime incomplete |
| preset buttons | inline preset block | `PresetPanel` | Good extraction |
| candidate list | inline candidate rows | `CandidateList` | Good extraction |
| detail panel | inline detail block | `CandidateDetail` | Good extraction |
| app shell/orchestration | root function component | `JingleExtractor` | Correct orchestration component |

## 5.3 What was preserved well

The extraction preserved the original UI anatomy very faithfully:

- the Mac-style chrome and visual identity survived the move to CSS-based theming
- the timeline was decomposed into internal render layers instead of remaining a single unreadable JSX mass
- candidate detail and candidate list responsibilities are clearly separate
- the JSON config editor is now a reusable component rather than an inline helper
- the score bar is reusable and independently storybooked

This is the correct kind of decomposition. The extraction was not random slicing; it followed the major visual/behavioral seams in the prototype.

## 5.4 Where the extraction is still incomplete

The extraction is not fully complete in a behavioral sense.

The best way to say this is:

- **The UI pieces were extracted.**
- **The interaction model was not fully normalized after extraction.**

Examples:

1. The transport controls are a component, but the root widget still passes no-op handlers for play/pause in the current code (`JingleExtractor.tsx:194-205`).
2. Candidate drag editing has local-state affordances defined in Redux (`analysisSlice.ts:16-18`, `58-80`) but the root widget still re-mines server-side on update instead of using those local edit overrides (`JingleExtractor.tsx:98-107`).
3. Playback has been pushed into a hook (`useAudioPlayer.ts`), but that hook is not yet integrated into a coherent app-level playback model.

So the extraction was good, but there is still follow-up work to reconcile the “component API surface” with the “actual runtime behavior.”

## 6. Frontend Deep Dive

## 6.1 What is good

### 6.1.1 Root composition is understandable

`JingleExtractor.tsx` is still somewhat large, but it is not unreasonably large for a root composition component. It gathers query data, reads local UI state, creates handlers, and wires the panels together. That is the right job for this file.

### 6.1.2 The timeline decomposition is conceptually strong

The current `Timeline.tsx` is significantly better than the prototype version. Instead of keeping all rendering logic in one block, it introduces:

- `BeatGridLayer`
- `CandidateLayer`
- `VocalLayer`
- `WaveformLayer`
- `PlayheadLayer`
- `useTimelineDrag`

This is an improvement in readability and testability.

### 6.1.3 Stable theming/public selectors are in place

`parts.ts` is the right kind of design-system boundary. It means theme consumers can target parts as a public API rather than reverse-engineering implementation classes.

### 6.1.4 Storybook coverage is meaningful

The project has ten story files and 35 stories, which is real component review surface, not just a placeholder Storybook install.

## 6.2 Main frontend issues

### 6.2.1 Root interaction model is still inconsistent

**Problem**

The root widget currently mixes three different concepts of state without fully reconciling them:

- server data from RTK Query
- local UI state in Redux
- playback state in `useAudioPlayer`

This creates gaps where a UI affordance exists visually but does not correspond to a stable state transition.

**Where to look**

- `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx:49-155`
- `jingle-extractor-ui/src/features/analysis/analysisSlice.ts:9-104`
- `jingle-extractor-ui/src/features/audio/audioSlice.ts:7-54`
- `jingle-extractor-ui/src/hooks/useAudioPlayer.ts`

**Why it matters**

This is the root cause of several UX bugs:

- transport button handlers are placeholders
- candidate dragging is not modeled as durable local edits
- playback state exists in two places conceptually, but only one is active

**Cleanup sketch**

```ts
// one source of truth for playback state
interface PlaybackState {
  mode: 'idle' | 'preview' | 'track'
  trackId: string | null
  stem: StemType
  currentTime: number
  isPlaying: boolean
  currentCandidateId: number | null
}

// root component responsibilities
// - fetch data
// - dispatch state changes
// - connect UI events to playback controller
// - do not implement playback behavior inline
```

### 6.2.2 Candidate edit state exists but is not used

**Problem**

`analysisSlice` defines `editedCandidates` and exposes `updateCandidateStart` / `updateCandidateEnd`, but these edits are not read anywhere else in the frontend. A repository-wide search shows `editedCandidates` only in `analysisSlice.ts` and `types.ts`.

**Evidence**

- `analysisSlice.ts:16-18`, `58-80`
- `types.ts:104-115`
- `rg -n "editedCandidates" jingle-extractor-ui/src -S`

**Why it matters**

This is dead state. It suggests the design intention was “timeline dragging creates local candidate overrides,” but the implementation never completed that loop.

**Cleanup sketch**

```ts
const serverCandidates = analysis?.candidates ?? []
const editedCandidates = useAppSelector(s => s.analysis.editedCandidates)

const visibleCandidates = serverCandidates.map((c) => ({
  ...c,
  start: editedCandidates[c.id]?.start ?? c.start,
  end: editedCandidates[c.id]?.end ?? c.end,
}))
```

Then decide one of two policies:

1. **Purely local drag edits** until user presses “re-score selected candidate”, or
2. **Patch + server recompute** with an explicit endpoint that accepts edited windows.

What should *not* happen is the current ambiguous middle state.

### 6.2.3 Timeline drag is still wired to re-mine, not to edit

**Problem**

The `Timeline` emits `onCandidateUpdate`, but the root handler currently calls `mineCandidates({ trackId, config })` and ignores the actual `id`, `edge`, and `time` parameters (`JingleExtractor.tsx:98-107`).

**Why it matters**

This means the conceptual user action “drag the edge of candidate #N” is being translated into “re-run the candidate mining algorithm with the current config,” which is a completely different operation.

That is both semantically wrong and operationally expensive.

**Cleanup sketch**

```ts
const handleCandidateUpdate = (id, edge, time) => {
  dispatch(updateCandidateBoundary({ id, edge, time }))
}

const handleCommitCandidateUpdate = async (id) => {
  await patchCandidateWindow({ trackId, candidateId: id, start, end })
  await refetchAnalysis()
}
```

If there is no patch endpoint yet, keep it local until the API exists.

### 6.2.4 Transport bar is extracted but runtime playback is incomplete

**Problem**

The `TransportBar` component is clean, but the root widget currently supplies:

- `isPlaying={false}`
- `onPlay={() => {}}`
- `onPause={() => {}}`

in `JingleExtractor.tsx:194-205`.

**Why it matters**

The component is visually complete, but functionally it is still a shell. A new engineer might incorrectly assume playback exists because the component API suggests it does.

**Cleanup sketch**

```ts
<TransportBar
  isPlaying={playback.isPlaying}
  onPlay={() => playbackController.playTrack(trackId, stem, playhead)}
  onPause={() => playbackController.pause()}
  onSeekBack={() => playbackController.seek(playhead - 5)}
  onSeekForward={() => playbackController.seek(playhead + 5)}
/>
```

### 6.2.5 `useAudioPlayer` is useful but not production-ready yet

**Problem**

The new playback hook is directionally correct, but it still has API and lifecycle rough edges:

- it calls `stop()` before the callback is declared, which passes build but fails lint (`useAudioPlayer.ts`, `npm run lint` output)
- `playFrom()` sets `audio.currentTime = startTime` immediately, before metadata/load synchronization
- there is no event bridge from the audio element back into Redux playhead updates
- there is no single controller choosing between full-track mode and clip-preview mode

**Why it matters**

Playback systems become fragile quickly if state transitions are implicit.

**Cleanup sketch**

```ts
function createPlaybackController() {
  let audio: HTMLAudioElement | null = null

  async function playTrack(url, startTime) {
    cleanup()
    audio = new Audio(url)
    await once(audio, 'loadedmetadata')
    audio.currentTime = startTime
    await audio.play()
  }

  async function playClip(blobUrl) { ... }
  function seek(t) { ... }
  function pause() { ... }
  function stop() { ... }
  function subscribe(listener) { ... }
}
```

### 6.2.6 Storybook setup is valuable but needs hygiene cleanup

**Observed issues**

1. Story files import `Meta`/`StoryObj` from `@storybook/react` instead of the framework package context expected by the current ESLint/Storybook setup.
2. `.storybook/preview.tsx` disables `react/display-name`, but that rule is not available in the current ESLint config, causing lint failure.
3. The repository includes generated `storybook-static/` output, and `eslint .` walks into it, producing many irrelevant lint failures.
4. `msw-storybook-addon` is still present in `package.json` despite the current setup having moved away from it.

**Evidence**

- Story files import from `@storybook/react` (e.g. `ScoreBar.stories.tsx:5`, `TransportBar.stories.tsx:5`, `ConfigEditor.stories.tsx:5`)
- `.storybook/preview.tsx:26` disables `react/display-name`
- `package.json:16-17` still includes `msw-storybook-addon`
- `npm run lint` fails on both source issues and generated `storybook-static/` files

**Why it matters**

This does not make the UI unusable, but it makes the repo feel unfinished. It also raises the cost of future cleanup because lint output contains both real and generated noise.

**Cleanup sketch**

- add `storybook-static/` to `.gitignore`
- narrow ESLint scope or ignore generated folders explicitly
- standardize story imports on the current Storybook framework expectations
- remove unused `msw-storybook-addon` if no longer needed

## 7. Backend Deep Dive

## 7.1 What is good

### 7.1.1 The app factory is clean and minimal

`app.main` is easy to understand and does not hide initialization magic. This is exactly what we want for a small backend.

### 7.1.2 The DB model is pragmatic

The four-table schema is about the right size. It separates concerns without introducing needless joins or abstractions.

### 7.1.3 The pipeline wrapper makes the old script usable in a service context

The decision to call sync ML functions via `asyncio.to_thread` and serialize runs with `asyncio.Lock` is appropriate for a first backend version.

### 7.1.4 The scoring utilities are isolated and testable

`app.scoring` contains pure scoring helpers with unit tests. That is a strong seam in the backend design.

## 7.2 Main backend issues

### 7.2.1 The backend and frontend are mostly aligned, but not perfectly

This deserves its own section because it affects onboarding confidence.

The good news:

- the core success payload shape is aligned
- route coverage matches the app’s visible features
- preset values are consistent at a business-meaning level

The bad news:

- route response contracts are not always represented accurately on the frontend
- some accepted config values are currently ignored at runtime
- some UI-visible stem options are not fully backed by backend file handling

These are solvable problems, but they matter because they undermine the claim that the system is already “productionized.”

### 7.2.2 `/api/analyze` response type is mismatched on the frontend

**Problem**

The frontend declares `analyze` as `builder.mutation<AnalysisResponse, AnalyzeRequest>` and documents it as returning track/timeline/vocals/candidates (`jingleApi.ts:51-63`).

The backend route actually returns `AnalyzeAcceptedResponse` with status 202 (`routes/analyze.py:19-45`).

**Why it matters**

This is a contract mismatch. TypeScript is promising something the backend does not return.

**Cleanup sketch**

```ts
type AnalyzeAcceptedResponse = {
  track_id: string
  status: AnalysisStatus
}

analyze: builder.mutation<AnalyzeAcceptedResponse, AnalyzeRequest>({ ... })
```

### 7.2.3 `/api/analysis/{track_id}` also has a typed mismatch in the in-progress case

**Problem**

The frontend query type is `AnalysisResponse` only (`jingleApi.ts:69-72`), but the backend may return a 202 JSON payload with `{ track_id, status, error_message }` when analysis is not complete (`routes/analysis.py:30-39`).

**Why it matters**

The happy path is typed, but the polling/in-progress path is not. This makes the UI harder to write correctly because intermediate states are outside the declared TS contract.

**Cleanup sketch**

```ts
type GetAnalysisResponse =
  | AnalysisResponse
  | { track_id: string; status: AnalysisStatus; error_message?: string | null }
```

Or normalize server responses so the route always returns a discriminated union.

### 7.2.4 `min_score` is accepted but ignored

**Problem**

`min_score` exists in the TypeScript config (`types.ts:68-82`), in Pydantic (`models.py:109-142`), in presets (`presets.py`), and in MSW handlers (`handlers.ts`). But a repository search shows no actual backend use of `config.min_score` in scoring/mining logic.

**Evidence**

`rg -n "min_score" jingle-extractor-backend/app -S` only hits models and presets, not route logic.

**Why it matters**

This is exactly the kind of “looks implemented but is not” configuration bug that causes user distrust.

**Cleanup sketch**

```py
if overall < config.min_score:
    continue
```

That filter should exist both in the pipeline candidate-ranking path and the `/api/mine` path.

### 7.2.5 `fade_in` and `fade_out` are accepted but export is hardcoded

**Problem**

The user-facing config contains `fade_in` and `fade_out`, but `_render_clip()` in `routes/export.py:16-30` hardcodes `fade_in(20).fade_out(50)`.

**Why it matters**

The current export behavior happens to match the desired defaults from the project context, but the UI and presets imply the user can choose fade settings. That is not true right now.

**Cleanup sketch**

Either:

1. pass fade values in export requests, or
2. persist the chosen config for each candidate set and read it during export.

If export is meant to be deterministic from current UI config, the request contract should include the fade values explicitly.

### 7.2.6 Original stem support is incomplete

**Problem**

The frontend exposes three stems: `orig`, `inst`, and `vox` (`TransportBar.tsx`). The backend path helper maps `orig` to `orig.mp3` (`config.py:19-23`), and export resolves stems through that helper (`routes/export.py:46-48`).

But the pipeline only creates canonical `inst.mp3` and `vox.mp3` (`pipeline.py:117-125`). It does not copy the original source into `orig.mp3` under the track directory.

**Why it matters**

This means “Original” is part of the visible product surface but is not fully provisioned as a backend-backed asset path.

**Cleanup sketch**

```py
orig_dest = tdir / 'orig.mp3'
if not orig_dest.exists():
    copy_or_transcode(audio_path, orig_dest)
```

Then document whether original export/playback should preserve the original codec or normalize to MP3.

### 7.2.7 `run.py` ignores config module settings

**Problem**

`app.config` defines `HOST`, `PORT`, and `LOG_LEVEL` (`config.py:49-59`), but `run.py` hardcodes `0.0.0.0`, `8000`, and `info` (`run.py:6-12`).

**Why it matters**

This is small, but it is exactly the kind of mismatch that confuses deploy-time behavior.

**Cleanup sketch**

Import host/port/log_level from config and pass them through.

### 7.2.8 Some schema fields suggest future features but are currently unused

Examples:

- `candidates.config_hash` exists in the DB schema but is never written or used (`database.py:55-76`)
- `clips_dir()` exists in config but is not used in export flow (`config.py:26-28`)
- `AnalysisConfig` is imported but unused in some route modules

These are not critical bugs, but they indicate an intermediate state between “prototype service” and “hardened service.”

## 8. Frontend/Backend Alignment Review

## 8.1 Where alignment is strong

### 8.1.1 Shared conceptual nouns are consistent

The system speaks consistently about:

- tracks
- timeline data
- vocal segments
- candidates
- presets
- stems

That is not trivial. It makes onboarding much easier.

### 8.1.2 The core success payload is coherent

The backend `AnalysisResponse` and the frontend `AnalysisResponse` describe the same successful payload shape. This is a major win.

### 8.1.3 API surface is appropriately small

The current surface area is:

- `POST /api/analyze`
- `GET /api/analysis/{track_id}`
- `POST /api/mine`
- `POST /api/export`
- `POST /api/export/batch`
- `GET /api/tracks`
- `GET /api/presets`
- `GET /api/health`

That is a compact and understandable API.

## 8.2 Where alignment is weak

### 8.2.1 Status-bearing routes need explicit union contracts

Any route that can return “accepted / processing / complete / failed” should have a typed union on the frontend, not just a happy-path type.

### 8.2.2 Preview/playback model is not end-to-end yet

The system has backend export of candidate clips, but it does not yet have a clean full-track streaming/seek API. The current UI transport bar therefore has no fully backed runtime path.

### 8.2.3 Candidate editing lacks a coherent backend contract

The system supports re-mining globally, but not “edit a specific candidate window and preserve that edited candidate as a first-class object.” That distinction matters for the timeline interaction model.

## 8.3 API reference snapshot

| Endpoint | Purpose | Current shape | Notes |
|---|---|---|---|
| `POST /api/analyze` | start async analysis | returns accepted response | frontend typing currently wrong |
| `GET /api/analysis/{track_id}` | fetch analysis or status | returns analysis or 202 status payload | frontend typing currently incomplete |
| `POST /api/mine` | recompute candidates from stored data | returns candidate list | does not use `min_score` |
| `POST /api/export` | render one clip | returns audio blob | hardcoded fades |
| `POST /api/export/batch` | render multiple clips | returns ZIP blob | good v1 affordance |
| `GET /api/tracks` | list completed tracks | returns `Track[]` | fine |
| `GET /api/presets` | list presets | returns preset dictionary | preset values duplicated in multiple places |
| `GET /api/health` | service health | returns status/version | fine |

## 9. Code Quality Findings

This section is deliberately blunt and practical.

## 9.1 High-priority issues

### 9.1.1 Contract mismatch: analyze mutation type

- **Problem:** frontend expects `AnalysisResponse`, backend returns `AnalyzeAcceptedResponse`
- **Where:** `jingleApi.ts:56-63`, `routes/analyze.py:19-45`
- **Impact:** type unsafety, confusing integration logic
- **Action:** change TS types and UI flow to explicit accepted/polling model

### 9.1.2 Contract mismatch: analysis query type in processing state

- **Problem:** frontend query assumes analysis payload only, backend may return status payload
- **Where:** `jingleApi.ts:69-72`, `routes/analysis.py:30-39`
- **Impact:** incomplete typing of real server behavior
- **Action:** introduce discriminated union response type

### 9.1.3 Candidate drag semantics are wrong

- **Problem:** drag action triggers full re-mine rather than candidate boundary edit
- **Where:** `JingleExtractor.tsx:98-107`
- **Impact:** incorrect UX semantics, expensive runtime behavior, dead local edit state
- **Action:** wire drag to `editedCandidates` or add explicit candidate-edit API

### 9.1.4 Config lies: `min_score`, `fade_in`, `fade_out`

- **Problem:** these fields are visible/typed/preset-backed but not applied coherently
- **Where:** `types.ts`, `models.py`, `presets.py`, `handlers.ts`, `routes/export.py`, `routes/mine.py`
- **Impact:** user distrust; settings appear functional but are not
- **Action:** either implement them fully or remove/hide until supported

## 9.2 Medium-priority issues

### 9.2.1 Dead/partial state: `audioSlice`

A repo search shows `audioSlice` is installed in the store and Storybook setup, but most runtime playback logic bypasses it in favor of `useAudioPlayer`. The slice is not yet the actual playback state model.

This is not necessarily wrong, but the project should choose one approach:

- Redux-backed playback state, or
- hook/controller-backed playback state with a thin Redux projection

Right now it is halfway between the two.

### 9.2.2 Dead/partial state: `editedCandidates`

Already covered above. It is defined but not consumed.

### 9.2.3 Storybook drift

The Storybook setup is useful, but lint failures show it has drifted from the project’s current ESLint/framework conventions.

### 9.2.4 Repo hygiene gaps

`.gitignore` currently ignores `dist/` and build outputs at a high level, but not `storybook-static/` or backend runtime `data/`. Both appear as untracked paths in the current repository status. That will create avoidable noise.

## 9.3 Low-priority issues

### 9.3.1 Minor import/unused field cleanup

Some route modules and helper files still contain unused imports or unused schema fields. These are normal intermediate-state issues, but worth cleaning during the next refactor pass.

### 9.3.2 Timeline still has some orchestration heaviness

The render-layer split is good, but `Timeline.tsx` still owns a lot of geometry and interaction wiring. This is acceptable for now, but if behavior grows further it may deserve a smaller internal controller hook plus a geometry helper module.

## 10. Validation Status

I ran three useful validation commands during this review.

### 10.1 Frontend build

Command:

```bash
cd jingle-extractor-ui && npm run build
```

Result:

- **Pass**
- production build succeeded after a small callback-name fix in the preview hook integration

### 10.2 Backend tests

Command:

```bash
python3 -m pytest -q jingle-extractor-backend/tests
```

Result:

- **Pass**
- `20 passed`

Interpretation:

- scoring helpers are covered reasonably well
- endpoint coverage is still shallow for the core workflow paths

### 10.3 Frontend lint

Command:

```bash
cd jingle-extractor-ui && npm run lint
```

Result:

- **Fail**

Main causes:

- Storybook story import conventions
- invalid ESLint disable comments for unavailable rules
- generated `storybook-static/` content being linted
- real hook hygiene warning in `useAudioPlayer.ts`
- unused callback args / hook dependency warnings in `JingleExtractor.tsx`

Interpretation:

The codebase is buildable and testable, but not yet lint-clean.

## 11. Recommended Near-Term Cleanup Plan

## Phase 1 — Contract honesty and repo hygiene

Goal: make the repo tell the truth.

Tasks:

1. fix RTK Query types for analyze and in-progress analysis responses
2. add `storybook-static/` and backend `data/` to `.gitignore`
3. remove or finish unused Storybook/MSW dependencies and conventions
4. make `run.py` consume config module values
5. decide whether `min_score`, `fade_in`, and `fade_out` are real features now or postponed

Why first:

These changes reduce confusion immediately without requiring product redesign.

## Phase 2 — Playback model cleanup

Goal: make transport and preview behave as one coherent audio subsystem.

Tasks:

1. define a real playback controller abstraction
2. decide whether playback state lives in Redux, a controller hook, or both
3. add backend support for original stem serving if `orig` remains a visible option
4. bridge audio currentTime back to playhead updates
5. distinguish clip preview mode from full-track playback mode

## Phase 3 — Candidate editing semantics

Goal: make timeline drag do what it visually implies.

Tasks:

1. either keep candidate edits local or add an explicit candidate-patch endpoint
2. stop treating drag as “global re-mine”
3. display edited candidate boundaries in the visible candidate set
4. define when edits become persistent

## Phase 4 — Coverage and hardening

Goal: increase confidence in the real product paths.

Tasks:

1. add backend tests for `mine`, `export`, and batch export
2. add frontend interaction tests for transport and timeline drag
3. add one or two integration tests that exercise real route contracts
4. add explicit failed-analysis UI behavior if `GET /api/analysis/{track_id}` returns status `failed`

## 12. Recommended Longer-Term Architectural Shape

If the project continues beyond a single-user local workflow, I would evolve it toward this shape:

```text
Frontend
  ├─ Presentation components
  ├─ Screen/root orchestrators
  ├─ RTK Query API layer
  ├─ Playback controller
  └─ Minimal Redux UI state

Backend
  ├─ API routes
  ├─ service layer (analysis service / export service / mining service)
  ├─ repository layer (DB access)
  ├─ pipeline adapters
  └─ scoring utilities
```

Right now, the backend is still thin enough that a dedicated service layer is optional. I would not introduce heavy abstractions prematurely. But I *would* consider extracting:

- candidate mining service logic from `routes/mine.py`
- export rendering logic from `routes/export.py`
- pipeline result normalization from `pipeline.py`

That would keep routes short and make unit testing easier.

## 13. Bottom-Line Assessment

### 13.1 What is already good enough

- the overall product architecture
- the component decomposition from the prototype
- the design-token/theming model
- the backend persistence model
- the background-task pipeline model
- the scoring utility isolation

### 13.2 What is not yet production-ready

- playback and transport behavior
- candidate drag semantics
- exact route typing / API contract honesty
- full support for all exposed config knobs
- lint cleanliness and repo hygiene
- test coverage of the main happy-path export/remine flows

### 13.3 If I were mentoring the next intern

I would tell them:

> Do not start by extracting more UI pieces. The extraction phase mostly succeeded. Start by making the current system internally consistent: contracts, playback, drag semantics, and ignored config fields. That is the highest-leverage work now.

## 14. Appendix A — Onboarding Pseudocode

### 14.1 Analyze flow

```ts
async function runAnalysis(audioFilePath: string, config: AnalysisConfig) {
  const accepted = await api.analyze({ audio_file: audioFilePath, config })

  while (true) {
    const result = await api.getAnalysis(accepted.track_id)

    if (result.kind === 'complete') {
      return result.analysis
    }

    if (result.kind === 'failed') {
      throw new Error(result.error_message ?? 'Analysis failed')
    }

    await sleep(1000)
  }
}
```

### 14.2 Candidate edit flow

```ts
function onTimelineDrag(id, edge, time) {
  dispatch(updateCandidateBoundary({ id, edge, time }))
}

async function onCommitEditedCandidate(id) {
  const edited = selectEditedCandidate(state, id)
  await api.patchCandidateWindow({ trackId, candidateId: id, ...edited })
  await api.refetchAnalysis(trackId)
}
```

### 14.3 Export flow

```py
@router.post('/api/export')
async def export_clip(request: ExportRequest):
    candidate = repository.get_candidate(request.trackId, request.candidateId)
    source = stem_resolver.resolve(track_id=request.trackId, stem=request.stem)
    clip = clip_renderer.render(
        source=source,
        start=candidate.start_time,
        end=candidate.end_time,
        fade_in=request.fade_in,
        fade_out=request.fade_out,
        fmt=request.fmt,
    )
    return stream_clip(clip)
```

## 15. Appendix B — Key File References

Frontend:

- `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
- `jingle-extractor-ui/src/components/Timeline/Timeline.tsx`
- `jingle-extractor-ui/src/components/TransportBar/TransportBar.tsx`
- `jingle-extractor-ui/src/components/ConfigEditor/ConfigEditor.tsx`
- `jingle-extractor-ui/src/api/jingleApi.ts`
- `jingle-extractor-ui/src/api/types.ts`
- `jingle-extractor-ui/src/features/analysis/analysisSlice.ts`
- `jingle-extractor-ui/src/features/audio/audioSlice.ts`
- `jingle-extractor-ui/src/hooks/useAudioPlayer.ts`
- `jingle-extractor-ui/src/app/theme/tokens.css`
- `jingle-extractor-ui/.storybook/preview.tsx`
- `jingle-extractor-ui/src/mocks/handlers.ts`

Backend:

- `jingle-extractor-backend/app/main.py`
- `jingle-extractor-backend/app/models.py`
- `jingle-extractor-backend/app/config.py`
- `jingle-extractor-backend/app/database.py`
- `jingle-extractor-backend/app/pipeline.py`
- `jingle-extractor-backend/app/routes/analyze.py`
- `jingle-extractor-backend/app/routes/analysis.py`
- `jingle-extractor-backend/app/routes/mine.py`
- `jingle-extractor-backend/app/routes/export.py`
- `jingle-extractor-backend/app/scoring.py`
- `jingle-extractor-backend/tests/test_endpoints.py`
- `jingle-extractor-backend/tests/test_scoring.py`

Prototype source:

- `ttmp/2026/04/13/JINGLE-002--jingle-extractor-react-application-storybook-vite-rtk-query-msw-css-themable/sources/local/jingle-extractor-mac.jsx`
