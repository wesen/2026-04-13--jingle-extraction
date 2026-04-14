/**
 * DataList.stories.tsx — Storybook stories for DataList.
 *
 * Demonstrates the DataList primitive with:
 * - Track row example (matching the Studio screen's TrackResultsList)
 * - Candidate row example (mirroring existing CandidateList)
 * - Simple text list example
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DataList, type ColumnDef } from './DataList';
import { PARTS } from '../JingleExtractor/parts';
import { withWidgetRoot } from '../storybook/widgetStoryDecorators';

// ── Mock data ────────────────────────────────────────────────────────────────

interface TrackRow {
  id: string;
  name: string;
  duration: number;
  source: 'generated' | 'imported';
  status: 'pending' | 'generated' | 'analyzed' | 'failed';
  decision: 'pending' | 'keep' | 'reject';
  vocal: boolean;
  score?: number;
}

interface CandidateParityRow {
  id: number;
  rank: number;
  title: string;
  start: number;
  end: number;
  score: number;
  vocalOverlap: boolean;
  best?: boolean;
}

const TRACKS: TrackRow[] = [
  { id: 'hook_01', name: 'thrash_hook_01', duration: 55.4, source: 'generated', status: 'analyzed',  decision: 'keep',    vocal: true,  score: 92 },
  { id: 'hook_02', name: 'thrash_hook_02', duration: 55.8, source: 'generated', status: 'analyzed',  decision: 'pending', vocal: true,  score: 91 },
  { id: 'hook_03', name: 'thrash_hook_03', duration: 54.1, source: 'generated', status: 'pending',  decision: 'pending', vocal: true },
  { id: 'hook_04', name: 'thrash_hook_04', duration: 56.2, source: 'generated', status: 'failed',   decision: 'reject',  vocal: true },
  { id: 'power_01', name: 'power_metal_01', duration: 63.0, source: 'imported',  status: 'analyzed',  decision: 'pending', vocal: false },
];

const TRACK_COLUMNS: ColumnDef<TrackRow>[] = [
  { key: 'decision', label: '',   width: '20px' },
  { key: 'name',     label: 'Track', width: 'minmax(0, 1fr)' },
  { key: 'duration', label: 'Dur', width: '42px', align: 'right' },
  { key: 'source',   label: 'Src', width: '46px', align: 'center' },
  { key: 'status',   label: 'Status', width: '52px', align: 'center' },
];

const TRACK_ACTIONS = [
  {
    key: 'preview',
    label: '▶',
    ariaLabel: 'Preview track',
    render: (item: TrackRow) => (
      <button
        data-part={PARTS.btnIcon}
        aria-label={`Preview ${item.name}`}
        onClick={() => alert(`Preview: ${item.name}`)}
      >
        ▶
      </button>
    ),
  },
  {
    key: 'analyze',
    label: '▶ Run',
    ariaLabel: 'Analyze track',
    render: (item: TrackRow) =>
      item.status === 'pending' || item.status === 'failed' ? (
        <button
          data-part={PARTS.btnIcon}
          aria-label={`Analyze ${item.name}`}
          onClick={() => alert(`Analyze: ${item.name}`)}
        >
          ▶
        </button>
      ) : null,
  },
];

const CANDIDATE_PARITY_ROWS: CandidateParityRow[] = [
  { id: 1, rank: 1, title: 'Candidate #1', start: 39.1, end: 43.1, score: 92, vocalOverlap: false, best: true },
  { id: 2, rank: 2, title: 'Candidate #2', start: 35.1, end: 39.1, score: 91, vocalOverlap: true },
  { id: 3, rank: 3, title: 'Candidate #3', start: 45.7, end: 48.2, score: 89, vocalOverlap: false },
  { id: 4, rank: 4, title: 'Candidate #4', start: 26.0, end: 30.0, score: 88, vocalOverlap: false },
  { id: 5, rank: 5, title: 'Candidate #5', start: 15.5, end: 18.0, score: 87, vocalOverlap: false },
];

const CANDIDATE_PARITY_COLUMNS: ColumnDef<CandidateParityRow>[] = [
  { key: 'rank', width: '22px', align: 'center' },
  { key: 'time', width: 'minmax(0, 1fr)' },
  { key: 'dur', width: '42px', align: 'right' },
  { key: 'score', width: '34px', align: 'right' },
  { key: 'badge', width: '52px', align: 'center' },
];

function fmtDur(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
}

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
}

function StatusBadge({ status }: { status: TrackRow['status'] }) {
  return (
    <span data-part={PARTS.statusBadge} data-status={status}>
      {status}
    </span>
  );
}

// ── Stories ────────────────────────────────────────────────────────────────

const meta = {
  component: DataList,
  title: 'JingleExtractor/DataList',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [withWidgetRoot({ style: { padding: 8 } })],
} satisfies Meta<typeof DataList>;

export default meta;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Story = StoryObj<any>;

export const TrackList: Story = {
  name: 'Track list (Studio screen)',
  render: () => {
    const [selected, setSelected] = useState<string | null>(null);
    return (
      <DataList
        items={TRACKS}
        columns={TRACK_COLUMNS}
        selectedId={selected}
        rowActions={TRACK_ACTIONS}
        ariaLabel="Track list"
        onSelect={(t) => setSelected(t.id)}
        actionColumnWidth="52px"
        renderCell={(item, col) => {
          switch (col.key) {
            case 'decision':
              return item.decision === 'keep' ? (
                <span data-part={PARTS.keepBadge}>★</span>
              ) : item.decision === 'reject' ? (
                <span style={{ opacity: 0.3 }}>✕</span>
              ) : (
                <span />
              );
            case 'name':
              return (
                <span
                  style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {item.name}
                </span>
              );
            case 'duration':
              return <span style={{ opacity: 0.6 }}>{fmtDur(item.duration)}</span>;
            case 'source':
              return (
                <span data-part={PARTS.sourceBadge}>
                  {item.source === 'generated' ? 'GEN' : 'IMP'}
                </span>
              );
            case 'status':
              return <StatusBadge status={item.status} />;
            default:
              return <span>{String((item as unknown as Record<string, unknown>)[col.key])}</span>;
          }
        }}
      />
    );
  },
};

export const TrackListWithScore: Story = {
  name: 'Track list with score column',
  render: () => {
    const [selected, setSelected] = useState<string | null>('hook_01');
    const analyzed = TRACK_COLUMNS.concat([
      { key: 'score', label: 'Score', width: '34px', align: 'right' as const },
    ]);
    return (
      <DataList
        items={TRACKS}
        columns={analyzed}
        selectedId={selected}
        rowActions={TRACK_ACTIONS}
        ariaLabel="Track list with scores"
        onSelect={(t) => setSelected(t.id)}
        actionColumnWidth="52px"
        renderCell={(item, col) => {
          if (col.key === 'score') {
            return item.score != null ? (
              <span style={{ fontWeight: 700 }}>{item.score}</span>
            ) : (
              <span style={{ opacity: 0.3 }}>—</span>
            );
          }
          return <span>{String((item as unknown as Record<string, unknown>)[col.key] ?? '')}</span>;
        }}
      />
    );
  },
};

export const CandidateListParity: Story = {
  name: 'CandidateList parity (legacy look)',
  render: () => {
    const [selected, setSelected] = useState<number | null>(1);
    return (
      <DataList
        items={CANDIDATE_PARITY_ROWS}
        columns={CANDIDATE_PARITY_COLUMNS}
        selectedId={selected}
        ariaLabel="Candidate list parity"
        actionColumnWidth="24px"
        rowActions={[
          {
            key: 'preview',
            label: '▶',
            ariaLabel: 'Preview candidate',
            render: () => <button data-part={PARTS.btnIcon}>▶</button>,
          },
        ]}
        onSelect={(c) => setSelected(c.id)}
        renderCell={(item, col) => {
          switch (col.key) {
            case 'rank':
              return <span style={{ fontWeight: 700 }}>{item.best ? '★' : `#${item.rank}`}</span>;
            case 'time':
              return (
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
                  <span style={{ opacity: 0.75 }}>{fmtTime(item.start)} → {fmtTime(item.end)}</span>
                </span>
              );
            case 'dur':
              return <span style={{ opacity: 0.6 }}>{(item.end - item.start).toFixed(1)}s</span>;
            case 'score':
              return <span style={{ fontWeight: 700 }}>{item.score}</span>;
            case 'badge':
              return <span data-part={PARTS.dataListBadge}>{item.vocalOverlap ? '⚠ vox' : '✓'}</span>;
            default:
              return <span />;
          }
        }}
      />
    );
  },
};

export const EmptyList: Story = {
  render: () => {
    const [, setSelected] = useState<string | null>(null);
    return (
      <DataList
        items={[]}
        columns={TRACK_COLUMNS}
        selectedId={null}
        ariaLabel="Empty track list"
        onSelect={(t) => setSelected(t.id)}
        renderCell={() => <span />}
      />
    );
  },
};
