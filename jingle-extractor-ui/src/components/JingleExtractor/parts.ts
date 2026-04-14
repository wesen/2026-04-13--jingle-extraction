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

  // ── Preset panel ────────────────────────────────────────────────────────
  presetPanel: 'preset-panel',
  presetList: 'preset-list',
  presetItem: 'preset-item',

  // ── Config editor ───────────────────────────────────────────────────────
  configEditor: 'config-editor',
  configTextarea: 'config-textarea',
  configError: 'config-error',
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

  // ── Action buttons ──────────────────────────────────────────────────────
  buttonRow: 'button-row',
  previewButton: 'preview-button',
  exportButton: 'export-button',
} as const;

export type PartName = (typeof PARTS)[keyof typeof PARTS];
