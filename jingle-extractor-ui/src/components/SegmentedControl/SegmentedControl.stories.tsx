/**
 * SegmentedControl.stories.tsx — Storybook stories for SegmentedControl.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SegmentedControl } from './SegmentedControl';
import { withWidgetRoot } from '../storybook/widgetStoryDecorators';

const meta = {
  component: SegmentedControl,
  title: 'JingleExtractor/SegmentedControl',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [withWidgetRoot({ style: { padding: 8 } })],
} satisfies Meta<typeof SegmentedControl>;

export default meta;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Story = StoryObj<any>;

export const StemToggle: Story = {
  render: () => {
    // Simulating TransportBar's stem toggle
    const [stem, setStem] = useState<string>('orig');
    return (
      <SegmentedControl
        value={stem}
        label="Audio stem"
        options={[
          { value: 'orig', label: 'Original' },
          { value: 'inst', label: 'Instrumental' },
          { value: 'vox',  label: 'Vocals' },
        ]}
        onChange={setStem}
      />
    );
  },
};

export const StrategyToggle: Story = {
  render: () => {
    // Simulating ConfigEditor's strategy toggle
    const [mode, setMode] = useState<string>('rhythmic');
    return (
      <SegmentedControl
        value={mode}
        label="Candidate mining strategy"
        options={[
          { value: 'rhythmic', label: 'Rhythmic' },
          { value: 'lyric_aligned', label: 'Lyric aligned' },
        ]}
        onChange={setMode}
      />
    );
  },
};

export const FourOptions: Story = {
  render: () => {
    const [filter, setFilter] = useState<string>('all');
    return (
      <SegmentedControl
        value={filter}
        label="Library filter"
        options={[
          { value: 'all',       label: 'All' },
          { value: 'generated',  label: 'Generated' },
          { value: 'imported',  label: 'Imported' },
          { value: 'keepers',   label: '★ Keepers' },
        ]}
        onChange={setFilter}
      />
    );
  },
};

export const WithDisabledOption: Story = {
  render: () => {
    const [value, setValue] = useState<string>('a');
    return (
      <SegmentedControl
        value={value}
        label="Option group"
        options={[
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B', disabled: true },
          { value: 'c', label: 'Option C' },
        ]}
        onChange={setValue}
      />
    );
  },
};
