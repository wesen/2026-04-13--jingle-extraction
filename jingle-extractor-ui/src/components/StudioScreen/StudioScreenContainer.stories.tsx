import type { Meta, StoryObj } from '@storybook/react-vite';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import type { GenerationComposerValue } from '../../api/types';
import { analysisSlice } from '../../features/analysis/analysisSlice';
import { audioSlice } from '../../features/audio/audioSlice';
import {
  setDraft,
  setLibrarySearch,
  setLibrarySort,
  setLibrarySourceFilter,
  setLibraryStatusFilter,
  setPreviewTrackId,
  setSelectedTrackId,
  studioSlice,
} from '../../features/studio/studioSlice';
import {
  currentRunFixture,
  currentRunTracksFixture,
  libraryTracksFixture,
  studioComposerFixture,
} from '../../mocks/fixtures/studio';
import { withWidgetRoot } from '../storybook/widgetStoryDecorators';
import { StudioScreenContainer } from './StudioScreenContainer';

interface StoreSeed {
  draft?: GenerationComposerValue;
  selectedTrackId?: string | null;
  previewTrackId?: string | null;
  librarySearch?: string;
  sourceFilter?: 'all' | 'generated' | 'imported';
  statusFilter?: 'all' | 'pending' | 'generated' | 'analyzed' | 'failed';
  sort?: 'newest' | 'oldest' | 'name';
}

function makeStudioStore(seed: StoreSeed = {}) {
  const store = configureStore({
    reducer: {
      analysis: analysisSlice.reducer,
      audio: audioSlice.reducer,
      studio: studioSlice.reducer,
    },
  });

  if (seed.draft) store.dispatch(setDraft(seed.draft));
  if (seed.selectedTrackId !== undefined) store.dispatch(setSelectedTrackId(seed.selectedTrackId));
  if (seed.previewTrackId !== undefined) store.dispatch(setPreviewTrackId(seed.previewTrackId));
  if (seed.librarySearch !== undefined) store.dispatch(setLibrarySearch(seed.librarySearch));
  if (seed.sourceFilter) store.dispatch(setLibrarySourceFilter(seed.sourceFilter));
  if (seed.statusFilter) store.dispatch(setLibraryStatusFilter(seed.statusFilter));
  if (seed.sort) store.dispatch(setLibrarySort(seed.sort));

  return store;
}

const meta = {
  component: StudioScreenContainer,
  title: 'JingleExtractor/Studio/StudioScreenContainer',
  tags: ['autodocs'],
  args: {
    currentRun: currentRunFixture,
    currentRunTracks: currentRunTracksFixture,
    libraryTracks: libraryTracksFixture,
  },
  parameters: { layout: 'fullscreen' },
  decorators: [withWidgetRoot()],
} satisfies Meta<typeof StudioScreenContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

function StoreBackedScreen({ seed }: { seed?: StoreSeed }) {
  const store = makeStudioStore(seed);
  return (
    <Provider store={store}>
      <StudioScreenContainer
        currentRun={currentRunFixture}
        currentRunTracks={currentRunTracksFixture}
        libraryTracks={libraryTracksFixture}
        onGenerate={() => undefined}
        onSavePrompt={() => undefined}
        onAnalyzeTrack={() => undefined}
        onOpenInMining={() => undefined}
      />
    </Provider>
  );
}

export const Default: Story = {
  render: () => (
    <StoreBackedScreen
      seed={{
        draft: studioComposerFixture,
        selectedTrackId: currentRunTracksFixture[1]?.id ?? null,
      }}
    />
  ),
};

export const FilteredAndPreviewing: Story = {
  render: () => (
    <StoreBackedScreen
      seed={{
        selectedTrackId: 'power_metal_01',
        previewTrackId: 'power_metal_01',
        librarySearch: 'power',
        sourceFilter: 'generated',
        statusFilter: 'analyzed',
        sort: 'name',
      }}
    />
  ),
};
