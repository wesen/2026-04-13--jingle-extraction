import { createSelector } from '@reduxjs/toolkit';
import type { TrackLibraryItem } from '../../api/types';
import type { RootState } from '../../app/store';
import { matchesLibraryStatusFilter } from './status';

export const selectStudioState = (state: RootState) => state.studio;

export const selectStudioDraft = createSelector(
  selectStudioState,
  (studio) => studio.draft
);

export const selectStudioSelection = createSelector(
  selectStudioState,
  (studio) => ({
    selectedTrackId: studio.selectedTrackId,
    selectedRunId: studio.selectedRunId,
    previewTrackId: studio.previewTrackId,
  })
);

export const selectStudioFilters = createSelector(
  selectStudioState,
  (studio) => ({
    librarySearch: studio.librarySearch,
    librarySourceFilter: studio.librarySourceFilter,
    libraryStatusFilter: studio.libraryStatusFilter,
    librarySort: studio.librarySort,
  })
);

export const selectFilteredAndSortedLibraryTracks = createSelector(
  [
    selectStudioFilters,
    (_state: RootState, libraryTracks: TrackLibraryItem[]) => libraryTracks,
  ],
  (filters, libraryTracks) => {
    const filtered = libraryTracks.filter((track) => {
      if (filters.librarySourceFilter !== 'all' && track.source_type !== filters.librarySourceFilter) {
        return false;
      }

      if (!matchesLibraryStatusFilter(track, filters.libraryStatusFilter)) {
        return false;
      }

      if (
        filters.librarySearch
        && !track.display_name.toLowerCase().includes(filters.librarySearch.toLowerCase())
      ) {
        return false;
      }

      return true;
    });

    if (filters.librarySort === 'name') {
      return [...filtered].sort((a, b) => a.display_name.localeCompare(b.display_name));
    }

    if (filters.librarySort === 'oldest') {
      return [...filtered].reverse();
    }

    return filtered;
  }
);
