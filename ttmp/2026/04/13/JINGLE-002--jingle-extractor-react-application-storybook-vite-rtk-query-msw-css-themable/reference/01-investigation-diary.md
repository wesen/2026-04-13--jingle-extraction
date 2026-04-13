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

**Status**: In progress.
