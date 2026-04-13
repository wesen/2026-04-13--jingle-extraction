/**
 * ScoreBar.tsx — Pixel-art 1-bit score bar.
 *
 * Displays a value (0–100) as a row of filled/empty blocks.
 * The number of filled blocks = value / 5 (20 blocks total).
 *
 * @example
 * <ScoreBar label="Attack" value={95} />
 */

import { PARTS } from '../JingleExtractor/parts';
import './ScoreBar.css';

const BLOCKS = 20;

interface ScoreBarProps {
  label: string;
  value: number; // 0–100
  className?: string;
}

export function ScoreBar({ label, value, className }: ScoreBarProps) {
  const filled = Math.round(value / 5); // 0–20 blocks

  return (
    <div
      data-part={PARTS.scoreBar}
      className={className}
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span data-part={PARTS.scoreBarLabel}>{label}</span>

      <div data-part={PARTS.scoreBarTrack} style={{ display: 'flex', gap: '1px' }}>
        {Array.from({ length: BLOCKS }, (_, i) => (
          <div
            key={i}
            data-part={PARTS.scoreBarBlock}
            data-filled={i < filled ? 'true' : 'false'}
          />
        ))}
      </div>

      <span data-part={PARTS.scoreBarLabel}>{value}</span>
    </div>
  );
}
