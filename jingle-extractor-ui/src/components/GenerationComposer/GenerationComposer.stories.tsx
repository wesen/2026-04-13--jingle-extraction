import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { GenerationComposerValue } from '../../api/types';
import { studioComposerFixture } from '../../mocks/fixtures/studio';
import { withWidgetWindow } from '../storybook/widgetStoryDecorators';
import { GenerationComposer } from './GenerationComposer';

const meta = {
  component: GenerationComposer,
  title: 'JingleExtractor/Studio/GenerationComposer',
  tags: ['autodocs'],
  args: {
    value: studioComposerFixture,
    onChange: () => undefined,
    onGenerate: () => undefined,
    onSavePrompt: () => undefined,
    onResetDraft: () => undefined,
    isGenerating: false,
  },
  parameters: { layout: 'padded' },
  decorators: [withWidgetWindow({ title: 'Generate Track Batch', style: { padding: 8, maxWidth: 760 } })],
} satisfies Meta<typeof GenerationComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

function ControlledComposer({
  initialValue = studioComposerFixture,
  isGenerating = false,
}: {
  initialValue?: GenerationComposerValue;
  isGenerating?: boolean;
}) {
  const [value, setValue] = useState<GenerationComposerValue>(initialValue);

  return (
    <GenerationComposer
      value={value}
      onChange={setValue}
      onGenerate={() => undefined}
      onSavePrompt={() => undefined}
      onResetDraft={() => setValue(initialValue)}
      isGenerating={isGenerating}
    />
  );
}

export const Default: Story = {
  render: () => <ControlledComposer />,
};

export const Instrumental: Story = {
  render: () => (
    <ControlledComposer
      initialValue={{
        ...studioComposerFixture,
        mode: 'instrumental',
        lyrics: '',
        namingPrefix: 'doom_bed',
      }}
    />
  ),
};

export const Generating: Story = {
  render: () => <ControlledComposer isGenerating />,
};

export const InvalidDraft: Story = {
  render: () => (
    <ControlledComposer
      initialValue={{
        ...studioComposerFixture,
        prompt: '',
        model: '',
        count: 0,
      }}
    />
  ),
};

export const NarrowLayout: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <ControlledComposer />
    </div>
  ),
};
