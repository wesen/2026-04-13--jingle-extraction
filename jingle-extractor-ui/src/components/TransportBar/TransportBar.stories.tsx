/**
 * TransportBar.stories.tsx — Storybook stories for TransportBar.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { TransportBar } from './TransportBar';
import type { StemType } from '../../api/types';

const meta = {
  component: TransportBar,
  title: 'JingleExtractor/TransportBar',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'light' },
  },
} satisfies Meta<typeof TransportBar>;

export default meta;

// Story type — callbacks are required by SB10 args system, so use render()
type Story = StoryObj<typeof TransportBar>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const story = (name: string, playhead: number, duration: number, stem: StemType, isPlaying: boolean): Story =>
  ({
    name,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    render: (_args: any) => (
      <TransportBar
        playhead={playhead}
        duration={duration}
        stem={stem}
        isPlaying={isPlaying}
        onStemChange={() => {}}
        onPlay={() => {}}
        onPause={() => {}}
        onSeekBack={() => {}}
        onSeekForward={() => {}}
      />
    ),
  }) as Story;

// ── Stories ────────────────────────────────────────────────────────────────

export const StoppedInst = story('Stopped (Instrumental)', 39.1, 55.59, 'inst' as StemType, false);
export const PlayingVox = story('Playing (Vocals)', 12.3, 55.59, 'vox' as StemType, true);
export const AtEnd = story('At End', 55.5, 55.59, 'orig' as StemType, false);
export const AtStart = story('At Start', 0, 55.59, 'inst' as StemType, false);
