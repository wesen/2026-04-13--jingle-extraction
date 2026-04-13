/**
 * MenuBar.stories.tsx — Storybook stories for MenuBar.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { MenuBar } from './MenuBar';
import type { Track } from '../../api/types';

const thrashTrack: Track = {
  id: 'thrash_metal_01',
  duration: 55.59,
  bpm: 166.7,
  language: 'en',
  lang_conf: 0.76,
  sr: 44100,
  dr_db: 49.9,
};

const slowTrack: Track = {
  id: 'doom_metal_slow',
  duration: 76.3,
  bpm: 58.4,
  language: 'en',
  lang_conf: 0.62,
  sr: 44100,
  dr_db: 42.1,
};

const meta = {
  component: MenuBar,
  title: 'JingleExtractor/MenuBar',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'light' },
  },
} satisfies Meta<typeof MenuBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ────────────────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Default (Thrash Metal)',
  args: {
    track: thrashTrack,
  },
};

export const SlowTrack: Story = {
  name: 'Slow Track (Doom Metal)',
  args: {
    track: slowTrack,
  },
};

export const ShortTrack: Story = {
  name: 'Short Track',
  args: {
    track: { ...thrashTrack, id: 'short_sting', duration: 3.2, bpm: 140 },
  },
};
