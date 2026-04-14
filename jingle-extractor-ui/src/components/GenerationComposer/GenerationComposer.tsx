import type { GenerationComposerValue } from '../../api/types';
import { PARTS } from '../JingleExtractor/parts';
import { SegmentedControl } from '../SegmentedControl';
import '../shared/index.css';
import './GenerationComposer.css';

interface GenerationComposerProps {
  value: GenerationComposerValue;
  onChange: (value: GenerationComposerValue) => void;
  onGenerate: () => void;
  onSavePrompt?: () => void;
  isGenerating?: boolean;
}

export function GenerationComposer({
  value,
  onChange,
  onGenerate,
  onSavePrompt,
  isGenerating = false,
}: GenerationComposerProps) {
  const update = <K extends keyof GenerationComposerValue>(key: K, next: GenerationComposerValue[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div data-part={PARTS.generationComposer}>
      <div data-part={PARTS.composerGrid}>
        <div data-part={PARTS.fieldGroup}>
          <label data-part={PARTS.fieldLabel} htmlFor="generation-prompt">
            Prompt
          </label>
          <textarea
            id="generation-prompt"
            data-part={PARTS.textareaField}
            value={value.prompt}
            onChange={(e) => update('prompt', e.target.value)}
            spellCheck={false}
          />
        </div>

        <div data-part={PARTS.fieldGroup}>
          <label data-part={PARTS.fieldLabel} htmlFor="generation-lyrics">
            Lyrics (optional)
          </label>
          <textarea
            id="generation-lyrics"
            data-part={PARTS.textareaField}
            value={value.lyrics}
            onChange={(e) => update('lyrics', e.target.value)}
            spellCheck={false}
          />
          <span data-part={PARTS.fieldHint}>Use section tags like [Hook] or [Verse] if useful.</span>
        </div>

        <div data-part={PARTS.fieldGroup}>
          <label data-part={PARTS.fieldLabel} htmlFor="generation-model">
            Model
          </label>
          <input
            id="generation-model"
            data-part={PARTS.textField}
            value={value.model}
            onChange={(e) => update('model', e.target.value)}
          />
        </div>

        <div data-part={PARTS.fieldGroup}>
          <label data-part={PARTS.fieldLabel} htmlFor="generation-count">
            Count
          </label>
          <input
            id="generation-count"
            data-part={PARTS.numberField}
            type="number"
            min={1}
            max={8}
            value={value.count}
            onChange={(e) => update('count', Number(e.target.value) || 1)}
          />
        </div>

        <div data-part={PARTS.fieldGroup}>
          <span data-part={PARTS.fieldLabel}>Type</span>
          <SegmentedControl
            value={value.mode}
            label="Generation type"
            options={[
              { value: 'vocal', label: 'Vocal' },
              { value: 'instrumental', label: 'Instrumental' },
            ]}
            onChange={(next) => update('mode', next)}
          />
        </div>

        <div data-part={PARTS.fieldGroup}>
          <label data-part={PARTS.fieldLabel} htmlFor="generation-prefix">
            Naming prefix
          </label>
          <input
            id="generation-prefix"
            data-part={PARTS.textField}
            value={value.namingPrefix}
            onChange={(e) => update('namingPrefix', e.target.value)}
          />
        </div>
      </div>

      <div data-part={PARTS.composerActions}>
        <button data-part={PARTS.btnPrimary} type="button" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating…' : 'Generate batch'}
        </button>
        {onSavePrompt && (
          <button data-part={PARTS.btnSecondary} type="button" onClick={onSavePrompt}>
            Save prompt
          </button>
        )}
      </div>
    </div>
  );
}
