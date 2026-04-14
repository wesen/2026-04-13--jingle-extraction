/**
 * ConfigEditor.stories.tsx — Storybook stories for ConfigEditor.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ConfigEditor } from './ConfigEditor';
import type { AnalysisConfig } from '../../api/types';

const DEFAULT_CONFIG: AnalysisConfig = {
  min_dur: 2.0,
  max_dur: 4.5,
  min_score: 75,
  vocal_mode: 'inst',
  candidate_mode: 'rhythmic',
  lyric_padding_before: 0.5,
  lyric_padding_after: 0.5,
  atk_w: 6,
  end_w: 4,
  nrg_w: 3,
  beat_w: 3,
  max_cand: 5,
  fade_in: 20,
  fade_out: 50,
  fmt: 'mp3',
  br: 192,
};

const LONG_BEDS_CONFIG: AnalysisConfig = {
  min_dur: 4.0,
  max_dur: 8.0,
  min_score: 60,
  vocal_mode: 'inst',
  candidate_mode: 'rhythmic',
  lyric_padding_before: 0.5,
  lyric_padding_after: 0.5,
  atk_w: 2,
  end_w: 2,
  nrg_w: 5,
  beat_w: 4,
  max_cand: 3,
  fade_in: 20,
  fade_out: 50,
  fmt: 'wav',
  br: null,
};

const meta = {
  component: ConfigEditor,
  title: 'JingleExtractor/ConfigEditor',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof ConfigEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

function makeStory(name: string, config: AnalysisConfig, isLoading = false): Story {
  return {
    name,
    args: {
      config,
      onChange: () => {},
      onRun: () => {},
      onReset: () => {},
      isLoading,
      style: { flex: 1, display: 'flex', flexDirection: 'column' },
    },
    render: (args) => {
      const [cfg, setCfg] = useState(config);
      return (
        <div style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
          <ConfigEditor
            {...args}
            config={cfg}
            onChange={setCfg}
            onRun={() => alert('Run analysis!')}
            onReset={() => setCfg(config)}
          />
        </div>
      );
    },
  };
}

export const DefaultConfig = makeStory('Default Config', DEFAULT_CONFIG);
export const LongBedsConfig = makeStory('Long Beds Config (WAV)', LONG_BEDS_CONFIG);
export const LoadingState = makeStory('Loading State', DEFAULT_CONFIG, true);
