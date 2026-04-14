/**
 * CandidateList.tsx — Candidate list panel.
 *
 * Displays all candidate clips as rows. Clicking selects a candidate.
 * Shows rank, time range, duration, score, and vocal overlap badge.
 */

import type { Candidate } from '../../api/types';

type DisplayCandidate = Candidate & { edited?: boolean };
import { fmt } from '../../utils/format';
import { PARTS } from '../JingleExtractor/parts';
import './CandidateList.css';

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
    <div
      data-part={PARTS.candidateList}
      role="listbox"
      aria-label="Candidate clips"
      aria-multiselectable={false}
    >
      {candidates.map((c) => {
        const isSelected = selectedId === c.id;
        const isPreviewing = previewingId === c.id;
        const duration = c.end - c.start;

        const label = c.source_text ?? `Candidate #${c.rank}`;

        return (
          <div
            key={c.id}
            data-part={PARTS.candidateRow}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(c.id)}
          >
            {/* Rank badge */}
            <span data-part={PARTS.candidateRank}>
              {c.best ? '★' : `#${c.rank}`}
            </span>

            {/* Time range */}
            <span data-part={PARTS.candidateTime}>
              <span data-part={PARTS.candidateTitle}>{label}</span>
              <span>{fmt(c.start)} → {fmt(c.end)}</span>
            </span>

            {/* Duration */}
            <span data-part={PARTS.candidateDuration}>
              {duration.toFixed(1)}s
            </span>

            {/* Score */}
            <span data-part={PARTS.candidateScore}>
              {c.score}
            </span>

            {/* Vocal overlap badge */}
            <span data-part={PARTS.candidateBadge}>
              {c.vocal_overlap ? '⚠ vox' : '✓'}{c.edited ? ' ✎' : ''}
            </span>

            {/* Preview button */}
            <button
              data-part={PARTS.candidatePreviewBtn}
              onClick={(e) => {
                e.stopPropagation();
                onPreview(c.id);
              }}
              aria-label={isPreviewing ? `Stop preview candidate ${c.rank}` : `Preview candidate ${c.rank}`}
              title={isPreviewing ? 'Stop preview' : 'Preview'}
            >
              {isPreviewing ? '■' : '▶'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
