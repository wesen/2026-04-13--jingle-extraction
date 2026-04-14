import type { Preview } from '@storybook/react-vite';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '../src/app/theme/tokens.css';
import '../src/app/theme/theme-retro.css';
import '../src/app/theme/theme-dark.css';
import '../src/app/theme/theme-light.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },

  /**
   * Wrap every story with the Redux Provider (for stories that need it).
   */
  decorators: [
    // eslint-disable-next-line react/display-name
    (Story) => (
      <Provider
        store={configureStore({
          reducer: {
            analysis: () => ({ theme: 'retro' }),
            audio: () => ({
              isPlaying: false,
              currentTime: 0,
              duration: 0,
              volume: 1,
            }),
          },
        })}
      >
        <div data-widget="jingle-extractor" data-je-theme="retro">
          <Story />
        </div>
      </Provider>
    ),
  ],
};

export default preview;
