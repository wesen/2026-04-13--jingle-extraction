import { useDispatch, useSelector } from 'react-redux';
import type { GenerationComposerValue } from '../../api/types';
import type { AppDispatch, RootState } from '../../app/store';
import { resetDraft, setDraft } from '../../features/studio/studioSlice';
import { GenerationComposer } from './GenerationComposer';

interface GenerationComposerContainerProps {
  onGenerate?: (draft: GenerationComposerValue) => void;
  onSavePrompt?: (draft: GenerationComposerValue) => void;
  isGenerating?: boolean;
}

export function GenerationComposerContainer({
  onGenerate,
  onSavePrompt,
  isGenerating = false,
}: GenerationComposerContainerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const draft = useSelector((state: RootState) => state.studio.draft);

  return (
    <GenerationComposer
      value={draft}
      onChange={(value) => dispatch(setDraft(value))}
      onGenerate={() => onGenerate?.(draft)}
      onSavePrompt={onSavePrompt ? () => onSavePrompt(draft) : undefined}
      onResetDraft={() => dispatch(resetDraft())}
      isGenerating={isGenerating}
    />
  );
}
