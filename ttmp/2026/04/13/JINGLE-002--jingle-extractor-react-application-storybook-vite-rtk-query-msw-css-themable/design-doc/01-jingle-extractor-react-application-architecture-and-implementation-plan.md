---
Title: ""
Ticket: ""
Status: ""
Topics: []
DocType: ""
Intent: ""
Owners: []
RelatedFiles:
    - Path: ../../../../../../../../../Downloads/jingle-extractor-mac.jsx
      Note: Source prototype JSX being converted to React application
    - Path: jingle_extractor.py
      Note: Python backend pipeline that will serve the REST API
    - Path: out/thrash_analysis/lyrics_aligned.json
      Note: WhisperX transcription output used as MSW fixture reference
    - Path: out/thrash_analysis/manifest.json
      Note: Real analysis output used as MSW fixture reference
ExternalSources: []
Summary: ""
LastUpdated: 0001-01-01T00:00:00Z
WhatFor: ""
WhenToUse: ""
---





# Jingle Extractor React Application — Architecture and Implementation Plan

## Executive Summary

We are converting a 420-line single-file JSX prototype (`jingle-extractor-mac.jsx`) into a production-grade React application built on **Vite + TypeScript + RTK Query + MSW + Storybook** with a **CSS custom property theming system** using `data-part` selectors. The prototype implements a 1-bit Mac aesthetic with an SVG waveform timeline, draggable candidate handles, a JSON configuration editor, and a candidate detail panel.

The conversion preserves all existing visual behavior and interaction patterns while adding: modular component architecture, API integration via RTK Query, mock API layer via MSW, theme token system, Storybook coverage, accessibility, and keyboard navigation.

**Source prototype**: `sources/local/jingle-extractor-mac.jsx` (imported into this ticket)
**Parent pipeline**: JINGLE-001 (Python CLI: MiniMax → Demucs → WhisperX → librosa → pydub)
**Metadata contract**: See `UI-DESIGN - Jingle Extractor Interface - Metadata and Features Guide.md` in Obsidian vault.

---

## 1. Problem Statement

The existing `jingle-extractor-mac.jsx` is a single 420-line React component that works as a visual prototype but has fundamental architectural problems:

1. **Monolithic**: One file contains all state, all components, all mock data, all styling.
2. **No API layer**: Hard-coded mock data with no path to real backend integration.
3. **Inline styles only**: ~200 inline `style={}` objects make theming impossible.
4. **No theming**: Black/white colors are hard-coded everywhere; no CSS custom properties.
5. **No type safety**: No TypeScript, no interfaces for the data shapes.
6. **No testing surface**: No component boundaries means no isolated testing.
7. **No accessibility**: No ARIA attributes, no keyboard navigation, no focus management.
8. **Not installable**: No package.json, no build tooling, no Storybook.

The goal is to refactor this into a modular, reusable, themeable application that:
- Integrates with the JINGLE-001 Python backend via a REST API
- Provides mock API responses via MSW during development and Storybook
- Supports multiple visual themes through CSS custom properties
- Is fully covered by Storybook stories
- Is buildable as a standalone Vite app and embeddable as a component library

---

## 2. Current-State Analysis

### 2.1 Component Inventory

The prototype contains 5 logical components embedded in one file:

| # | Component | Lines | Responsibility | State? |
|---|-----------|-------|----------------|--------|
| 1 | `MacWindow` | ~10 | Window chrome wrapper (title bar + body) | None |
| 2 | `Timeline` | ~105 | SVG waveform, draggable candidate handles, beat grid, vocal regions, playhead | svgRef, dragRef |
| 3 | `JsonEditor` | ~28 | Editable JSON textarea with parse validation | raw, err |
| 4 | `Bar1Bit` | ~15 | Pixel-art score bar (20 filled/unfilled blocks) | None |
| 5 | `JingleExtractorRetro` | ~215 | Main layout, all app state, menu bar, presets, transport, candidate list, detail panel | 6 useState hooks |

### 2.2 State Management

All state lives in `JingleExtractorRetro` as 6 `useState` hooks:

```
activePreset: string | null       // Which preset is active ("Default", "Short Stings", etc.)
config: AnalysisConfig            // Current analysis parameters (weights, durations, etc.)
candidates: Candidate[]           // Array of scored clip suggestions
selectedId: number                // Which candidate is selected
playhead: number                  // Current playback position in seconds
stem: "orig" | "inst" | "vox"    // Which audio stem is active for playback
```

State flows down via props to `Timeline`, `JsonEditor`. No context, no reducer, no store.

### 2.3 Data Shapes (extracted from mock data)

```typescript
interface Track {
  id: string;
  duration: number;      // seconds
  bpm: number;
  language: string;      // "en"
  lang_conf: number;     // 0.0-1.0
  sr: number;            // sample rate
  dr_db: number;         // dynamic range in dB
}

interface TimelineData {
  duration: number;
  beats: number[];       // array of timestamps in seconds
  rms: number[];         // array of energy values (~480 samples)
}

interface VocalSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  conf: number;          // 0.0-1.0 confidence
}

interface Candidate {
  id: number;
  rank: number;
  start: number;
  end: number;
  score: number;         // 0-100
  attack: number;        // 0-100
  ending: number;        // 0-100
  energy: number;        // 0-100
  vocal_overlap: boolean;
  best: boolean;
}

interface AnalysisConfig {
  min_dur: number;
  max_dur: number;
  min_score: number;
  vocal_mode: "any" | "inst" | "vocal";
  atk_w: number;         // attack weight
  end_w: number;         // ending weight
  nrg_w: number;         // energy weight
  beat_w: number;        // beat alignment weight
  max_cand: number;      // max candidates
  fade_in: number;       // ms
  fade_out: number;      // ms
  fmt: "mp3" | "wav";
  br: number | null;     // bitrate (null for wav)
}
```

### 2.4 Interaction Patterns

| Pattern | Trigger | State Change | Visual Feedback |
|---------|---------|--------------|-----------------|
| Drag handle | Pointer down on candidate edge | Updates candidate start/end | Handle grip lines appear, region resizes |
| Select candidate | Click on candidate region or list row | Sets selectedId | Selected gets dithered fill, white text in list |
| Set playhead | Click timeline background | Sets playhead | Vertical line + triangle marker |
| Switch preset | Click preset button | Sets config + activePreset | Button goes black bg, config JSON updates |
| Edit JSON | Type in textarea | Validates + sets config | Error state: dithered bg, white text, error message |
| Toggle stem | Click stem button | Sets stem mode | Active button goes black bg |
| Transport buttons | Click ◁◁ ▮▮ ▷ ▷▷ | (not implemented) | Static buttons |

### 2.5 Styling Approach

- **All inline**: ~200 `style={{}}` objects, no CSS files
- **1-bit aesthetic**: Only `#000` (black) and `#fff` (white)
- **Dither patterns**: Two SVG data URIs (`CHECKER`, `LINES_H`) used as background-image
- **Fonts**: Chicago_mac, Geneva, Monaco, Courier New (monospace stack)
- **Fixed sizing**: Pixel-based, no responsive breakpoints
- **No CSS custom properties**: Colors and spacing are hard-coded integers

### 2.6 Gap Analysis

| Area | Current State | Target State |
|------|---------------|--------------|
| File structure | Single .jsx file | Modular package with 15+ files |
| Language | JavaScript | TypeScript |
| State management | useState in root | RTK Query + slice for local UI state |
| API calls | None (mock data) | RTK Query with REST endpoints |
| Mock API | Hard-coded constants | MSW handlers |
| Styling | Inline styles | CSS custom properties + `data-part` selectors |
| Theming | None (black/white only) | Token-based with multiple theme presets |
| Testing | None | Storybook stories + unit tests |
| Build tooling | None (raw JSX) | Vite + Storybook |
| Accessibility | None | ARIA, keyboard nav, focus management |
| Routing | None | React Router (future: track list → editor) |

---

## 3. Proposed Architecture

### 3.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Build | Vite 6 + TypeScript 5 | Fast dev server, HMR, production builds |
| UI Framework | React 19 | Component model |
| State | Redux Toolkit + RTK Query | Server state caching, local UI state |
| Mock API | MSW 2.x | Intercepts fetch during dev/Storybook |
| Component Dev | Storybook 8 | Isolated component development, visual testing |
| Styling | CSS custom properties + `data-part` | Theming via tokens, low-specificity selectors |
| Testing | Vitest + Testing Library | Unit + integration tests |
| Linting | ESLint + Prettier | Code quality |

### 3.2 Package Layout

```
jingle-extractor-ui/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── storybook/
│   ├── main.ts
│   ├── preview.ts
│   └── preview-head.html
├── public/
│   └── audio/                    # Sample audio for dev/Storybook
├── src/
│   ├── index.ts                  # Package entrypoint (exports widget)
│   ├── app/
│   │   ├── App.tsx               # Root layout + providers
│   │   ├── store.ts              # Redux store configuration
│   │   └── theme/
│   │       ├── tokens.css        # CSS custom property definitions
│   │       ├── theme-retro.css   # 1-bit Mac theme (matches prototype)
│   │       ├── theme-dark.css    # Dark mode theme
│   │       └── theme-light.css   # Light/clean theme
│   ├── api/
│   │   ├── jingleApi.ts          # RTK Query API definition
│   │   └── types.ts              # API request/response types
│   ├── mocks/
│   │   ├── handlers.ts           # MSW request handlers
│   │   ├── browser.ts            # MSW browser worker setup
│   │   ├── server.ts             # MSW Node worker (for tests)
│   │   └── fixtures/
│   │       ├── thrash-metal.json # Full analysis response fixture
│   │       ├── presets.json      # Preset configurations
│   │       └── candidates.json   # Candidate list fixture
│   ├── features/
│   │   ├── analysis/
│   │   │   ├── analysisSlice.ts  # Local UI state (selectedId, playhead, stem)
│   │   │   └── analysisHooks.ts  # Typed hooks
│   │   └── audio/
│   │       └── audioSlice.ts     # Audio playback state
│   ├── components/
│   │   ├── JingleExtractor/
│   │   │   ├── index.ts
│   │   │   ├── JingleExtractor.tsx    # Root widget (public entrypoint)
│   │   │   ├── JingleExtractor.css    # Base layout styles
│   │   │   ├── parts.ts              # data-part name constants
│   │   │   └── types.ts              # Widget props (theme, unstyled, slots)
│   │   ├── MacWindow/
│   │   │   ├── MacWindow.tsx
│   │   │   ├── MacWindow.css
│   │   │   ├── MacWindow.stories.tsx
│   │   │   └── index.ts
│   │   ├── Timeline/
│   │   │   ├── Timeline.tsx
│   │   │   ├── Timeline.css
│   │   │   ├── Timeline.stories.tsx
│   │   │   ├── useTimelineDrag.ts    # Drag handle hook
│   │   │   ├── WaveformLayer.tsx      # SVG waveform rendering
│   │   │   ├── CandidateLayer.tsx     # Candidate region + handles
│   │   │   ├── VocalLayer.tsx         # Vocal segment rendering
│   │   │   ├── BeatGrid.tsx           # Beat grid lines
│   │   │   ├── Playhead.tsx           # Playhead marker
│   │   │   └── index.ts
│   │   ├── CandidateList/
│   │   │   ├── CandidateList.tsx
│   │   │   ├── CandidateList.css
│   │   │   ├── CandidateRow.tsx
│   │   │   ├── CandidateList.stories.tsx
│   │   │   └── index.ts
│   │   ├── CandidateDetail/
│   │   │   ├── CandidateDetail.tsx
│   │   │   ├── CandidateDetail.css
│   │   │   ├── ScoreBar.tsx           # Replaces Bar1Bit
│   │   │   ├── QualityPanel.tsx       # Attack/ending/energy breakdown
│   │   │   ├── ContextPanel.tsx       # Vocal overlap, onset proximity
│   │   │   ├── CandidateDetail.stories.tsx
│   │   │   └── index.ts
│   │   ├── PresetPanel/
│   │   │   ├── PresetPanel.tsx
│   │   │   ├── PresetPanel.css
│   │   │   ├── PresetPanel.stories.tsx
│   │   │   └── index.ts
│   │   ├── ConfigEditor/
│   │   │   ├── ConfigEditor.tsx
│   │   │   ├── ConfigEditor.css
│   │   │   ├── JsonEditor.tsx         # JSON textarea with validation
│   │   │   ├── ConfigForm.tsx         # Form-based editor (alternative to JSON)
│   │   │   ├── ConfigEditor.stories.tsx
│   │   │   └── index.ts
│   │   ├── TransportBar/
│   │   │   ├── TransportBar.tsx
│   │   │   ├── TransportBar.css
│   │   │   ├── StemToggle.tsx
│   │   │   ├── TimeDisplay.tsx
│   │   │   ├── TransportControls.tsx
│   │   │   ├── TransportBar.stories.tsx
│   │   │   └── index.ts
│   │   ├── MenuBar/
│   │   │   ├── MenuBar.tsx
│   │   │   ├── MenuBar.css
│   │   │   ├── MenuBar.stories.tsx
│   │   │   └── index.ts
│   │   └── ScoreBar/
│   │       ├── ScoreBar.tsx
│   │       ├── ScoreBar.css
│   │       ├── ScoreBar.stories.tsx
│   │       └── index.ts
│   └── utils/
│       ├── format.ts              # fmt() time formatter
│       ├── dither.ts              # CHECKER/LINES_H SVG data URIs
│       └── constants.ts           # Default presets
└── stories/
    └── JingleExtractor.stories.tsx  # Integration story (full widget)
```

### 3.3 RTK Query API Design

```typescript
// src/api/jingleApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Track, TimelineData, VocalSegment, Candidate, AnalysisConfig } from './types';

export interface AnalysisResponse {
  track: Track;
  timeline: TimelineData;
  vocals: {
    segments: VocalSegment[];
  };
  candidates: Candidate[];
}

export interface AnalysisRequest {
  audio_file: string;
  config: AnalysisConfig;
}

export const jingleApi = createApi({
  reducerPath: 'jingleApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  tagTypes: ['Analysis', 'Candidates'],
  endpoints: (builder) => ({
    // Analyze an uploaded audio file
    analyze: builder.mutation<AnalysisResponse, AnalysisRequest>({
      query: (body) => ({
        url: 'analyze',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Analysis', 'Candidates'],
    }),

    // Get existing analysis results
    getAnalysis: builder.query<AnalysisResponse, string>({
      query: (trackId) => `analysis/${trackId}`,
      providesTags: ['Analysis'],
    }),

    // Re-mine candidates with new config
    mineCandidates: builder.mutation<Candidate[], { trackId: string; config: AnalysisConfig }>({
      query: (body) => ({
        url: 'mine',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Candidates'],
    }),

    // Export a single candidate as MP3/WAV
    exportClip: builder.mutation<Blob, { trackId: string; candidateId: number; stem: string; fmt: string }>({
      query: (body) => ({
        url: 'export',
        method: 'POST',
        body,
        responseHandler: (response) => response.blob(),
      }),
    }),

    // Batch export multiple clips
    exportBatch: builder.mutation<Blob, { trackId: string; candidates: number[]; stem: string; fmt: string }>({
      query: (body) => ({
        url: 'export/batch',
        method: 'POST',
        body,
        responseHandler: (response) => response.blob(),
      }),
    }),

    // List available tracks
    listTracks: builder.query<Track[], void>({
      query: () => 'tracks',
    }),

    // Get available presets
    getPresets: builder.query<Record<string, AnalysisConfig>, void>({
      query: () => 'presets',
    }),
  }),
});

export const {
  useAnalyzeMutation,
  useGetAnalysisQuery,
  useMineCandidatesMutation,
  useExportClipMutation,
  useExportBatchMutation,
  useListTracksQuery,
  useGetPresetsQuery,
} = jingleApi;
```

### 3.4 Redux State Shape

```typescript
// src/features/analysis/analysisSlice.ts
interface AnalysisState {
  selectedCandidateId: number | null;
  playhead: number;             // seconds
  stem: 'orig' | 'inst' | 'vox';
  activePreset: string | null;
  config: AnalysisConfig;
  editedCandidates: Record<number, { start?: number; end?: number }>;  // user drag adjustments
}

// src/features/audio/audioSlice.ts
interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}
```

### 3.5 MSW Mock API

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import thrashMetalFixture from './fixtures/thrash-metal.json';

export const handlers = [
  // GET /api/analysis/:trackId
  http.get('/api/analysis/:trackId', ({ params }) => {
    return HttpResponse.json(thrashMetalFixture);
  }),

  // POST /api/analyze
  http.post('/api/analyze', async ({ request }) => {
    const body = await request.json();
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return HttpResponse.json(thrashMetalFixture);
  }),

  // POST /api/mine
  http.post('/api/mine', async ({ request }) => {
    const body = await request.json() as { config: AnalysisConfig };
    // Simulate re-mining with different weights
    await new Promise((resolve) => setTimeout(resolve, 500));
    return HttpResponse.json(thrashMetalFixture.candidates);
  }),

  // POST /api/export
  http.post('/api/export', async ({ request }) => {
    // Return a small silent MP3 blob for dev
    const silentMp3 = new Blob([new ArrayBuffer(1024)], { type: 'audio/mpeg' });
    return HttpResponse.blob(silentMp3);
  }),

  // GET /api/presets
  http.get('/api/presets', () => {
    return HttpResponse.json({
      Default: { min_dur: 2.0, max_dur: 4.5, min_score: 75, ... },
      "Short Stings": { ... },
      "Long Beds": { ... },
      "Vocal Hooks": { ... },
    });
  }),

  // GET /api/tracks
  http.get('/api/tracks', () => {
    return HttpResponse.json([
      { id: 'thrash_metal_01', duration: 55.59, bpm: 166.7, language: 'en' },
    ]);
  }),
];
```

### 3.6 Theming System

#### Token Definitions

```css
/* src/app/theme/tokens.css */
:root {
  /* --- Color tokens --- */
  --je-color-bg:          #c0c0c0;
  --je-color-surface:     #ffffff;
  --je-color-text:        #000000;
  --je-color-text-muted:  rgba(0, 0, 0, 0.5);
  --je-color-text-inverse:#ffffff;
  --je-color-primary:     #000000;
  --je-color-accent:      #000000;
  --je-color-border:      #000000;
  --je-color-error:       #000000;
  --je-color-selected:    #000000;
  --je-color-selected-text:#ffffff;

  /* --- Typography tokens --- */
  --je-font-family:       'Geneva', 'Monaco', 'Courier New', monospace;
  --je-font-family-title: 'Chicago_mac', 'Geneva', monospace;
  --je-font-size-xs:      9px;
  --je-font-size-sm:      10px;
  --je-font-size-md:      11px;
  --je-font-size-lg:      12px;
  --je-font-size-xl:      14px;
  --je-font-size-xxl:     16px;
  --je-font-weight-normal:400;
  --je-font-weight-bold:  700;

  /* --- Spacing tokens --- */
  --je-space-1:           2px;
  --je-space-2:           4px;
  --je-space-3:          6px;
  --je-space-4:          8px;
  --je-space-5:         10px;
  --je-space-6:         14px;

  /* --- Layout tokens --- */
  --je-border-width:      2px;
  --je-border-radius:     4px;
  --je-radius-lg:         6px;

  /* --- Widget-specific tokens --- */
  --je-timeline-height:   210px;
  --je-sidebar-width:     290px;
  --je-detail-width:      280px;
  --je-menubar-height:    24px;
  --je-handle-width:      7px;
  --je-handle-grip-size:  2px;

  /* --- Dither/texture tokens --- */
  --je-dither-checker:    url("data:image/svg+xml,...");
  --je-dither-lines:      url("data:image/svg+xml,...");
  --je-waveform-fill:     #000000;
  --je-waveform-opacity:  1;
}
```

#### Theme Variants

```css
/* src/app/theme/theme-retro.css — 1-bit Mac (matches prototype) */
[data-je-theme="retro"] {
  --je-color-bg:          #c0c0c0;
  --je-color-surface:     #ffffff;
  --je-color-text:        #000000;
  --je-color-primary:     #000000;
  --je-border-width:      2px;
}

/* src/app/theme/theme-dark.css — Modern dark */
[data-je-theme="dark"] {
  --je-color-bg:          #1a1a2e;
  --je-color-surface:     #16213e;
  --je-color-text:        #e0e0e0;
  --je-color-text-muted:  rgba(224, 224, 224, 0.5);
  --je-color-primary:     #0f3460;
  --je-color-accent:      #e94560;
  --je-color-border:      #333;
  --je-border-width:      1px;
  --je-border-radius:     8px;
  --je-waveform-fill:     #e94560;
}

/* src/app/theme/theme-light.css — Clean white */
[data-je-theme="light"] {
  --je-color-bg:          #f5f5f5;
  --je-color-surface:     #ffffff;
  --je-color-text:        #333333;
  --je-color-text-muted:  rgba(51, 51, 51, 0.5);
  --je-color-primary:     #0066cc;
  --je-color-accent:      #0066cc;
  --je-color-border:      #dddddd;
  --je-border-width:      1px;
  --je-border-radius:     8px;
  --je-waveform-fill:     #0066cc;
}
```

#### Part Selectors (data-part schema)

```typescript
// src/components/JingleExtractor/parts.ts
export const PARTS = {
  root:           'root',
  menuBar:        'menu-bar',
  sidebar:        'sidebar',
  presetList:     'preset-list',
  presetItem:     'preset-item',
  configEditor:   'config-editor',
  transportBar:   'transport-bar',
  stemToggle:     'stem-toggle',
  stemButton:     'stem-button',
  timeDisplay:    'time-display',
  transportBtn:   'transport-btn',
  timeline:       'timeline',
  waveform:       'waveform',
  beatGrid:       'beat-grid',
  candidateRegion:'candidate-region',
  candidateLabel: 'candidate-label',
  candidateHandle:'candidate-handle',
  vocalRegion:    'vocal-region',
  vocalLabel:     'vocal-label',
  playhead:       'playhead',
  candidateList:  'candidate-list',
  candidateRow:   'candidate-row',
  candidateDetail:'candidate-detail',
  scoreBar:       'score-bar',
  scoreBarBlock:  'score-bar-block',
  contextItem:    'context-item',
  runButton:      'run-button',
  resetButton:    'reset-button',
  previewButton:  'preview-button',
  exportButton:   'export-button',
} as const;

export const WIDGET = 'jingle-extractor' as const;
```

#### CSS Usage Pattern

```css
/* src/components/MacWindow/MacWindow.css */
:where([data-widget="jingle-extractor"]) [data-part="menu-bar"] {
  background: var(--je-color-surface);
  border-bottom: var(--je-border-width) solid var(--je-color-border);
  padding: var(--je-space-1) var(--je-space-6);
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: var(--je-font-size-lg);
  font-weight: var(--je-font-weight-bold);
  font-family: var(--je-font-family);
  height: var(--je-menubar-height);
}
```

---

## 4. Component Decomposition Plan

### Phase 1: Foundation (Scaffold)

**Goal**: Bootable Vite + Storybook + TypeScript project with the prototype rendering unchanged.

**Steps**:
1. `npm create vite@latest jingle-extractor-ui -- --template react-ts`
2. Install deps: `@reduxjs/toolkit react-redux msw storybook`
3. Copy prototype JSX into `src/prototype/` as reference
4. Create token CSS (`tokens.css`, `theme-retro.css`)
5. Create `parts.ts` with all part names
6. Create TypeScript interfaces in `src/api/types.ts`
7. Create MSW fixtures (extract mock data from prototype)
8. Wire MSW in dev mode
9. Verify prototype renders unchanged in Vite dev server

**Files**: ~15 files
**Exit criteria**: `npm run dev` shows the prototype rendering with no visual changes

### Phase 2: Extract Components (One at a Time)

**Order matters**: Start from leaf components (no children), work inward.

#### Step 2a: ScoreBar (leaf, ~15 lines)
- Extract `Bar1Bit` → `ScoreBar.tsx`
- Move inline styles to `ScoreBar.css` using tokens
- Add `data-part="score-bar"` / `data-part="score-bar-block"`
- Create `ScoreBar.stories.tsx` (default, themed, unstyled)

#### Step 2b: MacWindow (layout wrapper, ~10 lines)
- Extract `MacWindow` → `MacWindow.tsx`
- Move inline styles to `MacWindow.css` using tokens
- Add `data-part` for title-bar, title-text, body
- Create `MacWindow.stories.tsx` (empty, with content, themed)

#### Step 2c: MenuBar (presentational, ~20 lines)
- Extract menu bar section → `MenuBar.tsx`
- Takes `track: Track` as prop
- Add `data-part="menu-bar"` on root
- Create `MenuBar.stories.tsx`

#### Step 2d: TransportBar (interactive, ~40 lines)
- Extract transport section → `TransportBar.tsx`
- Sub-components: `StemToggle`, `TimeDisplay`, `TransportControls`
- Props: `playhead`, `duration`, `stem`, `onStemChange`, `onTransportAction`
- Add `data-part` for each sub-section
- Create `TransportBar.stories.tsx`

#### Step 2e: PresetPanel (interactive, ~30 lines)
- Extract preset buttons → `PresetPanel.tsx`
- Props: `presets`, `activePreset`, `onSelectPreset`
- Add `data-part` for list and items
- Create `PresetPanel.stories.tsx`

#### Step 2f: ConfigEditor (complex, ~40 lines)
- Extract JSON editor → `ConfigEditor.tsx` / `JsonEditor.tsx`
- Separate concerns: `JsonEditor` handles raw text + validation, `ConfigEditor` wraps with run/reset buttons
- Props: `config`, `onChange`, `onRun`, `onReset`
- Add `data-part` for editor, button group, error display
- Create `ConfigEditor.stories.tsx` (valid JSON, invalid JSON, themed)

#### Step 2g: CandidateList (interactive, ~40 lines)
- Extract candidate list → `CandidateList.tsx` / `CandidateRow.tsx`
- Props: `candidates`, `selectedId`, `onSelect`, `onPreview`
- Add `data-part` for list, row, score badge, vocal warning
- Create `CandidateList.stories.tsx` (5 candidates, 1 selected, with vocal overlap)

#### Step 2h: CandidateDetail (presentational, ~60 lines)
- Extract detail panel → `CandidateDetail.tsx`
- Sub-components: `QualityPanel`, `ContextPanel`
- Reuses `ScoreBar` component
- Props: `candidate`, `stem`, `onPreview`, `onExport`
- Add `data-part` for detail, quality section, context section, buttons
- Create `CandidateDetail.stories.tsx` (best candidate, normal, with vocal overlap)

#### Step 2i: Timeline (complex SVG, ~105 lines)
- Extract `Timeline` → decompose into sub-components:
  - `WaveformLayer.tsx` — RMS rendering as SVG rects
  - `CandidateLayer.tsx` — candidate regions + draggable handles
  - `VocalLayer.tsx` — vocal segment regions
  - `BeatGrid.tsx` — beat gridlines
  - `Playhead.tsx` — playhead marker
  - `useTimelineDrag.ts` — custom hook for pointer drag logic
- Timeline composes all layers in an SVG
- Props: `data`, `candidates`, `selectedId`, `playhead`, `onSelect`, `onDrag`, `onPlayheadChange`
- Add `data-part` for each layer
- Create `Timeline.stories.tsx` (no candidates, with candidates, dragging, themed)

**Each extraction step follows this pattern**:
1. Create component file + CSS file + types
2. Move logic from inline to the component
3. Replace inline styles with CSS using tokens + `data-part`
4. Create Storybook story
5. Wire into main `JingleExtractor.tsx`
6. Verify no visual regression

### Phase 3: State Management (RTK Query + Redux)

**Goal**: Replace local `useState` with Redux store + RTK Query.

1. Create `store.ts` with `configureStore`
2. Create `analysisSlice.ts` for local UI state:
   - `selectedCandidateId`
   - `playhead`
   - `stem`
   - `activePreset`
   - `config`
   - `editedCandidates`
3. Create `jingleApi.ts` with RTK Query endpoints
4. Create MSW handlers matching RTK Query endpoints
5. Wire `Provider` + `ApiProvider` in `App.tsx`
6. Replace `useState` in components with `useSelector` / `useDispatch`
7. Wire "Run Analysis" button to `useAnalyzeMutation()`
8. Wire candidate list to `useGetAnalysisQuery()` data
9. Wire export to `useExportClipMutation()`

**Exit criteria**: All data flows through Redux. MSW provides mock responses. No hard-coded data in components.

### Phase 4: Theming and Polish

1. Create `theme-dark.css` and `theme-light.css`
2. Add theme switcher component
3. Verify all components respond to theme changes
4. Add `unstyled` prop to root widget
5. Accessibility audit: ARIA labels, focus management, keyboard nav
6. Responsive adjustments (min-width handling)
7. Add loading states (skeleton waveform, spinner on analysis)
8. Add error states (API failure, bad audio file)

### Phase 5: Integration Stories

1. Full widget Storybook story with all themes
2. Stories with MSW-controlled scenarios:
   - Loading state (delayed response)
   - Error state (500 response)
   - Empty state (no candidates)
   - Many candidates (20+)
3. Visual regression baseline

---

## 5. API Contract (Backend ↔ Frontend)

The Python backend (JINGLE-001 `jingle_extractor.py`) will expose these endpoints:

| Method | Path | Request | Response | Purpose |
|--------|------|---------|----------|---------|
| POST | `/api/analyze` | `{ audio_file, config }` | `AnalysisResponse` | Run full pipeline |
| GET | `/api/analysis/:trackId` | — | `AnalysisResponse` | Get cached results |
| POST | `/api/mine` | `{ trackId, config }` | `Candidate[]` | Re-mine with new config |
| POST | `/api/export` | `{ trackId, candidateId, stem, fmt }` | `Blob (audio)` | Export single clip |
| POST | `/api/export/batch` | `{ trackId, candidates[], stem, fmt }` | `Blob (zip)` | Export multiple clips |
| GET | `/api/tracks` | — | `Track[]` | List analyzed tracks |
| GET | `/api/presets` | — | `Record<string, Config>` | Get preset configs |

The backend can be a simple Flask/FastAPI wrapper around the existing `jingle_extractor.py` functions.

---

## 6. Storybook Story Inventory

| Component | Stories | Variants |
|-----------|---------|----------|
| ScoreBar | Default, Themed, Unstyled | value: 0, 50, 95 |
| MacWindow | Empty, With Content, Themed | — |
| MenuBar | Default, Themed | with track info |
| TransportBar | Default, Playing, Themed | stem: orig/inst/vox |
| StemToggle | Default, Active, Themed | — |
| TimeDisplay | Zero, Mid-track, End | — |
| PresetPanel | Default, Active Preset, Themed | — |
| ConfigEditor | Valid JSON, Invalid JSON, Themed | — |
| JsonEditor | Valid, Error, Empty | — |
| CandidateList | 5 items, 1 selected, With overlap | — |
| CandidateRow | Normal, Selected, Best, Vocal overlap | — |
| CandidateDetail | Best candidate, Normal, Vocal overlap | — |
| QualityPanel | High scores, Low scores | — |
| ContextPanel | Clean, Vocal overlap | — |
| Timeline | No candidates, With candidates, Selected | — |
| WaveformLayer | Loud track, Quiet track | — |
| CandidateLayer | Single, Multiple, Dragging | — |
| VocalLayer | Single phrase, Multiple phrases | — |
| BeatGrid | Fast BPM, Slow BPM | — |
| Playhead | At start, At middle | — |
| **JingleExtractor** | **Full widget, Retro theme, Dark theme, Light theme, Unstyled, Loading state, Error state, Empty state** | — |

**Total**: ~40+ stories across all components.

---

## 7. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SVG drag performance on large waveforms | Janky drag on long tracks | Virtualize waveform rendering (only visible segment); debounce drag updates |
| MSW + RTK Query compatibility | Mock setup complexity | Use MSW 2.x with `http` handlers; verify with integration test |
| Theme token explosion | Too many CSS variables | Keep tokens to ~30 max; group by purpose (color, typography, spacing, layout) |
| Audio playback in browser | Complex Web Audio API | Use `useAudioPlayer` custom hook; start with simple `<audio>` element, upgrade later |
| Prototype visual regression | Theme migration breaks layout | Pixel-compare screenshots before/after each extraction step |
| Backend API not ready | Frontend blocked | MSW provides full mock layer; frontend develops independently |

---

## 8. Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Tailwind CSS | Conflicts with `data-part` theming approach; adds build dependency |
| CSS Modules | Doesn't provide the stable selector contract that `data-part` gives |
| styled-components | Runtime overhead; doesn't align with CSS custom property approach |
| Zustand instead of RTK Query | No built-in API caching; RTK Query handles loading/error states |
| Mock Service Worker alternatives (Mirage, JSON Server) | MSW works at the network level, intercepts all fetches, works in Storybook and tests |
| Radix UI / shadcn/ui | Adds component dependency; we want full control over the 1-bit aesthetic |

---

## 9. Open Questions

1. **Audio playback**: Should we use Web Audio API for waveform playback or a simple `<audio>` element? Web Audio gives more control but is more complex.
2. **Waveform rendering**: Canvas or SVG? SVG is what the prototype uses. Canvas would be faster for very long tracks (>5 min). Could use SVG with virtualization.
3. **Backend framework**: Flask or FastAPI? FastAPI has better async support and auto-generated OpenAPI docs.
4. **Deployment**: Static site (Vite build) served by Python backend, or separate deployment?
5. **Real-time updates**: Should analysis progress be pushed via WebSocket, or polled?
6. **Undo/redo**: Should candidate drag adjustments be undoable?

---

## 10. Implementation Timeline

| Phase | Description | Estimated Effort | Depends On |
|-------|-------------|-----------------|------------|
| Phase 1 | Scaffold + token CSS + types + MSW fixtures | 2-3 hours | None |
| Phase 2a-2c | Extract leaf components (ScoreBar, MacWindow, MenuBar) | 1-2 hours | Phase 1 |
| Phase 2d-2f | Extract interactive panels (Transport, Preset, Config) | 2-3 hours | Phase 1 |
| Phase 2g-2h | Extract list/detail (CandidateList, CandidateDetail) | 2-3 hours | Phase 2a |
| Phase 2i | Extract Timeline (complex SVG decomposition) | 3-4 hours | Phase 2a |
| Phase 3 | RTK Query + Redux state management | 3-4 hours | Phase 2 complete |
| Phase 4 | Theming (dark/light) + accessibility | 2-3 hours | Phase 3 |
| Phase 5 | Integration stories + visual regression | 2-3 hours | Phase 4 |
| **Total** | | **17-25 hours** | |

---

## 11. References

- **Source prototype**: `ttmp/.../JINGLE-002/.../sources/local/jingle-extractor-mac.jsx`
- **Parent ticket**: JINGLE-001 (Python pipeline: `jingle_extractor.py`)
- **Metadata inventory**: Obsidian vault `UI-DESIGN - Jingle Extractor Interface - Metadata and Features Guide.md`
- **React modular pattern skill**: `~/.pi/agent/skills/react-modular-themable-storybook/`
- **RTK Query docs**: https://redux-toolkit.js.org/rtk-query/overview
- **MSW docs**: https://mswjs.io/docs/
- **Storybook docs**: https://storybook.js.org/docs
