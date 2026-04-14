/**
 * CandidateList.tsx — Candidate list panel.
 *
 * Displays all candidate clips as rows. Clicking selects a candidate.
 * Shows rank, time range, duration, score, and vocal overlap badge.
 */

import type { Candidate } from '../../api/types';
import { fmt } from '../../utils/format';
import { DataList, type ColumnDef } from '../DataList';
import { PARTS } from '../JingleExtractor/parts';
import './CandidateList.css';

type DisplayCandidate = Candidate & { edited?: boolean };

const COLUMNS: ColumnDef<DisplayCandidate>[] = [
  { key: 'rank', width: '22px', align: 'center' },
  { key: 'time', width: 'minmax(0, 1fr)' },
  { key: 'duration', width: '42px', align: 'right' },
  { key: 'score', width: '34px', align: 'right' },
  { key: 'badge', width: '52px', align: 'center' },
];

interface CandidateListProps {
  candidates: DisplayCandidate[];
  selectedId: number | null;
  previewingId?: number | null;
  onSelect: (id: number) => void;
  onPreview: (id: number) => void;
}

export function CandidateList({
  candidates,
  selectedId,
  previewingId = null,
  onSelect,
  onPreview,
}: CandidateListProps) {
  return (
    <DataList
      items={candidates}
      columns={COLUMNS}
      selectedId={selectedId}
      previewingId={previewingId}
      ariaLabel="Candidate clips"
      rootPart={PARTS.candidateList}
      rowPart={PARTS.candidateRow}
      actionColumnWidth="24px"
      rowActions={[
        {
          key: 'preview',
          label: '▶',
          ariaLabel: 'Preview candidate',
          render: (candidate) => (
            <button
              data-part={PARTS.candidatePreviewBtn}
              onClick={() => onPreview(candidate.id)}
              aria-label={previewingId === candidate.id ? `Stop preview candidate ${candidate.rank}` : `Preview candidate ${candidate.rank}`}
              title={previewingId === candidate.id ? 'Stop preview' : 'Preview'}
            >
              {previewingId === candidate.id ? '■' : '▶'}
            </button>
          ),
        },
      ]}
      onSelect={(candidate) => onSelect(candidate.id)}
      renderCell={(candidate, column) => {
        switch (column.key) {
          case 'rank':
            return <span data-part={PARTS.candidateRank}>{candidate.best ? '★' : `#${candidate.rank}`}</span>;
          case 'time':
            return (
              <span data-part={PARTS.candidateTime}>
                <span data-part={PARTS.candidateTitle}>{candidate.source_text ?? `Candidate #${candidate.rank}`}</span>
                <span>{fmt(candidate.start)} → {fmt(candidate.end)}</span>
              </span>
            );
          case 'duration':
            return <span data-part={PARTS.candidateDuration}>{(candidate.end - candidate.start).toFixed(1)}s</span>;
          case 'score':
            return <span data-part={PARTS.candidateScore}>{candidate.score}</span>;
          case 'badge':
            return <span data-part={PARTS.candidateBadge}>{candidate.vocal_overlap ? '⚠ vox' : '✓'}{candidate.edited ? ' ✎' : ''}</span>;
          default:
            return null;
        }
      }}
    />
  );
}
