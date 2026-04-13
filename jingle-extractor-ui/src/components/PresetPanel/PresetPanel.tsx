/**
 * PresetPanel.tsx — Preset selection panel.
 *
 * Displays the list of available presets. Clicking a preset applies it.
 */

import type { PresetName } from '../../api/types';
import { PARTS } from '../JingleExtractor/parts';
import './PresetPanel.css';

interface PresetPanelProps {
  presets: PresetName[];
  activePreset: PresetName | null;
  onSelect: (name: PresetName) => void;
}

export function PresetPanel({ presets, activePreset, onSelect }: PresetPanelProps) {
  return (
    <div
      data-part={PARTS.presetList}
      role="group"
      aria-label="Analysis presets"
    >
      {presets.map((name) => {
        const isActive = activePreset === name;
        return (
          <button
            key={name}
            data-part={PARTS.presetItem}
            aria-pressed={isActive}
            onClick={() => onSelect(name)}
          >
            {isActive ? '◆ ' : '◇ '}
            {name}
          </button>
        );
      })}
    </div>
  );
}
