/**
 * constants.ts — Default presets and application constants.
 */

import type { AnalysisConfig, Presets } from '../api/types';

export const DEFAULT_PRESETS: Presets = {
  Default: {
    min_dur: 2.0,
    max_dur: 4.5,
    min_score: 75,
    vocal_mode: 'inst',
    atk_w: 6,
    end_w: 4,
    nrg_w: 3,
    beat_w: 3,
    max_cand: 5,
    fade_in: 8,
    fade_out: 18,
    fmt: 'mp3',
    br: 192,
  },
  'Short Stings': {
    min_dur: 1.0,
    max_dur: 2.5,
    min_score: 80,
    vocal_mode: 'any',
    atk_w: 8,
    end_w: 5,
    nrg_w: 4,
    beat_w: 2,
    max_cand: 8,
    fade_in: 4,
    fade_out: 10,
    fmt: 'mp3',
    br: 192,
  },
  'Long Beds': {
    min_dur: 4.0,
    max_dur: 8.0,
    min_score: 60,
    vocal_mode: 'inst',
    atk_w: 2,
    end_w: 2,
    nrg_w: 5,
    beat_w: 4,
    max_cand: 3,
    fade_in: 50,
    fade_out: 100,
    fmt: 'wav',
    br: null,
  },
  'Vocal Hooks': {
    min_dur: 0.5,
    max_dur: 4.0,
    min_score: 70,
    vocal_mode: 'vocal',
    atk_w: 3,
    end_w: 3,
    nrg_w: 2,
    beat_w: 1,
    max_cand: 10,
    fade_in: 4,
    fade_out: 8,
    fmt: 'mp3',
    br: 320,
  },
};

export const DEFAULT_CONFIG: AnalysisConfig = DEFAULT_PRESETS.Default;
