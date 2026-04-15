import type { ReactNode } from 'react';
import type { StudioTrackStatus } from '../../features/studio/status';
import { PARTS } from '../JingleExtractor/parts';
import '../shared/index.css';

interface StatusBadgeProps {
  status: StudioTrackStatus;
  label?: ReactNode;
  part?: string;
}

export function StatusBadge({
  status,
  label,
  part,
}: StatusBadgeProps) {
  return (
    <span data-part={part ?? PARTS.statusBadge} data-status={status === 'analyzed' ? 'complete' : status}>
      {label ?? status}
    </span>
  );
}
