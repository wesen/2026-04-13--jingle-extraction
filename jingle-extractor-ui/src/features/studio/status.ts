import type {
  AnalysisStatus,
  LibraryStatusFilter,
  TrackLibraryItem,
  TrackGenerationStatus,
} from '../../api/types';

export type StudioTrackStatus =
  | 'analyzed'
  | 'pending'
  | AnalysisStatus
  | TrackGenerationStatus;

const PENDING_STATUSES = new Set<StudioTrackStatus>([
  'pending',
  'queued',
  'generating',
  'uploaded',
  'separating_stems',
  'transcribing',
  'analyzing_rhythm',
  'mining_candidates',
]);

export function getTrackStatus(track: TrackLibraryItem): StudioTrackStatus {
  if (track.analysis_status === 'complete') return 'analyzed';
  if (track.analysis_status && track.analysis_status !== 'not_started') return track.analysis_status;

  if (track.generation_status === 'generated') return 'generated';
  if (track.generation_status) return track.generation_status;

  return 'pending';
}

export function matchesLibraryStatusFilter(
  track: TrackLibraryItem,
  filter: LibraryStatusFilter
): boolean {
  if (filter === 'all') return true;

  const status = getTrackStatus(track);

  if (filter === 'analyzed') return status === 'analyzed';
  if (filter === 'generated') return status === 'generated';
  if (filter === 'failed') return status === 'failed';
  if (filter === 'pending') return PENDING_STATUSES.has(status);

  return false;
}
