import type { GenerationRunSummary, TrackLibraryItem } from '../../api/types';
import { DataList, type ColumnDef, type DataListAction } from '../DataList/DataList';
import { PARTS } from '../JingleExtractor/parts';
import '../shared/index.css';
import './TrackResultsList.css';

interface TrackResultsListProps {
  run: GenerationRunSummary | null;
  tracks: TrackLibraryItem[];
  selectedId: string | null;
  previewingId?: string | null;
  onSelect: (track: TrackLibraryItem) => void;
  onPreview: (track: TrackLibraryItem) => void;
  onAnalyze: (track: TrackLibraryItem) => void;
}

const COLUMNS: ColumnDef<TrackLibraryItem>[] = [
  { key: 'decision', width: '20px', align: 'center' },
  { key: 'name', width: 'minmax(0, 1fr)' },
  { key: 'duration', width: '46px', align: 'right' },
  { key: 'type', width: '54px', align: 'center' },
  { key: 'status', width: '78px', align: 'center' },
];

function fmtDuration(duration: number | null) {
  if (duration == null) return '—';
  const mins = Math.floor(duration / 60);
  return `${mins}:${(duration % 60).toFixed(1).padStart(4, '0')}`;
}

function getStatus(item: TrackLibraryItem) {
  if (item.analysis_status && item.analysis_status !== 'not_started') return item.analysis_status;
  return item.generation_status ?? 'pending';
}

function statusLabel(item: TrackLibraryItem) {
  const status = getStatus(item);
  if (status === 'complete') return 'analyzed';
  return status;
}

export function TrackResultsList({
  run,
  tracks,
  selectedId,
  previewingId = null,
  onSelect,
  onPreview,
  onAnalyze,
}: TrackResultsListProps) {
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
    <div data-part={PARTS.trackResultsList}>
      {run && (
        <div data-part={PARTS.runSummaryBar}>
          <div data-part={PARTS.runSummaryMetric}>
            <span data-part={PARTS.runSummaryLabel}>Run</span>
            <span data-part={PARTS.runSummaryValue}>{run.name}</span>
          </div>
          <div data-part={PARTS.runSummaryMetric}>
            <span data-part={PARTS.runSummaryLabel}>Status</span>
            <span data-part={PARTS.statusBadge} data-status={run.status === 'complete' ? 'complete' : run.status}>
              {run.status}
            </span>
          </div>
          <div data-part={PARTS.runSummaryMetric}>
            <span data-part={PARTS.runSummaryLabel}>Tracks</span>
            <span data-part={PARTS.runSummaryValue}>{run.countCompleted}/{run.countRequested}</span>
          </div>
        </div>
      )}

      <DataList
        items={tracks}
        columns={COLUMNS}
        selectedId={selectedId}
        previewingId={previewingId}
        onSelect={onSelect}
        rowActions={rowActions}
        actionColumnWidth="52px"
        ariaLabel="Current run results"
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
            case 'duration':
              return <span style={{ opacity: 0.75 }}>{fmtDuration(item.duration)}</span>;
            case 'type':
              return (
                <span data-part={PARTS.sourceBadge}>
                  {item.instrumental_requested ? 'INST' : 'VOC'}
                </span>
              );
            case 'status':
              return (
                <span data-part={PARTS.statusBadge} data-status={getStatus(item) === 'complete' ? 'complete' : getStatus(item)}>
                  {statusLabel(item)}
                </span>
              );
            default:
              return null;
          }
        }}
      />
    </div>
  );
}
