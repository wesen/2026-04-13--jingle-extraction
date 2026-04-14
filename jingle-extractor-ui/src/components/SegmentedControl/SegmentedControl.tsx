/**
 * SegmentedControl.tsx — Horizontal mutually-exclusive option selector.
 *
 * A row of buttons where exactly one is always active (aria-pressed="true").
 * Inspired by: TransportBar.stemToggle, ConfigEditor.strategyToggle.
 *
 * Usage:
 * ```tsx
 * <SegmentedControl
 *   value={stem}
 *   options={[
 *     { value: 'orig', label: 'Original' },
 *     { value: 'inst', label: 'Instrumental' },
 *     { value: 'vox',  label: 'Vocals' },
 *   ]}
 *   onChange={(v) => setStem(v)}
 * />
 * ```
 */

import type { ReactNode } from 'react';
import { PARTS } from '../JingleExtractor/parts';
// Shared styles are loaded here so stories render correctly outside the
// JingleExtractor widget context.
import '../shared/index.css';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string = string> {
  /** Currently selected value */
  value: T;
  /** Available options */
  options: SegmentedControlOption<T>[];
  /** Called when the user selects a different option */
  onChange: (value: T) => void;
  /** Accessible label for the group (used as aria-label) */
  label?: string;
  /** Additional class name on the root element */
  className?: string;
  /** Optional compatibility override for root data-part */
  rootPart?: string;
  /** Optional compatibility override for button data-part */
  buttonPart?: string;
}

export function SegmentedControl<T extends string = string>({
  value,
  options,
  onChange,
  label,
  className,
  rootPart,
  buttonPart,
}: SegmentedControlProps<T>) {
  return (
    <div
      data-part={rootPart ?? PARTS.segmentedControl}
      role="group"
      aria-label={label}
      className={className}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            data-part={buttonPart ?? PARTS.segmentedBtn}
            type="button"
            aria-pressed={isActive}
            aria-disabled={opt.disabled || undefined}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
