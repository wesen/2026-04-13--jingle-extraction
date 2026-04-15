import type { Meta, StoryObj } from '@storybook/react-vite';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import type { GenerationComposerValue } from '../../api/types';
import { analysisSlice } from '../../features/analysis/analysisSlice';
import { audioSlice } from '../../features/audio/audioSlice';
import { setDraft, studioSlice } from '../../features/studio/studioSlice';
import { studioComposerFixture } from '../../mocks/fixtures/studio';
import { withWidgetWindow } from '../storybook/widgetStoryDecorators';
import { GenerationComposerContainer } from './GenerationComposerContainer';

function makeStore(preloadedDraft?: GenerationComposerValue) {
  const store = configureStore({
    reducer: {
      analysis: analysisSlice.reducer,
      audio: audioSlice.reducer,
      studio: studioSlice.reducer,
    },
  });

  if (preloadedDraft) {
    store.dispatch(setDraft(preloadedDraft));
  }

  return store;
}

const meta = {
  component: GenerationComposerContainer,
  title: 'JingleExtractor/Studio/GenerationComposerContainer',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [withWidgetWindow({ title: 'Generate Track Batch', style: { padding: 8, maxWidth: 760 } })],
} satisfies Meta<typeof GenerationComposerContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

function StoreBackedComposer({ preloadedDraft }: { preloadedDraft?: GenerationComposerValue }) {
  const store = makeStore(preloadedDraft);
  return (
    <Provider store={store}>
      <GenerationComposerContainer onGenerate={() => undefined} onSavePrompt={() => undefined} />
    </Provider>
  );
}

export const Default: Story = {
  render: () => <StoreBackedComposer preloadedDraft={studioComposerFixture} />,
};

export const InvalidDraft: Story = {
  render: () => (
    <StoreBackedComposer
      preloadedDraft={{
        ...studioComposerFixture,
        prompt: '',
        model: '',
        count: 0,
      }}
    />
  ),
};

export const NarrowLayout: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <StoreBackedComposer preloadedDraft={studioComposerFixture} />
    </div>
  ),
};
