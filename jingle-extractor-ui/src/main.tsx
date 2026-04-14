import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import './app/theme/tokens.css';
import './app/theme/theme-retro.css';
import './app/theme/theme-dark.css';
import './app/theme/theme-light.css';
import App from './App';

async function enableMocking() {
  // Only enable MSW when explicitly requested via VITE_API_MOCKING=true
  // Otherwise, requests go to the real backend (via Vite proxy)
  if (import.meta.env.DEV && import.meta.env.VITE_API_MOCKING === 'true') {
    const { worker } = await import('./mocks/browser');
    return worker.start({
      onUnhandledRequest: 'bypass',
    });
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </StrictMode>,
  );
});
