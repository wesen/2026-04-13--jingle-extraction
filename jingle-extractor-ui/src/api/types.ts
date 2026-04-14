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

export interface TimelineData {
  duration: number; // seconds
  beats: number[]; // timestamps in seconds
  rms: number[]; // energy values, one per hop
  onsets?: number[]; // onset timestamps (optional)
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
  vocal_overlap: boolean;
  best: boolean; // true for the single top-ranked candidate
}

export interface CandidateQuality {
  attack: number;
  ending: number;
  energy: number;
}

// ─── Analysis Configuration ─────────────────────────────────────────────────

export type VocalMode = 'any' | 'inst' | 'vocal';
export type ExportFormat = 'mp3' | 'wav';

export interface AnalysisConfig {
  min_dur: number; // seconds
  max_dur: number; // seconds
  min_score: number; // 0–100
  vocal_mode: VocalMode;
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
