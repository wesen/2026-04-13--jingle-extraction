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
  onResetDraft?: () => void;
  isGenerating?: boolean;
}

export function GenerationComposer({
  value,
  onChange,
  onGenerate,
  onSavePrompt,
  onResetDraft,
  isGenerating = false,
}: GenerationComposerProps) {
  const update = <K extends keyof GenerationComposerValue>(key: K, next: GenerationComposerValue[K]) => {
    onChange({ ...value, [key]: next });
  };

  const promptError = value.prompt.trim().length === 0 ? 'Prompt is required.' : null;
  const modelError = value.model.trim().length === 0 ? 'Model is required.' : null;
  const countError = Number.isInteger(value.count) && value.count >= 1 && value.count <= 8
    ? null
    : 'Count must be an integer between 1 and 8.';
  const hasValidationError = !!promptError || !!modelError || !!countError;

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
            aria-invalid={!!promptError}
            aria-describedby={promptError ? 'generation-prompt-error' : undefined}
          />
          {promptError && <span id="generation-prompt-error" data-part={PARTS.fieldError}>{promptError}</span>}
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
            aria-invalid={!!modelError}
            aria-describedby={modelError ? 'generation-model-error' : undefined}
          />
          {modelError && <span id="generation-model-error" data-part={PARTS.fieldError}>{modelError}</span>}
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
            onChange={(e) => {
              const raw = Number(e.target.value);
              if (Number.isNaN(raw)) {
                update('count', 1);
                return;
              }
              const clamped = Math.min(8, Math.max(1, Math.round(raw)));
              update('count', clamped);
            }}
            aria-invalid={!!countError}
            aria-describedby={countError ? 'generation-count-error' : undefined}
          />
          {countError && <span id="generation-count-error" data-part={PARTS.fieldError}>{countError}</span>}
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
        <button data-part={PARTS.btnPrimary} type="button" onClick={onGenerate} disabled={isGenerating || hasValidationError}>
          {isGenerating ? 'Generating…' : 'Generate batch'}
        </button>
        {onSavePrompt && (
          <button data-part={PARTS.btnSecondary} type="button" onClick={onSavePrompt}>
            Save prompt
          </button>
        )}
        {onResetDraft && (
          <button data-part={PARTS.btnSecondary} type="button" onClick={onResetDraft}>
            Reset draft
          </button>
        )}
      </div>
    </div>
  );
}
