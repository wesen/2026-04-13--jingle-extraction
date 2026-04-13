/**
 * handlers.ts — MSW request handlers for Jingle Extractor API.
 * These intercept fetch calls in the browser during dev and in Storybook.
 */

import { http, HttpResponse, delay } from 'msw';
import type { AnalysisConfig, Presets } from '../api/types';
import thrashMetalFixture from './fixtures/thrash-metal.json';

// Re-export presets from constants (MSW needs importable data)
const PRESETS: Presets = {
  Default: {
    min_dur: 2.0,
    max_dur: 4.5,
    min_score: 75,
    vocal_mode: 'inst',
    atk_w: 6,
    end_w: 4,
    nrg_w: 3,
    beat_w: 3,
    max_cand: 5,
    fade_in: 8,
    fade_out: 18,
    fmt: 'mp3',
    br: 192,
  },
  'Short Stings': {
    min_dur: 1.0,
    max_dur: 2.5,
    min_score: 80,
    vocal_mode: 'any',
    atk_w: 8,
    end_w: 5,
    nrg_w: 4,
    beat_w: 2,
    max_cand: 8,
    fade_in: 4,
    fade_out: 10,
    fmt: 'mp3',
    br: 192,
  },
  'Long Beds': {
    min_dur: 4.0,
    max_dur: 8.0,
    min_score: 60,
    vocal_mode: 'inst',
    atk_w: 2,
    end_w: 2,
    nrg_w: 5,
    beat_w: 4,
    max_cand: 3,
    fade_in: 50,
    fade_out: 100,
    fmt: 'wav',
    br: null,
  },
  'Vocal Hooks': {
    min_dur: 0.5,
    max_dur: 4.0,
    min_score: 70,
    vocal_mode: 'vocal',
    atk_w: 3,
    end_w: 3,
    nrg_w: 2,
    beat_w: 1,
    max_cand: 10,
    fade_in: 4,
    fade_out: 8,
    fmt: 'mp3',
    br: 320,
  },
};

export const handlers = [
  // ── GET /api/analysis/:trackId ──────────────────────────────────────────
  http.get('/api/analysis/:trackId', async ({ params }) => {
    await delay(400);
    const { trackId } = params;
    if (trackId === 'thrash_metal_01') {
      return HttpResponse.json(thrashMetalFixture);
    }
    return HttpResponse.json(thrashMetalFixture, {
      status: 200,
    });
  }),

  // ── POST /api/analyze ────────────────────────────────────────────────────
  http.post('/api/analyze', async ({ request }) => {
    const body = (await request.json()) as { audio_file: string; config: AnalysisConfig };
    // Simulate processing time
    await delay(1500);
    console.info('[MSW] analyze request:', body.audio_file, body.config);
    return HttpResponse.json(thrashMetalFixture, { status: 200 });
  }),

  // ── POST /api/mine ───────────────────────────────────────────────────────
  http.post('/api/mine', async ({ request }) => {
    const body = (await request.json()) as { trackId: string; config: AnalysisConfig };
    await delay(500);
    console.info('[MSW] mine request:', body.trackId, body.config);
    // Return the candidates from the fixture
    return HttpResponse.json(thrashMetalFixture.candidates, {
      status: 200,
    });
  }),

  // ── POST /api/export ────────────────────────────────────────────────────
  http.post('/api/export', async ({ request }) => {
    const body = (await request.json()) as {
      trackId: string;
      candidateId: number;
      stem: string;
      fmt: string;
    };
    console.info('[MSW] export request:', body);
    // Return a minimal silent MP3 blob (44 bytes — minimal valid MP3 header)
    const silentMp3 = new Uint8Array([
      0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    return new HttpResponse(silentMp3, {
      status: 200,
      headers: {
        'Content-Type': body.fmt === 'wav' ? 'audio/wav' : 'audio/mpeg',
        'Content-Disposition': `attachment; filename="clip_${body.candidateId}.${body.fmt}"`,
      },
    });
  }),

  // ── POST /api/export/batch ───────────────────────────────────────────────
  http.post('/api/export/batch', async ({ request }) => {
    const body = (await request.json()) as {
      trackId: string;
      candidates: number[];
      stem: string;
      fmt: string;
    };
    console.info('[MSW] batch export request:', body);
    // Return empty zip for dev
    return HttpResponse.json({ received: body }, { status: 200 });
  }),

  // ── GET /api/tracks ──────────────────────────────────────────────────────
  http.get('/api/tracks', async () => {
    await delay(200);
    return HttpResponse.json([thrashMetalFixture.track], { status: 200 });
  }),

  // ── GET /api/presets ────────────────────────────────────────────────────
  http.get('/api/presets', async () => {
    await delay(100);
    return HttpResponse.json(PRESETS, { status: 200 });
  }),
];

export { PRESETS };
