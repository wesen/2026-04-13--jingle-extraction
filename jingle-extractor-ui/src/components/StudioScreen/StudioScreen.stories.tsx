import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import type {
  GenerationComposerValue,
  LibrarySort,
  LibrarySourceFilter,
  LibraryStatusFilter,
  TrackLibraryItem,
} from '../../api/types';
import {
  currentRunFixture,
  currentRunTracksFixture,
  libraryTracksFixture,
  studioComposerFixture,
} from '../../mocks/fixtures/studio';
import { withWidgetRoot } from '../storybook/widgetStoryDecorators';
import { StudioScreen } from './StudioScreen';

const meta = {
  component: StudioScreen,
  title: 'JingleExtractor/Studio/StudioScreen',
  tags: ['autodocs'],
  args: {
    composerValue: studioComposerFixture,
    onComposerChange: () => undefined,
    onGenerate: () => undefined,
    onSavePrompt: () => undefined,
    isGenerating: false,
    currentRun: currentRunFixture,
    currentRunTracks: currentRunTracksFixture,
    libraryTracks: libraryTracksFixture,
    selectedTrackId: currentRunTracksFixture[1]?.id ?? null,
    previewingTrackId: null,
    librarySearch: '',
    librarySourceFilter: 'all',
    libraryStatusFilter: 'all',
    librarySort: 'newest',
    onLibrarySearchChange: () => undefined,
    onLibrarySourceFilterChange: () => undefined,
    onLibraryStatusFilterChange: () => undefined,
    onLibrarySortChange: () => undefined,
    onSelectTrack: () => undefined,
    onPreviewTrack: () => undefined,
    onAnalyzeTrack: () => undefined,
    onOpenInMining: () => undefined,
  },
  parameters: { layout: 'fullscreen' },
  decorators: [withWidgetRoot()],
} satisfies Meta<typeof StudioScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

function sortTracks(tracks: TrackLibraryItem[], sort: LibrarySort) {
  if (sort === 'name') return [...tracks].sort((a, b) => a.display_name.localeCompare(b.display_name));
  if (sort === 'oldest') return [...tracks].reverse();
  return tracks;
}

function ControlledStudio() {
  const [composer, setComposer] = useState<GenerationComposerValue>(studioComposerFixture);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(currentRunTracksFixture[1]?.id ?? null);
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<LibrarySourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>('all');
  const [sort, setSort] = useState<LibrarySort>('newest');

  const filteredLibrary = useMemo(() => {
    const filtered = libraryTracksFixture.filter((track) => {
      if (sourceFilter !== 'all' && track.source_type !== sourceFilter) return false;
      if (search && !track.display_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all') {
        const derived = track.analysis_status === 'complete'
          ? 'analyzed'
          : track.analysis_status && track.analysis_status !== 'not_started'
            ? track.analysis_status
            : track.generation_status ?? 'pending';
        if (derived !== statusFilter) return false;
      }
      return true;
    });
    return sortTracks(filtered, sort);
  }, [search, sourceFilter, statusFilter, sort]);

  return (
    <StudioScreen
      composerValue={composer}
      onComposerChange={setComposer}
      onGenerate={() => undefined}
      onSavePrompt={() => undefined}
      currentRun={currentRunFixture}
      currentRunTracks={currentRunTracksFixture}
      libraryTracks={filteredLibrary}
      selectedTrackId={selectedTrackId}
      previewingTrackId={previewingTrackId}
      librarySearch={search}
      librarySourceFilter={sourceFilter}
      libraryStatusFilter={statusFilter}
      librarySort={sort}
      onLibrarySearchChange={setSearch}
      onLibrarySourceFilterChange={setSourceFilter}
      onLibraryStatusFilterChange={setStatusFilter}
      onLibrarySortChange={setSort}
      onSelectTrack={(track) => setSelectedTrackId(track.id)}
      onPreviewTrack={(track) => setPreviewingTrackId((prev) => (prev === track.id ? null : track.id))}
      onAnalyzeTrack={() => undefined}
      onOpenInMining={() => undefined}
    />
  );
}

export const Default: Story = {
  render: () => <ControlledStudio />,
};

export const GeneratingRun: Story = {
  render: () => (
    <StudioScreen
      composerValue={studioComposerFixture}
      onComposerChange={() => undefined}
      onGenerate={() => undefined}
      isGenerating
      currentRun={{ ...currentRunFixture, status: 'generating', countCompleted: 2 }}
      currentRunTracks={currentRunTracksFixture}
      libraryTracks={libraryTracksFixture}
      selectedTrackId={currentRunTracksFixture[0]?.id ?? null}
      previewingTrackId={null}
      librarySearch=""
      librarySourceFilter="all"
      libraryStatusFilter="all"
      librarySort="newest"
      onLibrarySearchChange={() => undefined}
      onLibrarySourceFilterChange={() => undefined}
      onLibraryStatusFilterChange={() => undefined}
      onLibrarySortChange={() => undefined}
      onSelectTrack={() => undefined}
      onPreviewTrack={() => undefined}
      onAnalyzeTrack={() => undefined}
      onOpenInMining={() => undefined}
    />
  ),
};
