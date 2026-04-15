---
Title: Widget Inventory and Design System Extraction Plan
Ticket: JINGLE-011
Status: active
Topics:
    - frontend
    - design-system
    - widget-inventory
    - ux
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: jingle-extractor-ui/src/components/JingleExtractor/parts.ts
      Note: Central registry of all data-part selectors
    - Path: jingle-extractor-ui/src/app/theme/tokens.css
      Note: Design token definitions (all --je-* prefixed)
    - Path: jingle-extractor-ui/src/components/MacWindow/MacWindow.tsx
      Note: Primary chrome primitive
    - Path: jingle-extractor-ui/src/components/CandidateList/CandidateList.tsx
      Note: Grid-row pattern for dense data rows
    - Path: jingle-extractor-ui/src/components/CandidateDetail/CandidateDetail.tsx
      Note: Inspector/panel composition pattern
    - Path: jingle-extractor-ui/src/components/ScoreBar/ScoreBar.tsx
      Note: Self-contained metric display primitive
    - Path: jingle-extractor-ui/src/components/TransportBar/TransportBar.tsx
      Note: Segmented control + button group pattern
    - Path: jingle-extractor-ui/src/components/PresetPanel/PresetPanel.tsx
      Note: Radio-style button list pattern
ExternalSources: []
Summary: Deep analysis of existing widgets with ASCII screenshots, primitive taxonomy, and a concrete extraction/reuse plan for the new Studio screen and design system.
LastUpdated: 2026-04-14T17:25:00-04:00
---

# Widget Inventory and Design System Extraction Plan

## Purpose

This document maps every existing React widget in `jingle-extractor-ui` against a **primitive taxonomy** — the minimal set of building blocks from which the new Studio screen can be assembled without inventing new patterns. It includes ASCII approximations of each component, the `data-part` selector vocabulary, and concrete recommendations for what to extract, what to rename, and what to leave alone.

---

## Quick Reference: Screenshot Index

| Component | Screenshot file |
|---|---|
| Storybook overview | `storybook-overview.png` |
| MacWindow (window chrome) | `component-macwindow.png` |
| MenuBar (app chrome) | `component-menubar.png` |
| CandidateList (dense grid row) | `component-candidatelist.png` |
| TransportBar (segmented + controls) | `component-transportbar.png` |
| PresetPanel (radio button list) | `component-presetpanel.png` |
| ScoreBar (pixel-art meter) | `component-scorebar.png` |
| ConfigEditor (form + JSON textarea) | `component-configeditor.png` |
| Timeline (SVG canvas) | `component-timeline.png` |
| CandidateDetail (inspector panel) | `component-candidatedetail.png` |
| Full JingleExtractor composition | `storybook-jingleextractor-full.png` |
| Timeline story (correct URL) | `component-timeline-story.png` |

All screenshots live in the project root.

---

## Design Token Vocabulary

Before diving into widgets, here is the complete `--je-*` token vocabulary defined in `tokens.css`. All existing components consume only these tokens, so any new widget must do the same.

### Color tokens

```css
--je-color-bg              /* page/app background */
--je-color-surface         /* window/card/panel surface */
--je-color-text            /* primary text */
--je-color-text-muted      /* secondary/label text */
--je-color-text-inverse    /* text on dark backgrounds */
--je-color-primary         /* primary action color */
--je-color-accent          /* accent / selection highlight */
--je-color-border          /* all borders */
--je-color-error           /* error state */
--je-color-selected        /* selected row/button background */
--je-color-selected-text   /* text on selected background */
--je-color-success         /* success indicators */
--je-color-warning         /* warning indicators */
--je-color-warning-bg      /* warning background tint */
--je-color-waveform        /* timeline waveform bars */
--je-color-beat-line       /* timeline beat grid lines */
--je-color-playhead        /* timeline playhead line */
--je-color-candidate-fill  /* timeline candidate region fill */
--je-color-candidate-border
--je-color-vocal-region   /* timeline vocal segment tint */
```

### Typography tokens

```css
--je-font-family           /* body / code font */
--je-font-family-title     /* window title / headings */
--je-font-size-xs:   9px
--je-font-size-sm:   10px
--je-font-size-md:   11px   /* ← default body size */
--je-font-size-lg:   12px
--je-font-size-xl:   14px
--je-font-size-xxl:  16px
--je-font-weight-normal: 400
--je-font-weight-bold:   700
```

### Spacing tokens

```css
--je-space-1:  2px   --je-space-6:  14px
--je-space-2:  4px   --je-space-8:  18px
--je-space-3:  6px   --je-space-10: 24px
--je-space-4:  8px
--je-space-5: 10px
```

### Border / radius tokens

```css
--je-border-width:  2px
--je-border-radius: 4px
--je-radius-lg:      6px
--je-radius-xl:      8px
```

### Layout tokens

```css
--je-menubar-height:     24px
--je-timeline-height:    210px
--je-sidebar-width:      290px
--je-detail-width:       280px
```

### Component tokens

```css
--je-transport-btn-size:     28px
--je-score-bar-block-width:  6px
--je-score-bar-block-height: 12px
--je-score-bar-gap:          1px
--je-label-width:             52px
```

### Texture / dither tokens

```css
--je-dither-checker   /* 2×2 checkerboard SVG (error bg, selected fills) */
--je-dither-lines     /* 1×2 horizontal-line SVG (title bar texture) */
```

---

## Primitive Taxonomy

The existing widgets decompose into **five primitive categories**:

| Category | Primitive | Existing widget(s) |
|---|---|---|
| **Chrome** | Window frame | `MacWindow` |
| **Chrome** | App header / menu bar | `MenuBar` |
| **Data display** | Dense grid row | `CandidateList` (row) |
| **Data display** | Inspector panel | `CandidateDetail` |
| **Data display** | Self-contained metric | `ScoreBar` |
| **Data display** | Dual-table debug view | `DebugPanel` |
| **Form control** | Segmented toggle group | `TransportBar` (stem toggle), `PresetPanel` |
| **Form control** | JSON textarea with validation | `ConfigEditor` |
| **Form control** | Action button row | `CandidateDetail.buttonRow`, `ConfigEditor.actionRow` |
| **Form control** | Primary / secondary button variants | via CSS (`preview-button`, `export-button`, `run-button`, `reset-button`) |
| **Layout** | Horizontal rule separator | via border on `windowBody`, `detailHeader`, etc. |
| **Canvas** | SVG-based data visualization | `Timeline` |

---

## Widget-by-Widget Analysis

### 1. MacWindow

**File:** `src/components/MacWindow/MacWindow.tsx`

**Purpose:** Mac OS-style window chrome — a bordered container with a title bar (close button + textured sides + centered title) and a scrollable body.

**ASCII approximation:**

```
┌─────────────────────────────────────────────┐
│ ○  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  Window Title  ▓▓▓▓▓▓▓▓▓ │
├─────────────────────────────────────────────┤
│                                             │
│  (children rendered here)                   │
│                                             │
└─────────────────────────────────────────────┘
```

**`data-part` vocabulary:**

| Selector | Purpose |
|---|---|
| `window` | Root container |
| `title-bar` | Full title bar row |
| `window-button` | The macOS-style close button circle |
| `title-bar-left` | Left textured fill (dither lines) |
| `title-text` | Centered title text |
| `title-bar-right` | Right textured fill (dither lines) |
| `window-body` | Scrollable content area |

**Props interface:**

```ts
interface MacWindowProps {
  title: string;
  children: ReactNode;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}
```

**CSS patterns used:**

- `border: var(--je-border-width) solid var(--je-color-border)`
- `border-radius: var(--je-radius-lg)`
- `title-bar` uses `var(--je-dither-lines)` on left/right fills
- body uses `flex: 1; overflow: auto`

**Reuse potential:** ★★★★★ — This is the single most reusable widget. Every panel, inspector, list, and form on the Studio screen should be wrapped in `MacWindow`. No changes needed.

**Extraction recommendation:** None. Keep `MacWindow` as-is in `src/components/MacWindow/`. It is already well-isolated.

---

### 2. MenuBar

**File:** `src/components/MenuBar/MenuBar.tsx`

**Purpose:** Top application chrome with Apple logo, menu items, and track info display.

**ASCII approximation:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🍎  File  Edit  View  Analysis  Export         thrash_metal_01.mp3 — 0:55 — 175.0 BPM  [EN] │
└─────────────────────────────────────────────────────────────────────┘
```

**`data-part` vocabulary:**

| Selector | Purpose |
|---|---|
| `menu-bar` | Root nav element |
| `menu-logo` | 🍎 Apple logo |
| `menu-item` | Each menu label |
| `menu-spacer` | Flex spacer between menu items and track info |
| `track-info` | Right-aligned track metadata |
| `track-badge` | Language badge pill |

**Props interface:**

```ts
interface MenuBarProps {
  track: Track;
}
```

**Reuse potential:** ★★★☆☆ — The `MenuBar` is tightly coupled to a `Track` object and is specifically designed for the mining/extraction workflow (shows BPM, language, duration). For the Studio screen, we will likely want a **different** top bar that shows the active generation run, selected track, and navigation. The existing `MenuBar` component can be left as-is for the Mining screen.

**Extraction recommendation:** Add a new `StudioTopBar` component rather than modifying `MenuBar`. The new bar should share the same visual language (24px height, `--je-menubar-height`) but expose different context.

---

### 3. CandidateList

**File:** `src/components/CandidateList/CandidateList.tsx`

**Purpose:** Dense grid-row list of candidate clips. Shows rank, time range, duration, score, vocal-overlap badge, and preview button per row.

**ASCII approximation:**

```
┌──────────────────────────────────────────────────────────────────┐
│  #1 ★   Hook phrase A          39.1→43.1   4.0s   92   [vox]  ▶ │
│  #2     Intro buildup           35.1→39.1   4.0s   91   [✓]    ▶ │
│  #3     Bridge transition       45.7→48.2   2.5s   89   [✓]    ▶ │
│  #4     Chorus lead-in          26.0→30.0   4.0s   88   [✓]    ▶ │
└──────────────────────────────────────────────────────────────────┘
```

**Column layout (CSS grid):**

```
grid-template-columns: 22px minmax(0, 1fr) 42px 34px 52px 24px
                ↑       ↑              ↑     ↑    ↑     ↑
             rank    title         duration score badge  btn
```

**`data-part` vocabulary:**

| Selector | Purpose |
|---|---|
| `candidate-list` | Root listbox container |
| `candidate-row` | Each row (grid-aligned) |
| `candidate-rank` | Rank number or ★ |
| `candidate-time` | Column with title + time range |
| `candidate-title` | Bold label (source_text) |
| `candidate-duration` | Duration in seconds |
| `candidate-score` | Numeric score |
| `candidate-badge` | Vox/warning pill badge |
| `candidate-preview-btn` | ▶/■ preview toggle button |

**Props interface:**

```ts
interface CandidateListProps {
  candidates: Array<Candidate & { edited?: boolean }>;
  selectedId: number | null;
  previewingId?: number | null;
  onSelect: (id: number) => void;
  onPreview: (id: number) => void;
}
```

**CSS patterns used:**

- Row uses CSS grid for perfect column alignment
- Hover: `background: var(--je-color-bg)`
- Selected: `background: var(--je-color-selected); color: var(--je-color-selected-text)`
- Preview button inverts colors when row is selected

**Reuse potential:** ★★★★☆ — The **row structure** is extremely reusable for any dense tabular data (tracks, runs, library items). The column widths and badge behavior should be abstracted into a **generic `DataList`** primitive that accepts a column config.

**Extraction recommendation:** Extract a new `DataListRow` primitive that takes a `columns` config:

```tsx
interface ColumnDef<T> {
  key: keyof T | string;
  label?: string;
  width?: string;       // e.g. "52px" or "minmax(0, 1fr)"
  render?: (item: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
}

interface DataListProps<T> {
  items: T[];
  columns: ColumnDef<T>[];
  selectedId: string | number | null;
  onSelect: (item: T) => void;
  rowActions?: Array<(item: T) => ReactNode>;
}
```

The existing `CandidateList` can then be rewritten as:

```tsx
<DataList items={candidates} columns={CANDIDATE_COLUMNS} selectedId={selectedId} onSelect={...}>
  {(c) => <button onClick={() => onPreview(c.id)}>▶</button>}
</DataList>
```

For the Studio screen, `TrackResultsList` and `TrackLibraryList` should both use `DataList` with different column configs.

---

### 4. CandidateDetail

**File:** `src/components/CandidateDetail/CandidateDetail.tsx`

**Purpose:** Inspector panel for a selected candidate — shows quality breakdown (Attack/Ending/Energy via `ScoreBar`), context info (vocal overlap, stem, etc.), and action buttons.

**ASCII approximation:**

```
┌──────────────────────────────────────────────────────┐
│  Candidate #1 ★ BEST                                 │
│  0:39.1 → 0:43.1 · 4.0s                             │
├──────────────────────────────────────────────────────┤
│  QUALITY                                             │
│  Attack    ████████████████░░░░░░░░  95             │
│  Ending    ███████████████░░░░░░░░░░  88             │
│  Energy    ████████████░░░░░░░░░░░░░░  78             │
│  ────────────────────────────────────                 │
│  Overall                            92               │
├──────────────────────────────────────────────────────┤
│  CONTEXT                                             │
│  Vocal overlap              ✓ None                   │
│  Start on onset             ✓ Yes                    │
│  End on beat                ✓ Yes                    │
│  Stem                       inst                     │
│  Local edit                 —                        │
├──────────────────────────────────────────────────────┤
│  [▶ Preview]              [⬇ Export]                │
└──────────────────────────────────────────────────────┘
```

**`data-part` vocabulary:**

| Selector | Purpose |
|---|---|
| `candidate-detail` | Root panel |
| `detail-header` | Title + subtitle block |
| `detail-title` | Candidate label + ★ BEST |
| `detail-subtitle` | Time range + duration |
| `quality-panel` | Score bars section |
| `section-label` | "QUALITY" / "CONTEXT" labels |
| `overall-score` | Divider row for final score |
| `context-panel` | Context key/value section |
| `context-item` | Each label/value pair row |
| `context-label` | Left-side muted label |
| `context-value` | Right-side bold value |
| `button-row` | Action button container |
| `preview-button` | Secondary action button |
| `export-button` | Primary action button |

**Props interface:**

```ts
interface CandidateDetailProps {
  candidate: DisplayCandidate;
  stem: StemType;
  isPreviewing?: boolean;
  onPreview: () => void;
  onExport: () => void;
  onResetEdit: () => void;
}
```

**CSS patterns used:**

- Header has `border-bottom: var(--je-border-width) solid var(--je-color-border)`
- Section labels use `font-size: var(--je-font-size-sm)`, `font-weight: bold`, `letter-spacing: 1px`
- `context-item` uses `display: flex; justify-content: space-between`
- `button-row` uses `display: flex; gap: var(--je-space-2)`
- `preview-button` (secondary): white bg, black text
- `export-button` (primary): black bg, white text, `font-weight: bold`

**Reuse potential:** ★★★★★ — The inspector panel pattern (header + sectioned body + action row) is directly applicable to `TrackInspector` in the Studio screen. The CSS patterns for sections, labels, and button rows are worth extracting into a shared CSS partial.

**Extraction recommendation:** Extract the **button variant CSS** into a separate `shared/button.css` or into `tokens.css`:

```css
[data-part='btn-primary'] {
  background: var(--je-color-selected);
  color: var(--je-color-selected-text);
  border: var(--je-border-width) solid var(--je-color-border);
  border-radius: var(--je-radius-lg);
  padding: var(--je-space-3, 6px) 0;
  font-size: var(--je-font-size-md);
  font-family: var(--je-font-family);
  font-weight: var(--je-font-weight-bold);
  flex: 1;
  cursor: pointer;
}

[data-part='btn-secondary'] {
  background: var(--je-color-surface);
  color: var(--je-color-text);
  border: var(--je-border-width) solid var(--je-color-border);
  border-radius: var(--je-radius-lg);
  padding: var(--je-space-3, 6px) 0;
  font-size: var(--je-font-size-md);
  font-family: var(--je-font-family);
  flex: 1;
  cursor: pointer;
}
```

Also extract the **section header pattern** for reuse in `TrackInspector`.

---

### 5. ScoreBar

**File:** `src/components/ScoreBar/ScoreBar.tsx`

**Purpose:** Pixel-art 1-bit meter showing a 0–100 value as 20 filled/empty blocks.

**ASCII approximation:**

```
Attack    ████████████████░░░░░░░░  95
Ending    ██████████████░░░░░░░░░░  88
Energy    ████████████░░░░░░░░░░░░░  78
```

**`data-part` vocabulary:**

| Selector | Purpose |
|---|---|
| `score-bar` | Root flex container |
| `score-bar-label` | Left-side metric name |
| `score-bar-track` | Flex container of blocks |
| `score-bar-block` | Each individual block (`data-filled="true"`) |

**Props interface:**

```ts
interface ScoreBarProps {
  label: string;
  value: number; // 0–100
  className?: string;
}
```

**CSS patterns used:**

- `display: flex; align-items: center; gap: var(--je-space-2)`
- Block: `border: var(--je-border-width) solid var(--je-color-border)`, filled = `background: var(--je-color-text)`

**Reuse potential:** ★★★★☆ — Useful for any metric display. Could be renamed to `MetricBar` and generalized to accept `min`/`max` props. For the Studio screen, it could show track duration, generation quality (if added), or run completion percentage.

**Extraction recommendation:** Rename to `MetricBar` and keep it in `src/components/ScoreBar/` (or move to `src/components/MetricBar/`). No changes needed to the implementation for v1.

---

### 6. TransportBar

**File:** `src/components/TransportBar/TransportBar.tsx`

**Purpose:** Playback controls with stem toggle (segmented button group), time display, and transport buttons (seek back / play-pause / seek forward).

**ASCII approximation:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Original] [Instrumental] [Vocals]           0:39.1/0:55.0     [◁◁] [▷] [▷▷]  │
└─────────────────────────────────────────────────────────────────────────┘
```

**`data-part` vocabulary:**

| Selector | Purpose |
|---|---|
| `transport-bar` | Root toolbar |
| `stem-toggle` | Segmented button group container |
| `stem-button` | Each stem option button |
| `transport-spacer` | Flex spacer |
| `time-display` | Current time (large, monospace) |
| `time-display-total` | "/ total" suffix |
| `transport-controls` | Button group container |
| `transport-btn` | Each transport button |

**Props interface:**

```ts
interface TransportBarProps {
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

**CSS patterns used:**

- Stem toggle: `display: flex; gap: var(--je-space-1)`
- Stem button: `aria-pressed` for active state, active = black bg + white text
- Time display: `font-family: monospace`, `font-size: var(--je-font-size-xxl)`, `font-weight: bold`
- Transport buttons: fixed `28px × 28px` square buttons (`--je-transport-btn-size`)

**Reuse potential:** ★★★☆☆ — The **segmented control pattern** (`stem-toggle` → `stem-button`) is directly reusable for the Studio screen's filter controls (e.g., source filter: `all | generated | imported`, status filter: `all | pending | analyzed | failed`). The time display is mining-specific.

**Extraction recommendation:** Extract a `SegmentedControl` primitive:

```tsx
interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}
```

Use it in `TransportBar` internally, and reuse it in the Studio screen's `LibraryToolbar`.

---

### 7. PresetPanel

**File:** `src/components/PresetPanel/PresetPanel.tsx`

**Purpose:** Vertical list of preset buttons with radio-style `aria-pressed` behavior.

**ASCII approximation:**

```
┌─────────────────────────┐
│  ◇ Default              │
│  ◆ Thrash Hooks         │  ← active (aria-pressed="true")
│  ◇ Power Ballad        │
│  ◇ Doom Bumper          │
└─────────────────────────┘
```

**`data-part` vocabulary:**

| Selector | Purpose |
|---|---|
| `preset-list` | Root group container |
| `preset-item` | Each button (uses `aria-pressed`) |

**Props interface:**

```ts
interface PresetPanelProps {
  presets: PresetName[];
  activePreset: PresetName | null;
  onSelect: (name: PresetName) => void;
}
```

**CSS patterns used:**

- Same as `stem-button` in `TransportBar`: `aria-pressed` drives active styling
- Hover: `background: var(--je-color-bg)`

**Reuse potential:** ★★★☆☆ — Radio button list pattern. Minor — mostly mining-specific.

**Extraction recommendation:** Merge the pattern into the `SegmentedControl` primitive above if a horizontal variant is needed. Otherwise, leave as-is.

---

### 8. ConfigEditor

**File:** `src/components/ConfigEditor/ConfigEditor.tsx`

**Purpose:** Analysis configuration editor combining a strategy toggle (rhythmic / lyric-aligned), a JSON textarea with live validation, error display, and an action row (Run / Reset).

**ASCII approximation:**

```
┌────────────────────────────────────────────────┐
│  [Rhythmic] [Lyric aligned]                   │
├────────────────────────────────────────────────┤
│  {                                            │
│    "min_dur": 0.5,                           │
│    "max_dur": 4.0,                           │  ← textarea
│    "min_score": 35,                          │
│    "vocal_mode": "vocal"                     │
│  }                                            │
├────────────────────────────────────────────────┤
│  ✗ Unexpected token at line 12                │  ← error bar (on invalid JSON)
├────────────────────────────────────────────────┤
│  [▶ Run Analysis]          [Reset]           │
└────────────────────────────────────────────────┘
```

**`data-part` vocabulary:**

| Selector | Purpose |
|---|---|
| `config-editor` | Root flex column |
| `config-strategy-row` | Button group for candidate mode |
| `config-strategy-button` | Each strategy button |
| `config-textarea` | JSON editor textarea |
| `config-error` | Error message bar |
| `action-row` | Run/Reset button row |
| `run-button` | Primary action (black bg) |
| `reset-button` | Secondary action (white bg) |

**Props interface:**

```ts
interface ConfigEditorProps {
  config: AnalysisConfig;
  onChange: (config: AnalysisConfig) => void;
  onRun: () => void;
  onReset: () => void;
  isLoading?: boolean;
  style?: CSSProperties;
}
```

**CSS patterns used:**

- `config-strategy-row`: flex row, same button style as `stem-button`
- `config-textarea`: `resize: none; white-space: pre; overflow-x: auto; font-family: monospace`
- Error state: textarea inverts colors using `var(--je-dither-checker)` background
- `run-button`: black bg, white text, bold
- `reset-button`: white bg, black text

**Reuse potential:** ★★★☆☆ — The **strategy toggle + form + action row** composition is useful for any configuration panel. The JSON textarea is specific to the mining config. The action row pattern (primary + secondary button) is universally reusable.

**Extraction recommendation:** The `action-row` + button variants are worth extracting into the button system noted above. The `ConfigEditor` itself is mining-specific and can remain unchanged.

---

### 9. Timeline

**File:** `src/components/Timeline/Timeline.tsx`

**Purpose:** SVG canvas showing beat grid, candidate regions (draggable), vocal segments, RMS waveform, and playhead.

**ASCII approximation (simplified):**

```
│ 0s        10s        20s        30s        40s        50s        │
│ │          │          │          │          │          │          │  ← beat grid
│                                                                       │
│    ┌──────────┐                  ┌──────────────┐                    │  ← candidates
│    │ #1 ★ BEST│                  │ #2           │                    │
│    └──────────┘                  └──────────────┘                    │
│                                                                       │
│ ▂▃▅▇█▇▅▃▁▂▃▅▇█▇▅▃▁▂▃▅▇█▇▅▃▁▂▃▅▇█▇▅▃▁▂▃▅▇█▇▅▃▁                    │  ← waveform
│                                                                       │
│              [  spoken words  ]          [  hook phrase  ]             │  ← vocal segs
│                                                                       │
│                              ▼                                         │  ← playhead
```

**`data-part` vocabulary:**

| Selector | Purpose |
|---|---|
| `timeline` | SVG root element |
| `beat-grid` | Beat grid lines group |
| `waveform` | RMS bars group |
| `candidate-region` | Each candidate's region group |
| `candidate-label` | Candidate rank text |
| `candidate-handle` | Draggable left/right edge handles |
| `vocal-region` | Each vocal segment group |
| `vocal-label` | Vocal segment text |
| `playhead` | Playhead line + triangle |

**Props interface:**

```ts
interface TimelineProps {
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

**Reuse potential:** ★★☆☆☆ — Mining-specific SVG canvas. Not directly reusable for the Studio screen.

**Extraction recommendation:** None. Keep as-is. The Studio screen does not need a timeline — it needs track cards.

---

### 10. DebugPanel

**File:** `src/components/DebugPanel/DebugPanel.tsx`

**Purpose:** Side-by-side data tables showing mined candidates and WhisperX lyric segments with overlap highlighting.

**ASCII approximation:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Preset: Thrash Hooks · Mode: vocal · Strategy: lyric_aligned · Dur: 0.5–4.0s │
├─────────────────────────────────┬─────────────────────────────────────────┤
│  Extracted jingles (5)          │  Lyric segments (12)                   │
│  ┌───┬─────┬────┬────┬────┐     │  ┌──┬────┬────┬────┬────────────────┐ │
│  │Rnk│Src  │St  │End │Scr │     │  │ID│St   │End │Vox │Text           │ │
│  ├───┼─────┼────┼────┼────┤     │  ├──┼────┼────┼────┼────────────────┤ │
│  │★1 │hook │39.1│43.1│92  │     │  │ 1│0.0  │2.1 │ 3  │(silence)      │ │
│  │#2 │intro│35.1│39.1│91  │     │  │ 2│2.1  │4.5 │ 5  │Spinning power  │ │
│  │#3 │bridg│45.7│48.2│89  │     │  │...                            │ │
│  └───┴─────┴────┴────┴────┘     │  └──┴────┴────┴────┴────────────────┘ │
└─────────────────────────────────┴─────────────────────────────────────────┘
```

**`data-part` vocabulary:**

| Selector | Purpose |
|---|---|
| `debug-panel` | Root container |
| `debug-summary` | Config summary line |
| `debug-tables` | Two-column grid |
| `debug-section` | Each table section |
| `debug-section-title` | Section header |
| `debug-scroll` | Scrollable table wrapper |
| `debug-table` | HTML table |
| `debug-text` | Long text cell (white-space: normal) |

**Reuse potential:** ★★★☆☆ — The **dual-table debug view** pattern is useful for comparing two related datasets. Not directly needed for the Studio screen, but worth remembering for future comparison features.

**Extraction recommendation:** None for now.

---

## Primitive Extraction Recommendations Summary

### Keep as-is (no changes needed)

| Widget | Reason |
|---|---|
| `MacWindow` | Already well-isolated, directly reusable |
| `ScoreBar` | Already generic, can rename to `MetricBar` later |

### Extract new primitives

| New primitive | Source pattern | Target usage |
|---|---|---|
| `SegmentedControl` | `TransportBar.stem-toggle` / `PresetPanel` | Studio: library filters, generation type toggle |
| `DataList` + `DataListRow` | `CandidateList` row grid | `TrackResultsList`, `TrackLibraryList` |
| `ButtonRow` + `btn-primary` / `btn-secondary` CSS | `CandidateDetail.buttonRow`, `ConfigEditor.actionRow` | All screens |
| `InspectorPanel` (CSS patterns only) | `CandidateDetail` section structure | `TrackInspector` |
| `StudioTopBar` (new component) | Inspired by `MenuBar` | Studio screen header |

### Leave unchanged

| Widget | Reason |
|---|---|
| `Timeline` | Mining-specific |
| `DebugPanel` | Mining-specific |
| `ConfigEditor` | Mining-specific |
| `CandidateDetail` | Mining-specific (patterns extracted to CSS) |

---

## Studio Screen Widget Composition Map

Here is how the extracted primitives recombine to build the Studio screen, referencing the ASCII layout in the parent design doc (`01-minimax-generation-and-track-selection-ux-architecture-and-implementation-guide.md`):

```
StudioScreen
│
├── StudioTopBar                    ← NEW (inspired by MenuBar)
│   └── [Run name] [status] [selected track] [actions]
│
├── LayoutRow
│   │
│   ├── LayoutColumn (42% width)
│   │   ├── MacWindow ("Generate Track Batch")
│   │   │   └── GenerationComposer       ← NEW
│   │   │       ├── TextareaField (prompt)
│   │   │       ├── TextareaField (lyrics)
│   │   │       ├── SegmentedControl (model)
│   │   │       ├── NumberInput (count)
│   │   │       ├── SegmentedControl (vocal/instrumental)  ← SegmentedControl primitive
│   │   │       ├── TextField (prefix)
│   │   │       └── ButtonRow
│   │   │           ├── btn-primary: "Generate batch"
│   │   │           └── btn-secondary: "Save prompt"
│   │   │
│   │   └── MacWindow ("Selected Track Inspector")
│   │       └── TrackInspector           ← NEW (uses InspectorPanel patterns)
│   │           ├── Header: track name, ★ BEST marker
│   │           ├── Section: prompt + lyrics
│   │           ├── Section: status badges
│   │           ├── Section: duration + model
│   │           └── ButtonRow
│   │               ├── btn-secondary: "▶ Preview"
│   │               ├── btn-primary: "Analyze track"
│   │               └── btn-secondary: "Open in Mining"
│   │
│   └── LayoutColumn (58% width)
│       ├── MacWindow ("Current Run / Results")
│       │   ├── RunSummaryBar            ← NEW
│       │   │   └── [Run name] [status] [count progress]
│       │   └── TrackResultsList         ← DataList primitive
│       │       └── DataListRow (per track)
│       │           ├── rank badge
│       │           ├── track name
│       │           ├── duration
│       │           ├── vocal/instrumental badge
│       │           └── action buttons
│       │
│       └── MacWindow ("Library")
│           ├── LibraryToolbar           ← NEW
│           │   ├── Search input
│           │   └── SegmentedControl (filters)  ← SegmentedControl primitive
│           └── TrackLibraryList         ← DataList primitive
│               └── DataListRow (per track)
│                   ├── star/keep badge
│                   ├── track name
│                   ├── source type badge (generated/imported)
│                   ├── status badge
│                   └── actions
```

---

## Shared CSS Partial Recommendations

Extract the following CSS patterns into `src/styles/`:

### `shared/chrome.css`

```css
/* Section label (used in CandidateDetail, TrackInspector, DebugPanel) */
[data-part='section-label'] {
  font-size: var(--je-font-size-sm);
  font-weight: var(--je-font-weight-bold);
  letter-spacing: 1px;
  color: var(--je-color-text);
  margin-bottom: var(--je-space-3);
}

/* Header with bottom border (used in CandidateDetail, Inspector) */
[data-part='panel-header'] {
  padding-bottom: var(--je-space-4);
  border-bottom: var(--je-border-width) solid var(--je-color-border);
}
```

### `shared/buttons.css`

```css
[data-part='btn-primary'] {
  background: var(--je-color-selected);
  color: var(--je-color-selected-text);
  border: var(--je-border-width) solid var(--je-color-border);
  border-radius: var(--je-radius-lg);
  padding: var(--je-space-3) 0;
  font-size: var(--je-font-size-md);
  font-family: var(--je-font-family);
  font-weight: var(--je-font-weight-bold);
  flex: 1;
  cursor: pointer;
}

[data-part='btn-primary']:hover {
  opacity: 0.85;
}

[data-part='btn-secondary'] {
  background: var(--je-color-surface);
  color: var(--je-color-text);
  border: var(--je-border-width) solid var(--je-color-border);
  border-radius: var(--je-radius-lg);
  padding: var(--je-space-3) 0;
  font-size: var(--je-font-size-md);
  font-family: var(--je-font-family);
  flex: 1;
  cursor: pointer;
}

[data-part='btn-secondary']:hover {
  background: var(--je-color-bg);
}
```

### `shared/segmented-control.css`

```css
[data-part='segmented-control'] {
  display: flex;
  gap: var(--je-space-1);
}

[data-part='segmented-btn'] {
  padding: var(--je-space-1) var(--je-space-3);
  background: var(--je-color-surface);
  color: var(--je-color-text);
  border: var(--je-border-width) solid var(--je-color-border);
  border-radius: var(--je-border-radius);
  font-size: var(--je-font-size-sm);
  font-family: var(--je-font-family);
  cursor: pointer;
}

[data-part='segmented-btn'][aria-pressed='true'] {
  background: var(--je-color-selected);
  color: var(--je-color-selected-text);
  font-weight: var(--je-font-weight-bold);
}
```

---

## Parts Registry Additions

When adding new primitives, extend `parts.ts` rather than inventing ad-hoc `data-part` values. Required additions for the Studio screen:

```ts
// New selectors to add to parts.ts
export const PARTS = {
  // ... existing ...

  // ── Shared primitives ───────────────────────────────────────────────
  segmentedControl: 'segmented-control',
  segmentedBtn: 'segmented-btn',
  buttonRow: 'button-row',
  btnPrimary: 'btn-primary',
  btnSecondary: 'btn-secondary',

  // ── Studio screen ──────────────────────────────────────────────────
  studioTopBar: 'studio-top-bar',
  runSummaryBar: 'run-summary-bar',

  // ── Form fields ────────────────────────────────────────────────────
  fieldGroup: 'field-group',
  fieldLabel: 'field-label',
  textareaField: 'textarea-field',
  textField: 'text-field',
  numberInput: 'number-input',

  // ── Track results / library ─────────────────────────────────────────
  trackRow: 'track-row',
  trackBadge: 'track-badge',
  trackStatusBadge: 'track-status-badge',

  // ── Track inspector ────────────────────────────────────────────────
  trackInspector: 'track-inspector',
  inspectorHeader: 'inspector-header',
  inspectorSection: 'inspector-section',
  contextRow: 'context-row',
  contextLabel: 'context-label',
  contextValue: 'context-value',
} as const;
```

---

## Implementation Notes

### Do not overload `parts.ts` prematurely

Add `data-part` selectors only when a CSS rule or a theme consumer actually targets them. Do not add stub entries for components that do not yet need theming.

### Theme compatibility

All three existing themes (retro / light / dark) override `--je-color-*` tokens. The Studio screen primitives must not hardcode any color values — they must rely exclusively on `--je-*` tokens.

### Accessibility requirements

- All interactive elements must have `aria-label` or visible text labels.
- Toggle groups must use `aria-pressed` (for 2–3 options) or `role="radiogroup"` (for 4+).
- Lists must use `role="listbox"` with `role="option"` on rows and `aria-selected`.
- Error states must use `role="alert"`.

These are already correctly implemented in the existing widgets. New Studio screen components must follow the same patterns.
