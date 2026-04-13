/**
 * jingleApi.ts — RTK Query API definition for the Jingle Extractor backend.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  AnalysisConfig,
  AnalysisResponse,
  Candidate,
  ExportFormat,
  Presets,
  StemType,
  Track,
} from './types';

// ─── Request / Response types ────────────────────────────────────────────────

export interface AnalyzeRequest {
  audio_file: string; // path or URL to the audio file
  config: AnalysisConfig;
}

export interface MineRequest {
  trackId: string;
  config: AnalysisConfig;
}

export interface ExportRequest {
  trackId: string;
  candidateId: number;
  stem: StemType;
  fmt: ExportFormat;
}

export interface ExportBatchRequest {
  trackId: string;
  candidates: number[];
  stem: StemType;
  fmt: ExportFormat;
}

// ─── API definition ─────────────────────────────────────────────────────────

export const jingleApi = createApi({
  reducerPath: 'jingleApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  tagTypes: ['Analysis', 'Candidates', 'Tracks', 'Presets'],
  endpoints: (builder) => ({
    // ── Analysis ────────────────────────────────────────────────────────────

    /**
     * POST /api/analyze
     * Run the full analysis pipeline on an audio file.
     * Returns track metadata, timeline data, vocals, and initial candidates.
     */
    analyze: builder.mutation<AnalysisResponse, AnalyzeRequest>({
      query: (body) => ({
        url: 'analyze',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Analysis', 'Candidates', 'Tracks'],
    }),

    /**
     * GET /api/analysis/:trackId
     * Retrieve previously computed analysis results.
     */
    getAnalysis: builder.query<AnalysisResponse, string>({
      query: (trackId) => `analysis/${encodeURIComponent(trackId)}`,
      providesTags: ['Analysis'],
    }),

    // ── Candidates ─────────────────────────────────────────────────────────

    /**
     * POST /api/mine
     * Re-run the candidate mining algorithm with different config weights.
     */
    mineCandidates: builder.mutation<Candidate[], MineRequest>({
      query: (body) => ({
        url: 'mine',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Candidates'],
    }),

    // ── Export ─────────────────────────────────────────────────────────────

    /**
     * POST /api/export
     * Export a single candidate clip as audio file.
     * Returns a Blob (audio/mpeg or audio/wav).
     */
    exportClip: builder.mutation<Blob, ExportRequest>({
      query: (body) => ({
        url: 'export',
        method: 'POST',
        body,
        responseHandler: (response) => response.blob(),
      }),
    }),

    /**
     * POST /api/export/batch
     * Export multiple candidate clips as a zip archive.
     */
    exportBatch: builder.mutation<Blob, ExportBatchRequest>({
      query: (body) => ({
        url: 'export/batch',
        method: 'POST',
        body,
        responseHandler: (response) => response.blob(),
      }),
    }),

    // ── Catalog ─────────────────────────────────────────────────────────────

    /**
     * GET /api/tracks
     * List all previously analyzed tracks.
     */
    listTracks: builder.query<Track[], void>({
      query: () => 'tracks',
      providesTags: ['Tracks'],
    }),

    /**
     * GET /api/presets
     * Get all available analysis preset configurations.
     */
    getPresets: builder.query<Presets, void>({
      query: () => 'presets',
      providesTags: ['Presets'],
    }),
  }),
});

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const {
  useAnalyzeMutation,
  useGetAnalysisQuery,
  useMineCandidatesMutation,
  useExportClipMutation,
  useExportBatchMutation,
  useListTracksQuery,
  useGetPresetsQuery,
} = jingleApi;
