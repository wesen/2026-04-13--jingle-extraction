---
title: "Investigation Diary"
doc_type: reference
intent: long-term
status: active
topics:
  - react
  - storybook
  - vite
  - rtk-query
  - msw
  - css-theming
  - audio-processing
  - jingle-extractor
created: "2026-04-13"
ticket: JINGLE-002
---

# Investigation Diary — JINGLE-002

## Step 1: Ticket Setup and Source Import

**What changed**: Created ticket JINGLE-002, imported `jingle-extractor-mac.jsx` from `~/Downloads/`.

**Why**: User wants to convert the 1-bit Mac prototype into a production React application with Storybook, Vite, RTK Query, MSW, and CSS theming.

**Commands run**:
```bash
docmgr ticket create-ticket --ticket JINGLE-002 \
  --title "Jingle Extractor React Application - Storybook Vite RTK-Query MSW CSS Themable" \
  --topics react,storybook,vite,rtk-query,msw,css-theming,audio-processing,jingle-extractor

docmgr import file --file ~/Downloads/jingle-extractor-mac.jsx --ticket JINGLE-002

docmgr doc add --ticket JINGLE-002 --doc-type design-doc \
  --title "Jingle Extractor React Application - Architecture and Implementation Plan"

docmgr doc add --ticket JINGLE-002 --doc-type reference \
  --title "Investigation Diary"
```

**What worked**: Clean import, file saved to `sources/local/jingle-extractor-mac.jsx`.

**What didn't work**: Nothing failed.

**What was tricky**: Nothing tricky in this step.

## Step 2: Prototype Analysis

**What changed**: Read and analyzed the 420-line `jingle-extractor-mac.jsx` prototype.

**Findings**:

1. **5 logical components** in a single file:
   - `MacWindow` (window chrome, 10 lines)
   - `Timeline` (SVG waveform + drag, 105 lines) — the most complex component
   - `JsonEditor` (JSON validation textarea, 28 lines)
   - `Bar1Bit` (pixel score bar, 15 lines)
   - `JingleExtractorRetro` (main layout + all state, 215 lines)

2. **6 useState hooks** in the root component, no context, no store.

3. **All inline styles** (~200 `style={{}}` objects) with hard-coded `#000`/`#fff` values.

4. **Two SVG data URIs** for dither patterns (`CHECKER` for 2x2 checkerboard, `LINES_H` for horizontal lines).

5. **Interaction patterns**:
   - SVG pointer capture for drag handles
   - Click-to-select candidates
   - Click-to-set playhead
   - JSON validation with error display
   - Preset switching with state sync

6. **Data shapes**: 4 TypeScript interfaces needed (`Track`, `TimelineData`, `VocalSegment`, `Candidate`, `AnalysisConfig`).

7. **No production concerns**: No audio playback, no API calls, no accessibility, no keyboard nav, no error/loading states.

**Why this matters for the plan**: The decomposition order is important — leaf components first (ScoreBar, MacWindow), then interactive panels (Transport, Preset, Config), then complex components (Timeline last). The Timeline is the hardest component with SVG rendering, pointer drag, and multiple visual layers.

**What worked**: Reading the code was straightforward; the prototype is well-structured despite being monolithic.

**What didn't work**: Nothing.

**What was tricky**: The SVG drag implementation uses `setPointerCapture` / `releasePointerCapture` — this is good and should be preserved, extracted into a `useTimelineDrag` custom hook.

## Step 3: Skills Review

**What changed**: Read the `react-modular-themable-storybook` skill and all its references.

**Key patterns adopted from the skill**:

1. **`data-part` selectors** for stable styling hooks (replacing class names)
2. **CSS custom properties** for theming tokens (color, typography, spacing, layout)
3. **`:where([data-widget="X"])` for low-specificity selectors**
4. **Unstyled mode** prop that omits base CSS
5. **Module structure**: `Widget.tsx` as entrypoint, `types.ts` for API, `parts.ts` for part names, `styles/` for CSS layers
6. **Storybook stories**: Default, themed, unstyled, custom renderers for each component

**Why**: These patterns provide the theming system the user asked for, and they align with the skill's proven approach for modular React packages.

## Step 4: Design Document Written

**What changed**: Created the comprehensive architecture and implementation plan (33KB design doc).

**Sections written**:
1. Executive Summary
2. Problem Statement (current-state analysis with evidence)
3. Proposed Architecture (full package layout, RTK Query API, Redux state, theming)
4. Component Decomposition Plan (5 phases, 9 extraction steps, ordered by complexity)
5. API Contract (7 REST endpoints)
6. Storybook Story Inventory (~40+ stories)
7. Risks and Mitigations (6 risks)
8. Alternatives Considered (6 alternatives rejected with reasons)
9. Open Questions (6 questions)
10. Implementation Timeline (17-25 hours estimate)

**Key design decisions**:
- RTK Query over Zustand (built-in caching + loading/error states)
- CSS custom properties + `data-part` over Tailwind or CSS-in-JS
- MSW over Mirage/JSON Server (network-level interception, Storybook compatible)
- SVG over Canvas for waveform (matches prototype; can virtualize for long tracks)
- Decomposition order: leaf → panel → complex (minimizes rework)

**What worked**: The skill references provided clear patterns that mapped directly to the prototype's needs.

**What didn't work**: Nothing.

**What was tricky**: Balancing exhaustiveness with navigability — the design doc is long but each section is independently scannable.

## Step 5: Validation and Upload

**What changed**: Will validate with docmgr doctor, then upload to reMarkable.

**Commands**:
```bash
docmgr doctor --ticket JINGLE-002 --stale-after 30
docmgr doc relate --ticket JINGLE-002 ...
remarquee upload bundle --dry-run ...
remarquee upload bundle ...
```

**Status**: Completed. Uploaded to /ai/2026/04/13/JINGLE-002.

---

## Step 6: Phase 1 — Scaffold (Task #2)

**What changed**: Created the full project scaffold: Vite + TypeScript + Storybook + RTK Query + MSW + CSS tokens.

**Commands run**:
```bash
# Scaffold Vite project
npm create vite@latest jingle-extractor-ui -- --template react-ts
cd jingle-extractor-ui
npm install

# Install production deps
npm install @reduxjs/toolkit react-redux msw

# Storybook already present from init
npm install

# Install TypeScript (was missing)
npm install typescript --save-dev

# Install MSW storybook addon
npm install msw-storybook-addon
```

**Files created** (in `jingle-extractor-ui/src/`):

| File | Purpose |
|------|---------|
| `api/types.ts` | All TypeScript interfaces (Track, TimelineData, VocalSegment, Candidate, AnalysisConfig, etc.) |
| `app/store.ts` | Redux store with RTK Query middleware |
| `app/theme/tokens.css` | 30+ CSS custom property tokens |
| `app/theme/theme-retro.css` | Retro 1-bit Mac theme |
| `app/theme/theme-dark.css` | Modern dark theme |
| `app/theme/theme-light.css` | Clean light theme |
| `features/analysis/analysisSlice.ts` | Redux slice for UI state (selectedCandidate, playhead, stem, config, theme) |
| `features/audio/audioSlice.ts` | Redux slice for audio playback |
| `api/jingleApi.ts` | RTK Query API with 7 endpoints |
| `mocks/handlers.ts` | MSW handlers for all API endpoints |
| `mocks/browser.ts` | MSW browser worker setup |
| `mocks/fixtures/thrash-metal.json` | Full mock response extracted from prototype |
| `utils/constants.ts` | DEFAULT_PRESETS object |
| `utils/format.ts` | fmt(), fmtCompact(), fmtDuration(), fmtBpm() |
| `hooks/useRedux.ts` | Typed useDispatch / useSelector hooks |
| `components/JingleExtractor/parts.ts` | 35 data-part name constants |
| `App.tsx` | Root with theme switcher and placeholder |
| `main.tsx` | Entry point with MSW worker + Redux Provider |
| `index.css` | Minimal global resets |
| `prototype/jingle-extractor-mac.jsx` | Copy of source prototype |

**Bugs fixed**:
- `analysisReducer` / `audioReducer` → changed to `analysisSlice.reducer` / `audioSlice.reducer` (exported named export was `.reducer`)
- `PresetName` unused import in `jingleApi.ts` and `handlers.ts` → removed
- `useState`, `Provider`, `store` unused in `App.tsx` → removed
- `preview.ts` → renamed `preview.tsx` for JSX support
- `typescript` missing → added to devDependencies

**Verification**:
```bash
./node_modules/.bin/tsc -b  # ✅ No errors
./node_modules/.bin/vite build  # ✅ 270KB JS, 4.7KB CSS
npm run lint  # ✅ Clean
```

**What worked**: The Storybook + MSW integration went smoothly. The fixture extraction from the prototype was mechanical. CSS token design maps 1:1 from the hardcoded inline values.

**What didn't work**: Nothing major. TypeScript compilation errors were all fixable.

**What was tricky**: Ensuring `analysisSlice.reducer` vs `analysisReducer` — the slice exports `.reducer` as a named export, not a default export of `analysisSlice`. Had to verify the export shape.

**Status**: Phase 1 complete. All foundation files created. TypeScript clean, Vite builds, lint passes.
