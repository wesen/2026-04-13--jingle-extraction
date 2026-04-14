/**
 * ConfigEditor.tsx — Analysis configuration editor.
 *
 * Displays the current analysis config as editable JSON with:
 * - Syntax validation (shows error on bad JSON)
 * - Run Analysis button (triggers pipeline)
 * - Reset button (reverts to last valid config)
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { AnalysisConfig } from '../../api/types';
import { PARTS } from '../JingleExtractor/parts';
import { SegmentedControl } from '../SegmentedControl';
import './ConfigEditor.css';

interface ConfigEditorProps {
  config: AnalysisConfig;
  onChange: (config: AnalysisConfig) => void;
  onRun: () => void;
  onReset: () => void;
  isLoading?: boolean;
  style?: CSSProperties;
}

export function ConfigEditor({
  config,
  onChange,
  onRun,
  onReset,
  isLoading = false,
  style,
}: ConfigEditorProps) {
  const [raw, setRaw] = useState(() => JSON.stringify(config, null, 2));
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync raw text when config changes externally (e.g. preset selection)
  useEffect(() => {
    try {
      const next = JSON.stringify(config, null, 2);
      // Only update if different to avoid cursor jumps
      if (next !== raw) {
        setRaw(next);
        setError(null);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleChange = (value: string) => {
    setRaw(value);
    try {
      const parsed = JSON.parse(value) as unknown;
      if (isAnalysisConfig(parsed)) {
        setError(null);
        onChange(normalizeAnalysisConfig(parsed));
      } else {
        setError('Invalid config shape');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Strip position info for cleaner display
      setError(msg.split(' at ')[0]);
    }
  };

  const handleStrategyChange = (candidate_mode: AnalysisConfig['candidate_mode']) => {
    onChange({ ...config, candidate_mode });
  };

  return (
    <div data-part={PARTS.configEditor} style={style}>
      <SegmentedControl
        value={config.candidate_mode}
        options={[
          { value: 'rhythmic', label: 'Rhythmic' },
          { value: 'lyric_aligned', label: 'Lyric aligned' },
        ]}
        onChange={handleStrategyChange}
        label="Candidate mining strategy"
        rootPart={PARTS.configStrategyRow}
        buttonPart={PARTS.configStrategyButton}
      />

      {/* JSON textarea */}
      <textarea
        ref={textareaRef}
        data-part={PARTS.configTextarea}
        data-error={error ? 'true' : 'false'}
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        aria-label="Analysis configuration JSON"
        aria-invalid={!!error}
        aria-describedby={error ? 'config-error' : undefined}
      />

      {/* Error message */}
      {error && (
        <div data-part={PARTS.configError} role="alert" id="config-error">
          ✗ {error}
        </div>
      )}

      {/* Action buttons */}
      <div data-part={PARTS.actionRow}>
        <button
          data-part={PARTS.runButton}
          data-loading={isLoading ? 'true' : 'false'}
          onClick={onRun}
          disabled={isLoading || !!error}
          aria-label="Run analysis with current configuration"
        >
          ▶ Run Analysis
        </button>
        <button
          data-part={PARTS.resetButton}
          onClick={onReset}
          aria-label="Reset to default configuration"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isAnalysisConfig(value: unknown): value is Partial<AnalysisConfig> {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.min_dur === 'number' &&
    typeof obj.max_dur === 'number' &&
    typeof obj.min_score === 'number' &&
    ['any', 'inst', 'vocal'].includes(obj.vocal_mode as string) &&
    typeof obj.atk_w === 'number' &&
    typeof obj.fade_in === 'number' &&
    typeof obj.fade_out === 'number'
  );
}

function normalizeAnalysisConfig(value: Partial<AnalysisConfig>): AnalysisConfig {
  return {
    candidate_mode: 'rhythmic',
    lyric_padding_before: 0.5,
    lyric_padding_after: 0.5,
    ...value,
  } as AnalysisConfig;
}
