/**
 * analysisSlice.ts — Local UI state for the analysis panel.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AnalysisConfig, PresetName, StemType, ThemeId } from '../../api/types';
import { DEFAULT_CONFIG } from '../../utils/constants';

interface AnalysisState {
  selectedCandidateId: number | null;
  playhead: number; // seconds
  stem: StemType;
  activePreset: PresetName | null;
  config: AnalysisConfig;
  theme: ThemeId;
  // User drag overrides — keyed by candidate id
  editedCandidates: Record<number, { start?: number; end?: number }>;
}

const initialState: AnalysisState = {
  selectedCandidateId: null,
  playhead: 0,
  stem: 'inst',
  activePreset: null,
  config: DEFAULT_CONFIG,
  theme: 'retro',
  editedCandidates: {},
};

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    setSelectedCandidate(state, action: PayloadAction<number | null>) {
      state.selectedCandidateId = action.payload;
    },
    setPlayhead(state, action: PayloadAction<number>) {
      state.playhead = action.payload;
    },
    setStem(state, action: PayloadAction<StemType>) {
      state.stem = action.payload;
    },
    setActivePreset(state, action: PayloadAction<PresetName | null>) {
      state.activePreset = action.payload;
    },
    setConfig(state, action: PayloadAction<AnalysisConfig>) {
      state.config = action.payload;
      // Clear preset selection when manually editing config
      state.activePreset = null;
    },
    setTheme(state, action: PayloadAction<ThemeId>) {
      state.theme = action.payload;
    },
    applyPreset(state, action: PayloadAction<{ name: PresetName; config: AnalysisConfig }>) {
      state.activePreset = action.payload.name;
      state.config = action.payload.config;
    },
    updateCandidateStart(
      state,
      action: PayloadAction<{ id: number; start: number }>
    ) {
      const { id, start } = action.payload;
      if (!state.editedCandidates[id]) {
        state.editedCandidates[id] = {};
      }
      state.editedCandidates[id].start = start;
    },
    updateCandidateEnd(
      state,
      action: PayloadAction<{ id: number; end: number }>
    ) {
      const { id, end } = action.payload;
      if (!state.editedCandidates[id]) {
        state.editedCandidates[id] = {};
      }
      state.editedCandidates[id].end = end;
    },
    clearCandidateEdit(state, action: PayloadAction<number>) {
      delete state.editedCandidates[action.payload];
    },
    resetAll(state) {
      state.selectedCandidateId = null;
      state.playhead = 0;
      state.stem = 'inst';
      state.activePreset = null;
      state.config = DEFAULT_CONFIG;
      state.editedCandidates = {};
    },
  },
});

export const {
  setSelectedCandidate,
  setPlayhead,
  setStem,
  setActivePreset,
  setConfig,
  setTheme,
  applyPreset,
  updateCandidateStart,
  updateCandidateEnd,
  clearCandidateEdit,
  resetAll,
} = analysisSlice.actions;

export { analysisSlice };
export type { AnalysisState };
