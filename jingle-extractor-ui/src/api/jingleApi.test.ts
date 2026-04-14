import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { jingleApi } from './jingleApi';
import type { AnalysisConfig, GetAnalysisResponse } from './types';

const defaultConfig: AnalysisConfig = {
  min_dur: 2,
  max_dur: 4.5,
  min_score: 75,
  vocal_mode: 'inst',
  candidate_mode: 'rhythmic',
  lyric_padding_before: 0.5,
  lyric_padding_after: 0.5,
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

function makeStore() {
  return configureStore({
    reducer: {
      [jingleApi.reducerPath]: jingleApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(jingleApi.middleware),
  });
}

describe('jingleApi status-bearing responses', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses POST /api/analyze 202 accepted responses correctly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ track_id: 'thrash_metal_01', status: 'uploaded' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const store = makeStore();
    const result = await store.dispatch(
      jingleApi.endpoints.analyze.initiate({
        audio_file: '/tmp/thrash_metal_01.mp3',
        config: defaultConfig,
      })
    );

    expect('data' in result && result.data).toEqual({
      track_id: 'thrash_metal_01',
      status: 'uploaded',
    });
  });

  it('preserves GET /api/analysis pending responses as non-complete status payloads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          track_id: 'thrash_metal_01',
          status: 'transcribing',
          error_message: null,
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const store = makeStore();
    const result = await store.dispatch(
      jingleApi.endpoints.getAnalysis.initiate('thrash_metal_01')
    );

    const data = ('data' in result ? result.data : undefined) as GetAnalysisResponse | undefined;
    expect(data).toBeDefined();
    expect(data && 'track' in data).toBe(false);
    expect(data).toEqual({
      track_id: 'thrash_metal_01',
      status: 'transcribing',
      error_message: null,
    });
  });
});
