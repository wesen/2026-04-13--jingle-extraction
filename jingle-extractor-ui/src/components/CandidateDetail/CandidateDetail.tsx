/**
 * CandidateDetail.tsx — Candidate detail panel.
 *
 * Shows the selected candidate's quality breakdown (Attack/Ending/Energy),
 * context information (vocal overlap, beat alignment), and action buttons.
 */

import type { Candidate, StemType } from '../../api/types';

type DisplayCandidate = Candidate & { edited?: boolean };
import { fmt } from '../../utils/format';
import { ScoreBar } from '../ScoreBar';
import { PARTS } from '../JingleExtractor/parts';
import './CandidateDetail.css';

interface CandidateDetailProps {
  candidate: DisplayCandidate;
  stem: StemType;
  onPreview: () => void;
  onExport: () => void;
  onResetEdit: () => void;
}

export function CandidateDetail({
  candidate,
  stem,
  onPreview,
  onExport,
  onResetEdit,
}: CandidateDetailProps) {
  const duration = candidate.end - candidate.start;

  return (
    <div data-part={PARTS.candidateDetail} aria-label={`Candidate ${candidate.rank} detail`}>
      {/* Header */}
      <div data-part={PARTS.detailHeader}>
        <div data-part={PARTS.detailTitle}>
          Candidate #{candidate.rank}
          {candidate.best && ' ★ BEST'}
        </div>
        <div data-part={PARTS.detailSubtitle}>
          {fmt(candidate.start)} → {fmt(candidate.end)} · {duration.toFixed(1)}s
        </div>
      </div>

      {/* Quality breakdown */}
      <div data-part={PARTS.qualityPanel}>
        <div data-part={PARTS.sectionLabel}>QUALITY</div>
        <ScoreBar label="Attack" value={candidate.attack} />
        <ScoreBar label="Ending" value={candidate.ending} />
        <ScoreBar label="Energy" value={candidate.energy} />

        <div data-part={PARTS.overallScore}>
          <span data-part={PARTS.overallLabel}>Overall</span>
          <span data-part={PARTS.overallValue}>{candidate.score}</span>
        </div>
      </div>

      {/* Context info */}
      <div data-part={PARTS.contextPanel}>
        <div data-part={PARTS.sectionLabel}>CONTEXT</div>

        <div data-part={PARTS.contextItem}>
          <span data-part={PARTS.contextLabel}>Vocal overlap</span>
          <span data-part={PARTS.contextValue}>
            {candidate.vocal_overlap ? '⚠ Yes' : '✓ None'}
          </span>
        </div>

        <div data-part={PARTS.contextItem}>
          <span data-part={PARTS.contextLabel}>Start on onset</span>
          <span data-part={PARTS.contextValue}>
            {candidate.attack > 85 ? '✓ Yes' : '~ Close'}
          </span>
        </div>

        <div data-part={PARTS.contextItem}>
          <span data-part={PARTS.contextLabel}>End on beat</span>
          <span data-part={PARTS.contextValue}>
            {candidate.ending > 85 ? '✓ Yes' : '~ Close'}
          </span>
        </div>

        <div data-part={PARTS.contextItem}>
          <span data-part={PARTS.contextLabel}>Stem</span>
          <span data-part={PARTS.contextValue}>{stem}</span>
        </div>

        <div data-part={PARTS.contextItem}>
          <span data-part={PARTS.contextLabel}>Local edit</span>
          <span data-part={PARTS.contextValue}>{candidate.edited ? '✎ Yes' : '—'}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div data-part={PARTS.buttonRow}>
        <button data-part={PARTS.previewButton} onClick={onPreview}>
          ▶ Preview
        </button>
        <button data-part={PARTS.exportButton} onClick={onExport}>
          ⬇ Export
        </button>
        {candidate.edited && (
          <button data-part={PARTS.resetButton} onClick={onResetEdit}>
            Reset Edit
          </button>
        )}
      </div>
    </div>
  );
}
