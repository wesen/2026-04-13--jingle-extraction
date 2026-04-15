import type { GenerationRunSummary, TrackLibraryItem } from '../../api/types';
import { PARTS } from '../JingleExtractor/parts';
import { StatusBadge } from '../StatusBadge';
import { getTrackStatus } from '../../features/studio/status';
import '../shared/index.css';
import './TrackInspector.css';

interface TrackInspectorProps {
  track: TrackLibraryItem | null;
  run?: GenerationRunSummary | null;
  isPreviewing?: boolean;
  onPreview?: () => void;
  onAnalyze?: () => void;
  onOpenInMining?: () => void;
}

function fmtDuration(duration: number | null) {
  if (duration == null) return '—';
  const mins = Math.floor(duration / 60);
  return `${mins}:${(duration % 60).toFixed(1).padStart(4, '0')}`;
}


export function TrackInspector({
  track,
  run = null,
  isPreviewing = false,
  onPreview,
  onAnalyze,
  onOpenInMining,
}: TrackInspectorProps) {
  if (!track) {
    return (
      <div data-part={PARTS.trackInspector}>
        <div data-part={PARTS.panelSection}>
          <div data-part={PARTS.panelSectionLabel}>Selected track</div>
          <div data-part={PARTS.fieldHint}>Select a track from the current run or library to inspect it.</div>
        </div>
      </div>
    );
  }

  const status = getTrackStatus(track);
  const canOpenInMining = track.analysis_status === 'complete';

  return (
    <div data-part={PARTS.trackInspector}>
      <div data-part={PARTS.panelHeader}>
        <div data-part={PARTS.trackInspectorSummary}>
          <strong>{track.display_name}</strong>
          <StatusBadge status={status} />
        </div>
      </div>

      <div data-part={PARTS.panelSection}>
        <div data-part={PARTS.panelSectionLabel}>Summary</div>
        <div data-part={PARTS.panelRow}>
          <span data-part={PARTS.panelRowLabel}>Source</span>
          <span data-part={PARTS.panelRowValue}>{track.source_type}</span>
        </div>
        <div data-part={PARTS.panelRow}>
          <span data-part={PARTS.panelRowLabel}>Duration</span>
          <span data-part={PARTS.panelRowValue}>{fmtDuration(track.duration)}</span>
        </div>
        <div data-part={PARTS.panelRow}>
          <span data-part={PARTS.panelRowLabel}>Model</span>
          <span data-part={PARTS.panelRowValue}>{track.minimax_model ?? '—'}</span>
        </div>
        <div data-part={PARTS.panelRow}>
          <span data-part={PARTS.panelRowLabel}>Run</span>
          <span data-part={PARTS.panelRowValue}>{run?.name ?? track.generation_run_id ?? '—'}</span>
        </div>
      </div>

      <div data-part={PARTS.panelSection}>
        <div data-part={PARTS.panelSectionLabel}>Prompt</div>
        <div data-part={PARTS.fieldHint}>{track.prompt_snapshot ?? 'No stored prompt.'}</div>
      </div>

      <div data-part={PARTS.panelSection}>
        <div data-part={PARTS.panelSectionLabel}>Lyrics</div>
        <div data-part={PARTS.fieldHint}>{track.lyrics_snapshot || 'No lyrics stored.'}</div>
      </div>

      <div data-part={PARTS.buttonRow}>
        <button data-part={PARTS.btnSecondary} type="button" onClick={onPreview} disabled={!onPreview}>
          {isPreviewing ? 'Stop preview' : 'Preview'}
        </button>
        <button data-part={PARTS.btnPrimary} type="button" onClick={onAnalyze} disabled={!onAnalyze}>
          Analyze track
        </button>
        <button data-part={PARTS.btnSecondary} type="button" onClick={onOpenInMining} disabled={!canOpenInMining || !onOpenInMining}>
          Open in Mining
        </button>
      </div>
    </div>
  );
}
