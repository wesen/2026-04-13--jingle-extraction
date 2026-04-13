/**
 * parts.ts — Stable `data-part` name constants for JingleExtractor widget.
 *
 * These are the ONLY selectors that theme consumers should target.
 * Format: [data-part="..."] on the root [data-widget="jingle-extractor"].
 *
 * Part hierarchy:
 *   root
 *   ├── menu-bar
 *   ├── sidebar
 *   │   ├── preset-panel
 *   │   │   ├── preset-list
 *   │   │   └── preset-item
 *   │   └── config-editor
 *   │       ├── config-textarea
 *   │       ├── config-error
 *   │       └── action-row
 *   │           ├── run-button
 *   │           └── reset-button
 *   ├── main-panel
 *   │   ├── transport-bar
 *   │   │   ├── stem-toggle
 *   │   │   ├── stem-button
 *   │   │   ├── time-display
 *   │   │   └── transport-controls
 *   │   │       └── transport-btn
 *   │   ├── timeline
 *   │   │   ├── beat-grid
 *   │   │   ├── waveform
 *   │   │   ├── candidate-region
 *   │   │   ├── candidate-label
 *   │   │   ├── candidate-handle
 *   │   │   ├── vocal-region
 *   │   │   ├── vocal-label
 *   │   │   └── playhead
 *   │   └── bottom-panel
 *   │       ├── candidate-list
 *   │       │   └── candidate-row
 *   │       └── candidate-detail
 *   │           ├── quality-panel
 *   │           │   └── score-bar
 *   │           │       └── score-bar-block
 *   │           ├── context-panel
 *   │           │   └── context-item
 *   │           └── button-row
 *   │               ├── preview-button
 *   │               └── export-button
 */

export const WIDGET = 'jingle-extractor' as const;

export const PARTS = {
  // Root
  root: 'root',

  // Menu bar
  menuBar: 'menu-bar',

  // Sidebar
  sidebar: 'sidebar',
  presetPanel: 'preset-panel',
  presetList: 'preset-list',
  presetItem: 'preset-item',
  configEditor: 'config-editor',
  configTextarea: 'config-textarea',
  configError: 'config-error',
  actionRow: 'action-row',
  runButton: 'run-button',
  resetButton: 'reset-button',

  // Main panel
  mainPanel: 'main-panel',
  transportBar: 'transport-bar',
  stemToggle: 'stem-toggle',
  stemButton: 'stem-button',
  timeDisplay: 'time-display',
  transportControls: 'transport-controls',
  transportBtn: 'transport-btn',

  // Timeline
  timeline: 'timeline',
  beatGrid: 'beat-grid',
  waveform: 'waveform',
  candidateRegion: 'candidate-region',
  candidateLabel: 'candidate-label',
  candidateHandle: 'candidate-handle',
  vocalRegion: 'vocal-region',
  vocalLabel: 'vocal-label',
  playhead: 'playhead',

  // Bottom panel
  bottomPanel: 'bottom-panel',
  candidateList: 'candidate-list',
  candidateRow: 'candidate-row',
  candidateDetail: 'candidate-detail',
  qualityPanel: 'quality-panel',
  scoreBar: 'score-bar',
  scoreBarBlock: 'score-bar-block',
  contextPanel: 'context-panel',
  contextItem: 'context-item',
  buttonRow: 'button-row',
  previewButton: 'preview-button',
  exportButton: 'export-button',
} as const;

export type PartName = (typeof PARTS)[keyof typeof PARTS];
