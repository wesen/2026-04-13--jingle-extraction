// @vitest-environment jsdom

import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { analysisSlice } from '../../features/analysis/analysisSlice';
import { audioSlice } from '../../features/audio/audioSlice';
import { studioSlice } from '../../features/studio/studioSlice';
import {
  currentRunFixture,
  currentRunTracksFixture,
  libraryTracksFixture,
} from '../../mocks/fixtures/studio';
import { StudioScreenContainer } from './StudioScreenContainer';

function renderContainer() {
  const store = configureStore({
    reducer: {
      analysis: analysisSlice.reducer,
      audio: audioSlice.reducer,
      studio: studioSlice.reducer,
    },
  });

  const utils = render(
    <Provider store={store}>
      <div data-widget="jingle-extractor" data-je-theme="retro">
        <StudioScreenContainer
          currentRun={currentRunFixture}
          currentRunTracks={currentRunTracksFixture}
          libraryTracks={libraryTracksFixture}
          onGenerate={() => undefined}
          onSavePrompt={() => undefined}
          onAnalyzeTrack={() => undefined}
          onOpenInMining={() => undefined}
        />
      </div>
    </Provider>
  );

  return { ...utils, store };
}

describe('StudioScreenContainer interactions', () => {
  it('updates inspector when selecting a track row', async () => {
    const user = userEvent.setup();
    const { container } = renderContainer();

    const inspector = container.querySelector("[data-part='track-inspector']");
    expect(inspector).toBeTruthy();
    expect(within(inspector as HTMLElement).getByText(/select a track/i)).toBeTruthy();

    await user.click(screen.getAllByText('thrash_hook_03')[0]);

    expect(within(inspector as HTMLElement).getByText('thrash_hook_03')).toBeTruthy();
    expect(within(inspector as HTMLElement).getByText(/uploaded/i)).toBeTruthy();
  });

  it('applies library search + status + source filters', async () => {
    const user = userEvent.setup();
    const { container } = renderContainer();

    const library = container.querySelector("[data-part='track-library-list']");
    expect(library).toBeTruthy();

    const scope = within(library as HTMLElement);

    const searchInput = scope.getByRole('textbox') as HTMLInputElement;
    const statusFilter = scope.getAllByRole('combobox')[0] as HTMLSelectElement;

    await user.type(searchInput, 'power');
    expect(scope.getByText('power_metal_01')).toBeTruthy();
    expect(scope.queryByText('thrash_hook_01')).toBeNull();

    await user.selectOptions(statusFilter, 'analyzed');
    expect(scope.getByText('power_metal_01')).toBeTruthy();

    await user.click(scope.getByRole('button', { name: /imported/i }));
    expect(scope.queryByText('power_metal_01')).toBeNull();

    await user.clear(searchInput);
    expect(scope.getByText('upload_take_03')).toBeTruthy();
  });
});
