/**
 * parts.ts — Stable `data-part` name constants for JingleExtractor widget.
 *
 * These are the ONLY selectors that theme consumers should target.
 * Format: [data-part="..."] on the root [data-widget="jingle-extractor"].
 */

export const WIDGET = 'jingle-extractor' as const;

export const PARTS = {
  // ── MacWindow ──────────────────────────────────────────────────────────
  window: 'window',
  windowButton: 'window-button',
  titleBar: 'title-bar',
  titleBarLeft: 'title-bar-left',
  titleText: 'title-text',
  titleBarRight: 'title-bar-right',
  windowBody: 'window-body',

  // ── Root / layout ──────────────────────────────────────────────────────
  root: 'root',
  menuBar: 'menu-bar',
  menuLogo: 'menu-logo',
  menuItem: 'menu-item',
  menuSpacer: 'menu-spacer',
  trackInfo: 'track-info',
  trackBadge: 'track-badge',
  sidebar: 'sidebar',
  mainLayout: 'main-layout',
  mainPanel: 'main-panel',
  bottomPanel: 'bottom-panel',
  studioScreen: 'studio-screen',
  studioLayout: 'studio-layout',
  studioColumn: 'studio-column',
  studioWindowStack: 'studio-window-stack',

  // ── Preset panel ────────────────────────────────────────────────────────
  presetPanel: 'preset-panel',
  presetList: 'preset-list',
  presetItem: 'preset-item',

  // ── Config editor ───────────────────────────────────────────────────────
  configEditor: 'config-editor',
  configTextarea: 'config-textarea',
  configError: 'config-error',
  configStrategyRow: 'config-strategy-row',
  configStrategyButton: 'config-strategy-button',
  actionRow: 'action-row',
  runButton: 'run-button',
  resetButton: 'reset-button',

  // ── Transport bar ───────────────────────────────────────────────────────
  transportBar: 'transport-bar',
  transportSpacer: 'transport-spacer',
  stemToggle: 'stem-toggle',
  stemButton: 'stem-button',
  timeDisplay: 'time-display',
  timeDisplayTotal: 'time-display-total',
  transportControls: 'transport-controls',
  transportBtn: 'transport-btn',

  // ── Timeline ────────────────────────────────────────────────────────────
  timeline: 'timeline',
  beatGrid: 'beat-grid',
  waveform: 'waveform',
  candidateRegion: 'candidate-region',
  candidateLabel: 'candidate-label',
  candidateHandle: 'candidate-handle',
  vocalRegion: 'vocal-region',
  vocalLabel: 'vocal-label',
  playhead: 'playhead',

  // ── Candidate list ─────────────────────────────────────────────────────
  candidateList: 'candidate-list',
  candidateRow: 'candidate-row',
  candidateRank: 'candidate-rank',
  candidateTitle: 'candidate-title',
  candidateTime: 'candidate-time',
  candidateDuration: 'candidate-duration',
  candidateScore: 'candidate-score',
  candidateBadge: 'candidate-badge',
  candidatePreviewBtn: 'candidate-preview-btn',

  // ── Candidate detail ─────────────────────────────────────────────────────
  candidateDetail: 'candidate-detail',
  detailHeader: 'detail-header',
  detailTitle: 'detail-title',
  detailSubtitle: 'detail-subtitle',
  qualityPanel: 'quality-panel',
  sectionLabel: 'section-label',
  overallScore: 'overall-score',
  overallLabel: 'overall-label',
  overallValue: 'overall-value',
  contextPanel: 'context-panel',
  contextItem: 'context-item',
  contextLabel: 'context-label',
  contextValue: 'context-value',

  // ── Score bar ───────────────────────────────────────────────────────────
  scoreBar: 'score-bar',
  scoreBarLabel: 'score-bar-label',
  scoreBarTrack: 'score-bar-track',
  scoreBarBlock: 'score-bar-block',

  // ── Debug panel ─────────────────────────────────────────────────────────
  debugPanel: 'debug-panel',
  debugSummary: 'debug-summary',
  debugTables: 'debug-tables',
  debugSection: 'debug-section',
  debugSectionTitle: 'debug-section-title',
  debugScroll: 'debug-scroll',
  debugTable: 'debug-table',
  debugText: 'debug-text',

  // ── Action buttons ──────────────────────────────────────────────────────
  buttonRow: 'button-row',
  previewButton: 'preview-button',
  exportButton: 'export-button',

  // ══ Shared primitives ════════════════════════════════════════════════════
  // These are consumed by extracted reusable components (SegmentedControl,
  // DataList, etc.) and may also be used by domain components.

  // ── Segmented control ──────────────────────────────────────────────────
  segmentedControl: 'segmented-control',
  segmentedBtn: 'segmented-btn',

  // ── Data list ──────────────────────────────────────────────────────────
  dataList: 'data-list',
  dataListRow: 'data-list-row',
  dataListCell: 'data-list-cell',
  dataListBadge: 'data-list-badge',
  dataListActionBtn: 'data-list-action-btn',

  // ── Button variants (shared) ───────────────────────────────────────────
  btnPrimary: 'btn-primary',
  btnSecondary: 'btn-secondary',
  btnDanger: 'btn-danger',
  btnIcon: 'btn-icon',

  // ── Form field primitives ──────────────────────────────────────────────
  fieldGroup: 'field-group',
  fieldLabel: 'field-label',
  fieldError: 'field-error',
  textareaField: 'textarea-field',
  textField: 'text-field',
  numberField: 'number-field',

  // ── Panel / inspector sections ─────────────────────────────────────────
  panelHeader: 'panel-header',
  panelSection: 'panel-section',
  panelSectionLabel: 'panel-section-label',
  panelRow: 'panel-row',
  panelRowLabel: 'panel-row-label',
  panelRowValue: 'panel-row-value',

  // ── Status / info badges ────────────────────────────────────────────────
  statusBadge: 'status-badge',
  sourceBadge: 'source-badge',
  keepBadge: 'keep-badge',

  // ── Studio widgets ─────────────────────────────────────────────────────
  generationComposer: 'generation-composer',
  composerGrid: 'composer-grid',
  composerActions: 'composer-actions',
  fieldHint: 'field-hint',
  libraryToolbar: 'library-toolbar',
  trackInspector: 'track-inspector',
  trackInspectorSummary: 'track-inspector-summary',
  trackResultsList: 'track-results-list',
  trackLibraryList: 'track-library-list',
  runSummaryBar: 'run-summary-bar',
  runSummaryMetric: 'run-summary-metric',
  runSummaryLabel: 'run-summary-label',
  runSummaryValue: 'run-summary-value',
} as const;

export type PartName = (typeof PARTS)[keyof typeof PARTS];
