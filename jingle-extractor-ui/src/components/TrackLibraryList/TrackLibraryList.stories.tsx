import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import type { LibrarySort, LibrarySourceFilter, LibraryStatusFilter, TrackLibraryItem } from '../../api/types';
import { libraryTracksFixture } from '../../mocks/fixtures/studio';
import { matchesLibraryStatusFilter } from '../../features/studio/status';
import { withWidgetWindow } from '../storybook/widgetStoryDecorators';
import { TrackLibraryList } from './TrackLibraryList';

const meta = {
  component: TrackLibraryList,
  title: 'JingleExtractor/Studio/TrackLibraryList',
  tags: ['autodocs'],
  args: {
    tracks: libraryTracksFixture,
    selectedId: libraryTracksFixture[1]?.id ?? null,
    previewingId: null,
    search: '',
    sourceFilter: 'all',
    statusFilter: 'all',
    sort: 'newest',
    onSearchChange: () => undefined,
    onSourceFilterChange: () => undefined,
    onStatusFilterChange: () => undefined,
    onSortChange: () => undefined,
    onSelect: () => undefined,
    onPreview: () => undefined,
    onAnalyze: () => undefined,
  },
  parameters: { layout: 'padded' },
  decorators: [withWidgetWindow({ title: 'Library', style: { padding: 8, maxWidth: 820 } })],
} satisfies Meta<typeof TrackLibraryList>;

export default meta;
type Story = StoryObj<typeof meta>;

function sortTracks(tracks: TrackLibraryItem[], sort: LibrarySort) {
  if (sort === 'name') return [...tracks].sort((a, b) => a.display_name.localeCompare(b.display_name));
  if (sort === 'oldest') return [...tracks].reverse();
  return tracks;
}

function ControlledLibrary() {
  const [selected, setSelected] = useState<string | null>(libraryTracksFixture[1]?.id ?? null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<LibrarySourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>('all');
  const [sort, setSort] = useState<LibrarySort>('newest');

  const tracks = useMemo(() => {
    const filtered = libraryTracksFixture.filter((track) => {
      if (sourceFilter !== 'all' && track.source_type !== sourceFilter) return false;
      if (!matchesLibraryStatusFilter(track, statusFilter)) return false;
      if (search && !track.display_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return sortTracks(filtered, sort);
  }, [search, sourceFilter, sort, statusFilter]);

  return (
    <TrackLibraryList
      tracks={tracks}
      selectedId={selected}
      previewingId={previewing}
      search={search}
      sourceFilter={sourceFilter}
      statusFilter={statusFilter}
      sort={sort}
      onSearchChange={setSearch}
      onSourceFilterChange={setSourceFilter}
      onStatusFilterChange={setStatusFilter}
      onSortChange={setSort}
      onSelect={(track) => setSelected(track.id)}
      onPreview={(track) => setPreviewing((prev) => (prev === track.id ? null : track.id))}
      onAnalyze={() => undefined}
    />
  );
}

export const Default: Story = {
  render: () => <ControlledLibrary />,
};
