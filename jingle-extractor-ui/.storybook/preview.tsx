import type { Preview } from '@storybook/react-vite';
import { Provider } from 'react-redux';
import { store } from '../src/app/store';
import '../src/app/theme/tokens.css';
import '../src/app/theme/theme-retro.css';
import '../src/app/theme/theme-dark.css';
import '../src/app/theme/theme-light.css';
import { initialize, mswLoader } from 'msw-storybook-addon';

/**
 * Initialize MSW for Storybook.
 * This starts a service worker that intercepts fetch requests.
 */
initialize({
  onUnhandledRequest: 'bypass',
});

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
   * Wrap every story with the Redux Provider.
   */
  decorators: [
    (Story) => (
      <Provider store={store}>
        <div data-widget="jingle-extractor" data-je-theme="retro">
          <Story />
        </div>
      </Provider>
    ),
  ],

  loaders: [mswLoader],
};

export default preview;
