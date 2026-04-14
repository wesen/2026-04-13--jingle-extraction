/**
 * ConfigEditor.stories.tsx — Storybook stories for ConfigEditor.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ConfigEditor } from './ConfigEditor';
import type { AnalysisConfig } from '../../api/types';

const DEFAULT_CONFIG: AnalysisConfig = {
  min_dur: 2.0,
  max_dur: 4.5,
  min_score: 75,
  vocal_mode: 'inst',
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
// Story type — use base StoryObj so render() without args works
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Story = StoryObj<any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function configStory(name: string, config: AnalysisConfig, isLoading = false): Story {
  return {
    name,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    render: (_args: any) => {
      const [cfg, setCfg] = useState(config);
      return (
        <div style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
          <ConfigEditor
            config={cfg}
            onChange={setCfg}
            onRun={() => alert('Run analysis!')}
            onReset={() => setCfg(config)}
            isLoading={isLoading}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          />
        </div>
      );
    },
  } as Story;
}

// ── Stories ────────────────────────────────────────────────────────────────

export const DefaultConfig = configStory('Default Config', DEFAULT_CONFIG);
export const LongBedsConfig = configStory('Long Beds Config (WAV)', LONG_BEDS_CONFIG);
export const LoadingState = configStory('Loading State', DEFAULT_CONFIG, true);
