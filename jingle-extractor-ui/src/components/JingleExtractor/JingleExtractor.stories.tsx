/**
 * JingleExtractor.stories.tsx — Integration stories for the full JingleExtractor widget.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { jingleApi } from '../../api/jingleApi';
import { analysisSlice } from '../../features/analysis/analysisSlice';
import { audioSlice } from '../../features/audio/audioSlice';
import { JingleExtractor } from './JingleExtractor';

function makeStore() {
  return configureStore({
    reducer: {
      [jingleApi.reducerPath]: jingleApi.reducer,
      analysis: analysisSlice.reducer,
      audio: audioSlice.reducer,
    },
    middleware: (getDefault) => getDefault().concat(jingleApi.middleware),
  });
}

const meta = {
  title: 'JingleExtractor/Integration',
  component: JingleExtractor,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Provider store={makeStore()}>
        <div
          data-widget="jingle-extractor"
          data-je-theme="retro"
          style={{ height: '100vh' }}
        >
          <Story />
        </div>
      </Provider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof JingleExtractor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RetroTheme: Story = {
  render: () => <JingleExtractor trackId="thrash_metal_01" />,
  parameters: { backgrounds: { default: 'retro' } },
};

export const DarkTheme: Story = {
  render: () => (
    <Provider store={makeStore()}>
      <div
        data-widget="jingle-extractor"
        data-je-theme="dark"
        style={{ height: '100vh', background: '#1a1a2e' }}
      >
        <JingleExtractor trackId="thrash_metal_01" />
      </div>
    </Provider>
  ),
  parameters: { backgrounds: { default: 'dark' } },
};

export const LightTheme: Story = {
  render: () => (
    <Provider store={makeStore()}>
      <div
        data-widget="jingle-extractor"
        data-je-theme="light"
        style={{ height: '100vh', background: '#f5f5f5' }}
      >
        <JingleExtractor trackId="thrash_metal_01" />
      </div>
    </Provider>
  ),
  parameters: { backgrounds: { default: 'light' } },
};
