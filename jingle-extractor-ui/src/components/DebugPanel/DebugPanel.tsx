/**
 * DebugPanel.tsx — Timing inspection panel for candidates and lyric segments.
 *
 * Gives a side-by-side view of mined jingle windows and WhisperX lyric segments
 * so timestamp mismatches are easier to reason about while tuning presets.
 */

import type { AnalysisConfig, Candidate, PresetName, VocalSegment } from '../../api/types';
import { fmt } from '../../utils/format';
import { PARTS } from '../JingleExtractor/parts';
import './DebugPanel.css';

type DisplayCandidate = Candidate & { edited?: boolean };

interface DebugPanelProps {
  candidates: DisplayCandidate[];
  vocals: VocalSegment[];
  selectedCandidateId: number | null;
  activePreset: PresetName | null;
  config: AnalysisConfig;
  onSelectCandidate?: (id: number) => void;
}

function overlaps(
  a: { start: number; end: number },
  b: { start: number; end: number }
) {
  return a.start < b.end && b.start < a.end;
}

function fmtPrecise(seconds: number) {
  return seconds.toFixed(3);
}

export function DebugPanel({
  candidates,
  vocals,
  selectedCandidateId,
  activePreset,
  config,
  onSelectCandidate,
}: DebugPanelProps) {
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;

  return (
    <div data-part={PARTS.debugPanel}>
      <div data-part={PARTS.debugSummary}>
        <strong>Preset:</strong> {activePreset ?? 'Custom'}
        <span> · </span>
        <strong>Mode:</strong> {config.vocal_mode}
        <span> · </span>
        <strong>Duration:</strong> {config.min_dur.toFixed(1)}–{config.max_dur.toFixed(1)}s
        <span> · </span>
        <strong>Min score:</strong> {config.min_score}
        <span> · </span>
        <strong>Fades:</strong> {config.fade_in} / {config.fade_out} ms
      </div>

      <div data-part={PARTS.debugTables}>
        <section data-part={PARTS.debugSection}>
          <div data-part={PARTS.debugSectionTitle}>Extracted jingles ({candidates.length})</div>
          <div data-part={PARTS.debugScroll}>
            <table data-part={PARTS.debugTable}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Dur</th>
                  <th>Score</th>
                  <th>Vox</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => {
                  const duration = candidate.end - candidate.start;
                  const isSelected = candidate.id === selectedCandidateId;
                  return (
                    <tr
                      key={candidate.id}
                      data-selected={isSelected ? 'true' : undefined}
                      onClick={() => onSelectCandidate?.(candidate.id)}
                    >
                      <td>
                        {candidate.best ? '★' : `#${candidate.rank}`}
                        {candidate.edited ? ' ✎' : ''}
                      </td>
                      <td title={fmtPrecise(candidate.start)}>{fmt(candidate.start)}</td>
                      <td title={fmtPrecise(candidate.end)}>{fmt(candidate.end)}</td>
                      <td>{duration.toFixed(3)}s</td>
                      <td>{candidate.score}</td>
                      <td>{candidate.vocal_overlap ? 'yes' : 'no'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section data-part={PARTS.debugSection}>
          <div data-part={PARTS.debugSectionTitle}>Lyric segments ({vocals.length})</div>
          <div data-part={PARTS.debugScroll}>
            <table data-part={PARTS.debugTable}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Dur</th>
                  <th>Overlap</th>
                  <th>Text</th>
                </tr>
              </thead>
              <tbody>
                {vocals.map((segment) => {
                  const duration = segment.end - segment.start;
                  const selectedOverlap = selectedCandidate
                    ? overlaps(selectedCandidate, segment)
                    : false;
                  return (
                    <tr key={segment.id} data-overlap={selectedOverlap ? 'true' : undefined}>
                      <td>{segment.id}</td>
                      <td title={fmtPrecise(segment.start)}>{fmt(segment.start)}</td>
                      <td title={fmtPrecise(segment.end)}>{fmt(segment.end)}</td>
                      <td>{duration.toFixed(3)}s</td>
                      <td>{selectedOverlap ? 'selected jingle' : '—'}</td>
                      <td data-part={PARTS.debugText}>{segment.text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
