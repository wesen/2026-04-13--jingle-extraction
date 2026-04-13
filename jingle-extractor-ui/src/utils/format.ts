/**
 * format.ts — Formatting utilities.
 */

/**
 * Format seconds as M:SS.S (e.g. 39.1 → "0:39.1").
 */
export function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const ss = (s % 60).toFixed(1).padStart(4, '0');
  return `${m}:${ss}`;
}

/**
 * Format seconds as M:SS (e.g. 125.6 → "2:05").
 */
export function fmtCompact(s: number): string {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${ss}`;
}

/**
 * Format a duration in seconds as a human-readable string.
 */
export function fmtDuration(s: number): string {
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const ss = (s % 60).toFixed(0);
  return `${m}m ${ss}s`;
}

/**
 * Format a BPM value with descriptive label.
 */
export function fmtBpm(bpm: number): string {
  let label = '';
  if (bpm < 60) label = 'Slow';
  else if (bpm < 120) label = 'Medium';
  else label = 'Fast';
  return `${bpm.toFixed(1)} BPM — ${label}`;
}
