/**
 * TransportBar.tsx — Transport bar with stem toggle, time display, and playback controls.
 *
 * Controls which audio stem is playing (original / instrumental / vocals)
 * and displays the current playhead position.
 */

import type { StemType } from '../../api/types';
import { fmt } from '../../utils/format';
import { PARTS } from '../JingleExtractor/parts';
import { SegmentedControl } from '../SegmentedControl';
import './TransportBar.css';

const STEM_OPTIONS: { value: StemType; label: string }[] = [
  { value: 'orig', label: 'Original' },
  { value: 'inst', label: 'Instrumental' },
  { value: 'vox', label: 'Vocals' },
];

interface TransportBarProps {
  playhead: number;
  duration: number;
  stem: StemType;
  onStemChange: (stem: StemType) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
  isPlaying?: boolean;
}

export function TransportBar({
  playhead,
  duration,
  stem,
  onStemChange,
  onPlay,
  onPause,
  onSeekBack,
  onSeekForward,
  isPlaying = false,
}: TransportBarProps) {
  return (
    <div data-part={PARTS.transportBar} role="toolbar" aria-label="Playback transport">
      {/* Stem toggle */}
      <SegmentedControl
        value={stem}
        options={STEM_OPTIONS}
        onChange={onStemChange}
        label="Audio stem"
        rootPart={PARTS.stemToggle}
        buttonPart={PARTS.stemButton}
      />

      {/* Spacer */}
      <span data-part={PARTS.transportSpacer} />

      {/* Time display */}
      <span data-part={PARTS.timeDisplay} aria-label={`Current time ${fmt(playhead)}`}>
        {fmt(playhead)}
        <span data-part={PARTS.timeDisplayTotal} aria-hidden="true">
          / {fmt(duration)}
        </span>
      </span>

      {/* Transport controls */}
      <div data-part={PARTS.transportControls} role="group" aria-label="Transport controls">
        <button
          data-part={PARTS.transportBtn}
          aria-label="Seek backward"
          onClick={onSeekBack}
          title="Seek backward"
        >
          ◁◁
        </button>
        <button
          data-part={PARTS.transportBtn}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={isPlaying ? onPause : onPlay}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '▮▮' : '▷'}
        </button>
        <button
          data-part={PARTS.transportBtn}
          aria-label="Seek forward"
          onClick={onSeekForward}
          title="Seek forward"
        >
          ▷▷
        </button>
      </div>
    </div>
  );
}
