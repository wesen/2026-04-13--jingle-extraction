/**
 * TransportBar.stories.tsx — Storybook stories for TransportBar.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
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
type Story = StoryObj<typeof meta>;

function makeStory(
  name: string,
  playhead: number,
  duration: number,
  stem: StemType,
  isPlaying: boolean
): Story {
  return {
    name,
    args: {
      playhead,
      duration,
      stem,
      isPlaying,
      onStemChange: () => {},
      onPlay: () => {},
      onPause: () => {},
      onSeekBack: () => {},
      onSeekForward: () => {},
    },
  };
}

export const StoppedInst = makeStory('Stopped (Instrumental)', 39.1, 55.59, 'inst', false);
export const PlayingVox = makeStory('Playing (Vocals)', 12.3, 55.59, 'vox', true);
export const AtEnd = makeStory('At End', 55.5, 55.59, 'orig', false);
export const AtStart = makeStory('At Start', 0, 55.59, 'inst', false);
