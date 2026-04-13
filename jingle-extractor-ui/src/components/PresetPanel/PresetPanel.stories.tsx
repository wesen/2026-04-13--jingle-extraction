/**
 * PresetPanel.stories.tsx — Storybook stories for PresetPanel.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { PresetPanel } from './PresetPanel';
import type { PresetName } from '../../api/types';

const ALL_PRESETS: PresetName[] = ['Default', 'Short Stings', 'Long Beds', 'Vocal Hooks'];

const meta = {
  component: PresetPanel,
  title: 'JingleExtractor/PresetPanel',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    activePreset: {
      control: 'select',
      options: [null, 'Default', 'Short Stings', 'Long Beds', 'Vocal Hooks'],
    },
  },
} satisfies Meta<typeof PresetPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ────────────────────────────────────────────────────────────────

export const NoSelection: Story = {
  name: 'No Selection',
  args: {
    presets: ALL_PRESETS,
    activePreset: null as PresetName | null,
    onSelect: () => {},
  },
};

export const DefaultSelected: Story = {
  name: 'Default Selected',
  args: {
    presets: ALL_PRESETS,
    activePreset: 'Default' as PresetName,
    onSelect: () => {},
  },
};

export const ShortStingsSelected: Story = {
  name: 'Short Stings Selected',
  args: {
    presets: ALL_PRESETS,
    activePreset: 'Short Stings' as PresetName,
    onSelect: () => {},
  },
};
