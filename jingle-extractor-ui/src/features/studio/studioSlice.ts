/**
 * studioSlice.ts — Local UI state for the Studio screen.
 *
 * This state is intentionally separate from the mining-oriented analysisSlice.
 * The Studio screen owns generation-form drafts, current run selection, library
 * filters, and the selected track that may later be opened in the mining view.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  GenerationComposerValue,
  LibrarySort,
  LibrarySourceFilter,
  LibraryStatusFilter,
  StudioScreen,
} from '../../api/types';

export interface StudioState {
  activeScreen: StudioScreen;
  selectedTrackId: string | null;
  selectedRunId: string | null;
  previewTrackId: string | null;
  draft: GenerationComposerValue;
  librarySearch: string;
  librarySourceFilter: LibrarySourceFilter;
  libraryStatusFilter: LibraryStatusFilter;
  librarySort: LibrarySort;
}

export const initialStudioDraft: GenerationComposerValue = {
  prompt: 'Death/thrash metal stings with a chantable hook, aggressive guitars, 170 BPM',
  lyrics: '[Hook]\nSpinning power / burning fast',
  model: 'music-2.6',
  count: 4,
  mode: 'vocal',
  namingPrefix: 'thrash_hook',
};

const initialState: StudioState = {
  activeScreen: 'studio',
  selectedTrackId: null,
  selectedRunId: null,
  previewTrackId: null,
  draft: initialStudioDraft,
  librarySearch: '',
  librarySourceFilter: 'all',
  libraryStatusFilter: 'all',
  librarySort: 'newest',
};

const studioSlice = createSlice({
  name: 'studio',
  initialState,
  reducers: {
    setActiveScreen(state, action: PayloadAction<StudioScreen>) {
      state.activeScreen = action.payload;
    },
    setSelectedTrackId(state, action: PayloadAction<string | null>) {
      state.selectedTrackId = action.payload;
    },
    setSelectedRunId(state, action: PayloadAction<string | null>) {
      state.selectedRunId = action.payload;
    },
    setPreviewTrackId(state, action: PayloadAction<string | null>) {
      state.previewTrackId = action.payload;
    },
    setDraft(state, action: PayloadAction<GenerationComposerValue>) {
      state.draft = action.payload;
    },
    updateDraftField(
      state,
      action: PayloadAction<{ key: keyof GenerationComposerValue; value: GenerationComposerValue[keyof GenerationComposerValue] }>
    ) {
      (state.draft as Record<string, string | number>)[action.payload.key] = action.payload.value;
    },
    resetDraft(state) {
      state.draft = initialStudioDraft;
    },
    setLibrarySearch(state, action: PayloadAction<string>) {
      state.librarySearch = action.payload;
    },
    setLibrarySourceFilter(state, action: PayloadAction<LibrarySourceFilter>) {
      state.librarySourceFilter = action.payload;
    },
    setLibraryStatusFilter(state, action: PayloadAction<LibraryStatusFilter>) {
      state.libraryStatusFilter = action.payload;
    },
    setLibrarySort(state, action: PayloadAction<LibrarySort>) {
      state.librarySort = action.payload;
    },
    resetStudioState() {
      return initialState;
    },
  },
});

export const {
  setActiveScreen,
  setSelectedTrackId,
  setSelectedRunId,
  setPreviewTrackId,
  setDraft,
  updateDraftField,
  resetDraft,
  setLibrarySearch,
  setLibrarySourceFilter,
  setLibraryStatusFilter,
  setLibrarySort,
  resetStudioState,
} = studioSlice.actions;

export { studioSlice };
