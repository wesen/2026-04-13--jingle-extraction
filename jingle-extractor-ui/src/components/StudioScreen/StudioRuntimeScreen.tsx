import { useEffect, useMemo, useState } from 'react';
import {
  useAnalyzeLibraryTrackMutation,
  useCreateGenerationMutation,
  useGetGenerationQuery,
  useListGenerationsQuery,
  useListLibraryTracksQuery,
} from '../../api/jingleApi';
import type { GenerationComposerValue, GenerationRunSummary, TrackLibraryItem } from '../../api/types';
import { setActiveScreen, setSelectedRunId, setSelectedTrackId } from '../../features/studio/studioSlice';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { StudioScreenContainer } from './StudioScreenContainer';

const RUN_POLL_INTERVAL_MS = 2500;
const LIBRARY_POLL_INTERVAL_MS = 5000;

function isRunActive(status: GenerationRunSummary['status']) {
  return status === 'queued' || status === 'generating';
}

function toRunSummaryFromDetail(detail: {
  id: string;
  name: string;
  prompt: string;
  lyrics?: string | null;
  model: string;
  mode: GenerationRunSummary['mode'];
  countRequested: number;
  countCompleted: number;
  status: GenerationRunSummary['status'];
  createdAt?: string;
}): GenerationRunSummary {
  return {
    id: detail.id,
    name: detail.name,
    prompt: detail.prompt,
    lyrics: detail.lyrics,
    model: detail.model,
    mode: detail.mode,
    countRequested: detail.countRequested,
    countCompleted: detail.countCompleted,
    status: detail.status,
    createdAt: detail.createdAt,
  };
}

export function StudioRuntimeScreen() {
  const dispatch = useAppDispatch();
  const selectedRunId = useAppSelector((s) => s.studio.selectedRunId);
  const previewTrackId = useAppSelector((s) => s.studio.previewTrackId);
  const analysisConfig = useAppSelector((s) => s.analysis.config);

  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const audioPlayer = useAudioPlayer();

  const {
    data: generationRuns = [],
    isFetching: isFetchingRuns,
  } = useListGenerationsQuery(undefined, {
    pollingInterval: LIBRARY_POLL_INTERVAL_MS,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const effectiveRunId = selectedRunId ?? generationRuns[0]?.id ?? null;

  useEffect(() => {
    if (!selectedRunId && effectiveRunId) {
      dispatch(setSelectedRunId(effectiveRunId));
    }
  }, [dispatch, effectiveRunId, selectedRunId]);

  const {
    data: runDetail,
    isFetching: isFetchingRunDetail,
  } = useGetGenerationQuery(effectiveRunId ?? '', {
    skip: !effectiveRunId,
    pollingInterval: RUN_POLL_INTERVAL_MS,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const [createGeneration, { isLoading: isCreatingGeneration }] = useCreateGenerationMutation();
  const [analyzeTrack, { isLoading: isAnalyzingTrack }] = useAnalyzeLibraryTrackMutation();

  const {
    data: libraryTracks = [],
    isFetching: isFetchingLibrary,
  } = useListLibraryTracksQuery(undefined, {
    pollingInterval: LIBRARY_POLL_INTERVAL_MS,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const currentRun = useMemo<GenerationRunSummary | null>(() => {
    if (runDetail) return toRunSummaryFromDetail(runDetail);
    if (effectiveRunId) {
      return generationRuns.find((run) => run.id === effectiveRunId) ?? null;
    }
    return generationRuns[0] ?? null;
  }, [effectiveRunId, generationRuns, runDetail]);

  const currentRunTracks = runDetail?.tracks ?? [];

  const isGenerating = isCreatingGeneration || (currentRun ? isRunActive(currentRun.status) : false);

  const handleGenerate = async (draft: GenerationComposerValue) => {
    try {
      setRuntimeError(null);
      const accepted = await createGeneration(draft).unwrap();
      dispatch(setSelectedRunId(accepted.generation_id));
      dispatch(setSelectedTrackId(null));
    } catch (e) {
      setRuntimeError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleAnalyzeTrack = async (track: TrackLibraryItem) => {
    try {
      setRuntimeError(null);
      await analyzeTrack({ trackId: track.id, config: analysisConfig }).unwrap();
    } catch (e) {
      setRuntimeError(e instanceof Error ? e.message : String(e));
    }
  };

  const handlePreviewTrack = async (track: TrackLibraryItem) => {
    if (previewTrackId === track.id && audioPlayer.isPlaying) {
      audioPlayer.stop();
      return;
    }

    try {
      setRuntimeError(null);
      await audioPlayer.playTrack(`/api/tracks/${encodeURIComponent(track.id)}/audio/orig`);
    } catch (e) {
      setRuntimeError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      {runtimeError && (
        <div
          style={{
            margin: '8px',
            border: '2px solid var(--je-color-border, #000)',
            borderRadius: '6px',
            padding: '6px 8px',
            background: 'var(--je-color-surface, #fff)',
            fontFamily: 'var(--je-font-family, monospace)',
            fontSize: 'var(--je-font-size-md, 11px)',
          }}
        >
          Studio error: {runtimeError}
        </div>
      )}

      <StudioScreenContainer
        currentRun={currentRun}
        currentRunTracks={currentRunTracks}
        libraryTracks={libraryTracks}
        onGenerate={handleGenerate}
        onSavePrompt={() => undefined}
        onPreviewTrack={handlePreviewTrack}
        onAnalyzeTrack={handleAnalyzeTrack}
        onOpenInMining={(track) => {
          audioPlayer.stop();
          dispatch(setSelectedTrackId(track.id));
          dispatch(setActiveScreen('mining'));
        }}
        isGenerating={
          isGenerating
          || isFetchingRunDetail
          || isFetchingRuns
          || isFetchingLibrary
          || isAnalyzingTrack
        }
      />
    </>
  );
}
