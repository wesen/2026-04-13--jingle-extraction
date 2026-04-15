import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type {
  GenerationComposerValue,
  GenerationRunSummary,
  TrackLibraryItem,
} from '../../api/types';
import type { AppDispatch, RootState } from '../../app/store';
import {
  selectFilteredAndSortedLibraryTracks,
  selectStudioDraft,
  selectStudioFilters,
  selectStudioSelection,
} from '../../features/studio/selectors';
import {
  setDraft,
  setLibrarySearch,
  setLibrarySort,
  setLibrarySourceFilter,
  setLibraryStatusFilter,
  setPreviewTrackId,
  setSelectedRunId,
  setSelectedTrackId,
} from '../../features/studio/studioSlice';
import { StudioScreen } from './StudioScreen';

interface StudioScreenContainerProps {
  currentRun: GenerationRunSummary | null;
  currentRunTracks: TrackLibraryItem[];
  libraryTracks: TrackLibraryItem[];
  onGenerate?: (draft: GenerationComposerValue) => void;
  onSavePrompt?: (draft: GenerationComposerValue) => void;
  onPreviewTrack?: (track: TrackLibraryItem) => void;
  onAnalyzeTrack?: (track: TrackLibraryItem) => void;
  onOpenInMining?: (track: TrackLibraryItem) => void;
  isGenerating?: boolean;
}

export function StudioScreenContainer({
  currentRun,
  currentRunTracks,
  libraryTracks,
  onGenerate,
  onSavePrompt,
  onPreviewTrack,
  onAnalyzeTrack,
  onOpenInMining,
  isGenerating = false,
}: StudioScreenContainerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const draft = useSelector(selectStudioDraft);
  const selection = useSelector(selectStudioSelection);
  const filters = useSelector(selectStudioFilters);
  const filteredLibrary = useSelector((state: RootState) =>
    selectFilteredAndSortedLibraryTracks(state, libraryTracks)
  );

  useEffect(() => {
    dispatch(setSelectedRunId(currentRun?.id ?? null));
  }, [currentRun?.id, dispatch]);

  return (
    <StudioScreen
      composerValue={draft}
      onComposerChange={(value) => dispatch(setDraft(value))}
      onGenerate={() => onGenerate?.(draft)}
      onSavePrompt={onSavePrompt ? () => onSavePrompt(draft) : undefined}
      isGenerating={isGenerating}
      currentRun={currentRun}
      currentRunTracks={currentRunTracks}
      libraryTracks={filteredLibrary}
      selectedTrackId={selection.selectedTrackId}
      previewingTrackId={selection.previewTrackId}
      librarySearch={filters.librarySearch}
      librarySourceFilter={filters.librarySourceFilter}
      libraryStatusFilter={filters.libraryStatusFilter}
      librarySort={filters.librarySort}
      onLibrarySearchChange={(value) => dispatch(setLibrarySearch(value))}
      onLibrarySourceFilterChange={(value) => dispatch(setLibrarySourceFilter(value))}
      onLibraryStatusFilterChange={(value) => dispatch(setLibraryStatusFilter(value))}
      onLibrarySortChange={(value) => dispatch(setLibrarySort(value))}
      onSelectTrack={(track) => dispatch(setSelectedTrackId(track.id))}
      onPreviewTrack={(track) => {
        const next = selection.previewTrackId === track.id ? null : track.id;
        dispatch(setPreviewTrackId(next));
        onPreviewTrack?.(track);
      }}
      onAnalyzeTrack={(track) => onAnalyzeTrack?.(track)}
      onOpenInMining={(track) => onOpenInMining?.(track)}
    />
  );
}
