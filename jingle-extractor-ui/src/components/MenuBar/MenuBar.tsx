/**
 * MenuBar.tsx — Application menu bar with track info display.
 */

import type { Track } from '../../api/types';
import { fmt } from '../../utils/format';
import { PARTS } from '../JingleExtractor/parts';
import './MenuBar.css';

interface MenuBarProps {
  track: Track;
}

const MENU_ITEMS = ['File', 'Edit', 'View', 'Analysis', 'Export'];

export function MenuBar({ track }: MenuBarProps) {
  return (
    <nav data-part={PARTS.menuBar} aria-label="Application menu">
      {/* Apple logo */}
      <span data-part={PARTS.menuLogo} aria-hidden="true">
        🍎
      </span>

      {/* Menu items */}
      {MENU_ITEMS.map((item) => (
        <span key={item} data-part={PARTS.menuItem} role="menuitem">
          {item}
        </span>
      ))}

      {/* Spacer */}
      <span data-part={PARTS.menuSpacer} />

      {/* Track info */}
      <div data-part={PARTS.trackInfo}>
        <span>{track.id}.mp3</span>
        <span>—</span>
        <span>{fmt(track.duration)}</span>
        <span>—</span>
        <span>{track.bpm.toFixed(1)} BPM</span>
        <span data-part={PARTS.trackBadge}>
          {track.language.toUpperCase()}
        </span>
      </div>
    </nav>
  );
}
