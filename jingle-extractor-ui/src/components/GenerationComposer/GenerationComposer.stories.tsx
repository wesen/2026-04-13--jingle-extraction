import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { GenerationComposerValue } from '../../api/types';
import { studioComposerFixture } from '../../mocks/fixtures/studio';
import { MacWindow } from '../MacWindow';
import { WIDGET } from '../JingleExtractor/parts';
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
    isGenerating: false,
  },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div data-widget={WIDGET} data-je-theme="retro" style={{ padding: 8, maxWidth: 760 }}>
        <MacWindow title="Generate Track Batch">
          <div style={{ padding: 8 }}>
            <Story />
          </div>
        </MacWindow>
      </div>
    ),
  ],
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
