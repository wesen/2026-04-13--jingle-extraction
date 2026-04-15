// ─── Track & Timeline ──────────────────────────────────────────────────────

export interface Track {
  id: string;
  duration: number; // seconds
  bpm: number;
  language: string; // ISO code, e.g. "en"
  lang_conf: number; // 0.0–1.0
  sr: number; // sample rate, e.g. 44100
  dr_db: number; // dynamic range in dB
}

export interface StemWaveforms {
  orig?: number[];
  inst?: number[];
  vox?: number[];
}

export interface TimelineData {
  duration: number; // seconds
  beats: number[]; // timestamps in seconds
  rms: number[]; // energy values, one per hop (backwards compatible default)
  onsets?: number[]; // onset timestamps (optional)
  waveforms?: StemWaveforms;
}

// ─── Transcription ───────────────────────────────────────────────────────────

export interface VocalWord {
  word: string;
  start: number; // seconds
  end: number; // seconds
  score: number; // 0.0–1.0 from wav2vec2 alignment
}

export interface VocalSegment {
  id: number;
  start: number;
  end: number;
  text: string; // joined words
  conf: number; // 0.0–1.0 average confidence
  words?: VocalWord[]; // optional per-word breakdown
}

export interface VocalsData {
  segments: VocalSegment[];
}

// ─── Candidates ─────────────────────────────────────────────────────────────

export interface Candidate {
  id: number;
  rank: number; // 1 = best, 2 = second-best, …
  start: number; // seconds
  end: number; // seconds
  score: number; // 0–100
  attack: number; // 0–100 quality score
  ending: number; // 0–100 quality score
  energy: number; // 0–100 quality score
  phrase_score?: number | null;
  vocal_overlap: boolean;
  best: boolean; // true for the single top-ranked candidate
  source_kind?: string | null;
  source_segment_id?: number | null;
  source_text?: string | null;
  source_start?: number | null;
  source_end?: number | null;
}

export interface CandidateQuality {
  attack: number;
  ending: number;
  energy: number;
}

// ─── Analysis Configuration ─────────────────────────────────────────────────

export type VocalMode = 'any' | 'inst' | 'vocal';
export type ExportFormat = 'mp3' | 'wav';
export type CandidateMode = 'rhythmic' | 'lyric_aligned';

export interface AnalysisConfig {
  min_dur: number; // seconds
  max_dur: number; // seconds
  min_score: number; // 0–100
  vocal_mode: VocalMode;
  candidate_mode: CandidateMode;
  lyric_padding_before: number; // seconds
  lyric_padding_after: number; // seconds
  atk_w: number; // attack weight
  end_w: number; // ending weight
  nrg_w: number; // energy weight
  beat_w: number; // beat alignment weight
  max_cand: number;
  fade_in: number; // milliseconds
  fade_out: number; // milliseconds
  fmt: ExportFormat;
  br: number | null; // bitrate in kbps (null for WAV)
}

export type PresetName = 'Default' | 'Short Stings' | 'Long Beds' | 'Vocal Hooks';
export type Presets = Record<PresetName, AnalysisConfig>;

// ─── Full API Responses ─────────────────────────────────────────────────────

export interface AnalysisResponse {
  track: Track;
  timeline: TimelineData;
  vocals: VocalsData;
  candidates: Candidate[];
}

export type AnalysisStatus =
  | 'not_started'
  | 'uploaded'
  | 'separating_stems'
  | 'transcribing'
  | 'analyzing_rhythm'
  | 'mining_candidates'
  | 'complete'
  | 'failed';

export interface AnalyzeAcceptedResponse {
  track_id: string;
  status: AnalysisStatus;
}

export interface DeleteCandidateResponse {
  ok: boolean;
  deleted_candidate_id: number;
}

export interface AnalysisPendingResponse {
  track_id: string;
  status: AnalysisStatus;
  error_message?: string | null;
}

export type GetAnalysisResponse = AnalysisResponse | AnalysisPendingResponse;

export function isAnalysisCompleteResponse(
  value: GetAnalysisResponse | undefined
): value is AnalysisResponse {
  return !!value && 'track' in value;
}

// ─── Studio / Generation ─────────────────────────────────────────────────────

export type StudioScreen = 'studio' | 'mining';
export type GenerationMode = 'vocal' | 'instrumental';
export type GenerationRunStatus = 'queued' | 'generating' | 'complete' | 'partial_failed' | 'failed';
export type TrackSourceType = 'generated' | 'imported';
export type TrackGenerationStatus = 'queued' | 'generating' | 'generated' | 'failed';
export type TrackDecision = 'pending' | 'keep' | 'reject';
export type TrackAnalysisStatus = AnalysisStatus | 'not_started';
export type LibrarySourceFilter = 'all' | TrackSourceType;
export type LibraryStatusFilter = 'all' | 'pending' | 'generated' | 'analyzed' | 'failed';
export type LibrarySort = 'newest' | 'oldest' | 'name';

export interface GenerationComposerValue {
  prompt: string;
  lyrics: string;
  model: string;
  count: number;
  mode: GenerationMode;
  namingPrefix: string;
}

export interface GenerationRunSummary {
  id: string;
  name: string;
  prompt: string;
  lyrics?: string | null;
  model: string;
  mode: GenerationMode;
  countRequested: number;
  countCompleted: number;
  status: GenerationRunStatus;
  createdAt?: string;
}

export interface CreateGenerationAcceptedResponse {
  generation_id: string;
  status: GenerationRunStatus;
  count_requested: number;
}

export interface GenerationRunDetailResponse extends GenerationRunSummary {
  error_message?: string | null;
  tracks: TrackLibraryItem[];
}

export interface TrackLibraryItem {
  id: string;
  display_name: string;
  duration: number | null;
  source_type: TrackSourceType;
  generation_run_id?: string | null;
  variant_index?: number | null;
  generation_status?: TrackGenerationStatus | null;
  analysis_status?: TrackAnalysisStatus | null;
  prompt_snapshot?: string | null;
  lyrics_snapshot?: string | null;
  instrumental_requested?: boolean | null;
  minimax_model?: string | null;
  decision?: TrackDecision | null;
}

// ─── Stem / Audio ────────────────────────────────────────────────────────────

export type StemType = 'orig' | 'inst' | 'vox';

// ─── UI State (not from API) ────────────────────────────────────────────────

export type ThemeId = 'retro' | 'dark' | 'light';

export interface UIState {
  selectedCandidateId: number | null;
  playhead: number; // seconds
  stem: StemType;
  activePreset: PresetName | null;
  config: AnalysisConfig;
  // User drag adjustments override server-provided start/end
  editedCandidates: Record<
    number,
    { start?: number; end?: number }
  >;
}
