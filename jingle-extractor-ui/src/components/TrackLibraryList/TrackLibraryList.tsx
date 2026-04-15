import type {
  LibrarySort,
  LibrarySourceFilter,
  LibraryStatusFilter,
  TrackLibraryItem,
} from '../../api/types';
import { DataList, type ColumnDef, type DataListAction } from '../DataList/DataList';
import { PARTS } from '../JingleExtractor/parts';
import { SegmentedControl } from '../SegmentedControl';
import { StatusBadge } from '../StatusBadge';
import { getTrackStatus } from '../../features/studio/status';
import '../shared/index.css';
import './TrackLibraryList.css';

interface TrackLibraryListProps {
  tracks: TrackLibraryItem[];
  selectedId: string | null;
  previewingId?: string | null;
  search: string;
  sourceFilter: LibrarySourceFilter;
  statusFilter: LibraryStatusFilter;
  sort: LibrarySort;
  onSearchChange: (value: string) => void;
  onSourceFilterChange: (value: LibrarySourceFilter) => void;
  onStatusFilterChange: (value: LibraryStatusFilter) => void;
  onSortChange: (value: LibrarySort) => void;
  onSelect: (track: TrackLibraryItem) => void;
  onPreview: (track: TrackLibraryItem) => void;
  onAnalyze: (track: TrackLibraryItem) => void;
}

const COLUMNS: ColumnDef<TrackLibraryItem>[] = [
  { key: 'decision', width: '20px', align: 'center' },
  { key: 'name', width: 'minmax(0, 1fr)' },
  { key: 'source', width: '58px', align: 'center' },
  { key: 'status', width: '78px', align: 'center' },
  { key: 'duration', width: '46px', align: 'right' },
];

function fmtDuration(duration: number | null) {
  if (duration == null) return '—';
  const mins = Math.floor(duration / 60);
  return `${mins}:${(duration % 60).toFixed(1).padStart(4, '0')}`;
}


export function TrackLibraryList({
  tracks,
  selectedId,
  previewingId = null,
  search,
  sourceFilter,
  statusFilter,
  sort,
  onSearchChange,
  onSourceFilterChange,
  onStatusFilterChange,
  onSortChange,
  onSelect,
  onPreview,
  onAnalyze,
}: TrackLibraryListProps) {
  const rowActions: DataListAction<TrackLibraryItem>[] = [
    {
      key: 'preview',
      label: '▶',
      render: (item) => (
        <button
          data-part={PARTS.btnIcon}
          type="button"
          aria-label={`Preview ${item.display_name}`}
          onClick={() => onPreview(item)}
        >
          {previewingId === item.id ? '■' : '▶'}
        </button>
      ),
    },
    {
      key: 'analyze',
      label: '↗',
      render: (item) => (
        <button
          data-part={PARTS.btnIcon}
          type="button"
          aria-label={`Analyze ${item.display_name}`}
          onClick={() => onAnalyze(item)}
        >
          ↗
        </button>
      ),
    },
  ];

  return (
    <div data-part={PARTS.trackLibraryList}>
      <div data-part={PARTS.libraryToolbar}>
        <div data-part={PARTS.fieldGroup}>
          <label data-part={PARTS.fieldLabel} htmlFor="library-search">
            Search
          </label>
          <input
            id="library-search"
            data-part={PARTS.textField}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div data-part={PARTS.fieldGroup}>
          <span data-part={PARTS.fieldLabel}>Source</span>
          <SegmentedControl
            value={sourceFilter}
            label="Source filter"
            options={[
              { value: 'all', label: 'All' },
              { value: 'generated', label: 'Generated' },
              { value: 'imported', label: 'Imported' },
            ]}
            onChange={onSourceFilterChange}
          />
        </div>

        <div data-part={PARTS.fieldGroup}>
          <label data-part={PARTS.fieldLabel} htmlFor="library-status-filter">
            Status
          </label>
          <select
            id="library-status-filter"
            data-part={PARTS.textField}
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as LibraryStatusFilter)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="generated">Generated</option>
            <option value="analyzed">Analyzed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div data-part={PARTS.fieldGroup}>
          <label data-part={PARTS.fieldLabel} htmlFor="library-sort">
            Sort
          </label>
          <select
            id="library-sort"
            data-part={PARTS.textField}
            value={sort}
            onChange={(e) => onSortChange(e.target.value as LibrarySort)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <DataList
        items={tracks}
        columns={COLUMNS}
        selectedId={selectedId}
        previewingId={previewingId}
        onSelect={onSelect}
        rowActions={rowActions}
        actionColumnWidth="52px"
        ariaLabel="Track library"
        renderCell={(item, column) => {
          switch (column.key) {
            case 'decision':
              return item.decision === 'keep' ? (
                <span data-part={PARTS.keepBadge}>★</span>
              ) : item.decision === 'reject' ? (
                <span style={{ opacity: 0.35 }}>✕</span>
              ) : (
                <span />
              );
            case 'name':
              return <strong>{item.display_name}</strong>;
            case 'source':
              return (
                <span data-part={PARTS.sourceBadge}>
                  {item.source_type === 'generated' ? 'GEN' : 'IMP'}
                </span>
              );
            case 'status':
              return <StatusBadge status={getTrackStatus(item)} />;
            case 'duration':
              return <span style={{ opacity: 0.75 }}>{fmtDuration(item.duration)}</span>;
            default:
              return null;
          }
        }}
      />
    </div>
  );
}
