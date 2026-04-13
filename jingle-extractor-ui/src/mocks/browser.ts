/**
 * browser.ts — MSW browser worker setup.
 * Import this in main.tsx or Storybook preview to activate MSW.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
