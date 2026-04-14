/**
 * ScoreBar.stories.tsx — Storybook stories for ScoreBar.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScoreBar } from './ScoreBar';

const meta = {
  component: ScoreBar,
  title: 'JingleExtractor/ScoreBar',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof ScoreBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ────────────────────────────────────────────────────────────────

export const HighScore: Story = {
  args: { label: 'Attack', value: 95 },
};

export const MediumScore: Story = {
  args: { label: 'Energy', value: 63 },
};

export const LowScore: Story = {
  args: { label: 'Ending', value: 27 },
};

export const PerfectScore: Story = {
  name: 'Perfect Score (100)',
  args: { label: 'Overall', value: 100 },
};

export const ZeroScore: Story = {
  name: 'Zero Score',
  args: { label: 'Energy', value: 0 },
};
