/**
 * JingleExtractor.stories.tsx — Integration stories for the full JingleExtractor widget.
 *
 * These stories use Redux Provider to provide mock state directly (no MSW needed).
 * The full widget reads from RTK Query which would normally be backed by MSW handlers.
 * For Storybook, we provide the data via the Redux store directly.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { jingleApi } from '../../api/jingleApi';
import { analysisSlice } from '../../features/analysis/analysisSlice';
import { audioSlice } from '../../features/audio/audioSlice';
import { JingleExtractor } from './JingleExtractor';

// ── Store factory ─────────────────────────────────────────────────────────────

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

// ── Stories ───────────────────────────────────────────────────────────────────

export default {
  title: 'JingleExtractor/Integration',
  tags: ['autodocs'],
  decorators: [
    // eslint-disable-next-line react/display-name
    (Story: React.ComponentType) => (
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
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Retro: any = () => <JingleExtractor trackId="thrash_metal_01" />;
Retro.storyName = 'Retro Theme (1-bit Mac)';
Retro.parameters = { backgrounds: { default: 'retro' } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DarkTheme: any = () => (
  <Provider store={makeStore()}>
    <div
      data-widget="jingle-extractor"
      data-je-theme="dark"
      style={{ height: '100vh', background: '#1a1a2e' }}
    >
      <JingleExtractor trackId="thrash_metal_01" />
    </div>
  </Provider>
);
DarkTheme.storyName = 'Dark Theme';
DarkTheme.parameters = { backgrounds: { default: 'dark' } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LightTheme: any = () => (
  <Provider store={makeStore()}>
    <div
      data-widget="jingle-extractor"
      data-je-theme="light"
      style={{ height: '100vh', background: '#f5f5f5' }}
    >
      <JingleExtractor trackId="thrash_metal_01" />
    </div>
  </Provider>
);
LightTheme.storyName = 'Light Theme';
LightTheme.parameters = { backgrounds: { default: 'light' } };
