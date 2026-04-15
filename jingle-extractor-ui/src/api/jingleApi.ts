/**
 * jingleApi.ts — RTK Query API definition for the Jingle Extractor backend.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  AnalysisConfig,
  AnalyzeAcceptedResponse,
  Candidate,
  CreateGenerationAcceptedResponse,
  DeleteCandidateResponse,
  ExportFormat,
  GenerationComposerValue,
  GenerationRunDetailResponse,
  GenerationRunSummary,
  GetAnalysisResponse,
  LibrarySort,
  LibrarySourceFilter,
  LibraryStatusFilter,
  Presets,
  StemType,
  Track,
  TrackLibraryItem,
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
  fade_in: number;
  fade_out: number;
  br: number | null;
  start?: number;
  end?: number;
}

export interface ExportBatchRequest {
  trackId: string;
  candidates: number[];
  stem: StemType;
  fmt: ExportFormat;
  fade_in: number;
  fade_out: number;
  br: number | null;
}

export interface ListLibraryTracksParams {
  source?: LibrarySourceFilter;
  status?: LibraryStatusFilter;
  search?: string;
  sort?: LibrarySort;
}

export interface AnalyzeTrackRequest {
  trackId: string;
  config: AnalysisConfig;
}

export interface AddManualCandidateRequest {
  trackId: string;
  start: number;
  end: number;
  source_text?: string;
}

export interface DeleteCandidateRequest {
  trackId: string;
  candidateId: number;
}

// ─── API definition ─────────────────────────────────────────────────────────

const API_BASE_URL =
  typeof window === 'undefined' ? 'http://localhost/api/' : '/api/';

export const jingleApi = createApi({
  reducerPath: 'jingleApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ['Analysis', 'Candidates', 'Tracks', 'Presets', 'Generations', 'Library'],
  endpoints: (builder) => ({
    // ── Analysis ────────────────────────────────────────────────────────────

    /**
     * POST /api/analyze
     * Run the full analysis pipeline on an audio file.
     * Returns track metadata, timeline data, vocals, and initial candidates.
     */
    analyze: builder.mutation<AnalyzeAcceptedResponse, AnalyzeRequest>({
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
    getAnalysis: builder.query<GetAnalysisResponse, string>({
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

    // ── Studio / Generation ───────────────────────────────────────────────

    /**
     * POST /api/generations
     * Start a MiniMax generation batch.
     */
    createGeneration: builder.mutation<CreateGenerationAcceptedResponse, GenerationComposerValue>({
      query: (body) => ({
        url: 'generations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Generations', 'Library'],
    }),

    /**
     * GET /api/generations
     * List generation runs.
     */
    listGenerations: builder.query<GenerationRunSummary[], void>({
      query: () => 'generations',
      providesTags: ['Generations'],
    }),

    /**
     * GET /api/generations/:id
     * Retrieve run detail including generated tracks.
     */
    getGeneration: builder.query<GenerationRunDetailResponse, string>({
      query: (generationId) => `generations/${encodeURIComponent(generationId)}`,
      providesTags: ['Generations', 'Library'],
    }),

    /**
     * GET /api/library/tracks
     * List library tracks with optional server-side filtering.
     */
    listLibraryTracks: builder.query<TrackLibraryItem[], ListLibraryTracksParams | void>({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.source && params.source !== 'all') query.set('source', params.source);
        if (params?.status && params.status !== 'all') query.set('status', params.status);
        if (params?.search) query.set('search', params.search);
        if (params?.sort && params.sort !== 'newest') query.set('sort', params.sort);
        const qs = query.toString();
        return qs ? `library/tracks?${qs}` : 'library/tracks';
      },
      providesTags: ['Library', 'Tracks'],
    }),

    /**
     * POST /api/library/tracks/:trackId/analyze
     * Analyze a known catalog track by id.
     */
    analyzeLibraryTrack: builder.mutation<AnalyzeAcceptedResponse, AnalyzeTrackRequest>({
      query: ({ trackId, config }) => ({
        url: `library/tracks/${encodeURIComponent(trackId)}/analyze`,
        method: 'POST',
        body: { config },
      }),
      invalidatesTags: ['Analysis', 'Tracks', 'Library'],
    }),

    /**
     * POST /api/tracks/:trackId/candidates/manual
     * Add a manually-defined candidate interval.
     */
    addManualCandidate: builder.mutation<Candidate, AddManualCandidateRequest>({
      query: ({ trackId, ...body }) => ({
        url: `tracks/${encodeURIComponent(trackId)}/candidates/manual`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Candidates', 'Analysis'],
    }),

    /**
     * DELETE /api/tracks/:trackId/candidates/:candidateId
     * Delete a candidate by id.
     */
    deleteCandidate: builder.mutation<DeleteCandidateResponse, DeleteCandidateRequest>({
      query: ({ trackId, candidateId }) => ({
        url: `tracks/${encodeURIComponent(trackId)}/candidates/${candidateId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Candidates', 'Analysis'],
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
  useCreateGenerationMutation,
  useListGenerationsQuery,
  useGetGenerationQuery,
  useListLibraryTracksQuery,
  useAnalyzeLibraryTrackMutation,
  useAddManualCandidateMutation,
  useDeleteCandidateMutation,
  useListTracksQuery,
  useGetPresetsQuery,
} = jingleApi;
