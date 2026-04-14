/**
 * JingleExtractor.tsx — Root widget composing all JingleExtractor components.
 *
 * Playback model:
 * - useAudioPlayer owns the live HTMLAudioElement lifecycle.
 * - Redux stores projected UI state such as playhead, selected candidate, stem, and config.
 * - Candidate timeline edits are local-only until a future explicit persistence API exists.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useAnalyzeMutation, useGetAnalysisQuery, useExportClipMutation } from '../../api/jingleApi';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import {
  applyPreset,
  clearCandidateEdit,
  setConfig,
  setPlayhead,
  setSelectedCandidate,
  setStem,
  updateCandidateEnd,
  updateCandidateStart,
} from '../../features/analysis/analysisSlice';
import { MacWindow } from '../MacWindow';
import { MenuBar } from '../MenuBar';
import { TransportBar } from '../TransportBar';
import { PresetPanel } from '../PresetPanel';
import { ConfigEditor } from '../ConfigEditor';
import { Timeline } from '../Timeline';
import { CandidateList } from '../CandidateList';
import { CandidateDetail } from '../CandidateDetail';
import { DEFAULT_PRESETS } from '../../utils/constants';
import { PARTS } from './parts';
import { isAnalysisCompleteResponse, type Candidate, type PresetName } from '../../api/types';
import './JingleExtractor.css';

interface JingleExtractorProps {
  trackId?: string;
}

type DisplayCandidate = Candidate & { edited?: boolean };

export function JingleExtractor({ trackId = 'thrash_metal_01' }: JingleExtractorProps) {
  const dispatch = useAppDispatch();

  // ── Local UI state ────────────────────────────────────────────────────
  const selectedId = useAppSelector((s) => s.analysis.selectedCandidateId);
  const playhead = useAppSelector((s) => s.analysis.playhead);
  const stem = useAppSelector((s) => s.analysis.stem);
  const activePreset = useAppSelector((s) => s.analysis.activePreset);
  const config = useAppSelector((s) => s.analysis.config);
  const editedCandidates = useAppSelector((s) => s.analysis.editedCandidates);

  const handlePlaybackTimeUpdate = useCallback(
    (time: number) => dispatch(setPlayhead(time)),
    [dispatch]
  );

  const audioPlayer = useAudioPlayer({ onTimeUpdate: handlePlaybackTimeUpdate });

  // ── RTK Query ────────────────────────────────────────────────────────
  const {
    data: analysis,
    isLoading,
    isError,
    refetch,
  } = useGetAnalysisQuery(trackId);
  const [runAnalysis, { isLoading: isRunning }] = useAnalyzeMutation();
  const [exportClip] = useExportClipMutation();

  // ── Event handlers ───────────────────────────────────────────────────
  const handlePresetSelect = useCallback(
    (name: PresetName) => {
      dispatch(applyPreset({ name, config: DEFAULT_PRESETS[name] }));
    },
    [dispatch]
  );

  const handleConfigChange = useCallback(
    (newConfig: typeof config) => {
      dispatch(setConfig(newConfig));
    },
    [dispatch]
  );

  const handleRunAnalysis = useCallback(async () => {
    try {
      await runAnalysis({ audio_file: trackId, config }).unwrap();
    } catch (e) {
      console.error('Analysis failed:', e);
    }
  }, [runAnalysis, trackId, config]);

  const handleReset = useCallback(() => {
    dispatch(applyPreset({ name: 'Default', config: DEFAULT_PRESETS.Default }));
  }, [dispatch]);

  const getStemAudioUrl = useCallback(
    (s: typeof stem) => `/api/tracks/${encodeURIComponent(trackId)}/audio/${s}`,
    [trackId]
  );

  const handleStemChange = useCallback(
    (s: typeof stem) => {
      dispatch(setStem(s));
      if (audioPlayer.isPlaying) {
        void audioPlayer.playTrack(getStemAudioUrl(s), playhead);
      }
    },
    [audioPlayer, dispatch, getStemAudioUrl, playhead]
  );

  const handlePlayheadChange = useCallback(
    (t: number) => {
      // Timeline clicks reposition playback, but do not auto-start playback.
      dispatch(setPlayhead(t));
      audioPlayer.seekTo(t);
    },
    [audioPlayer, dispatch]
  );

  const handleCandidateSelect = useCallback(
    (id: number) => dispatch(setSelectedCandidate(id)),
    [dispatch]
  );

  const handleCandidateUpdate = useCallback(
    (id: number, edge: 'start' | 'end', time: number) => {
      if (edge === 'start') {
        dispatch(updateCandidateStart({ id, start: time }));
      } else {
        dispatch(updateCandidateEnd({ id, end: time }));
      }
    },
    [dispatch]
  );

  // ── Derived data ─────────────────────────────────────────────────────
  const analysisComplete = isAnalysisCompleteResponse(analysis);
  const track = analysisComplete ? analysis.track : null;
  const timeline = analysisComplete ? analysis.timeline : null;
  const vocals = analysisComplete ? analysis.vocals.segments : [];
  const candidates = useMemo(() => (analysisComplete ? analysis.candidates : []), [analysis, analysisComplete]);
  const analysisStatus = !analysisComplete ? analysis?.status ?? null : null;
  const analysisErrorMessage = !analysisComplete ? analysis?.error_message ?? null : null;

  const visibleCandidates = useMemo<DisplayCandidate[]>(() => {
    return candidates.map((candidate) => {
      const overrides = editedCandidates[candidate.id];
      return {
        ...candidate,
        start: overrides?.start ?? candidate.start,
        end: overrides?.end ?? candidate.end,
        edited: !!overrides,
      };
    });
  }, [candidates, editedCandidates]);

  const selectedCandidate = visibleCandidates.find((c) => c.id === selectedId) ?? null;
  const presetNames = Object.keys(DEFAULT_PRESETS) as PresetName[];

  useEffect(() => {
    if (!analysisStatus || analysisStatus === 'complete' || analysisStatus === 'failed') {
      return;
    }

    const timer = window.setTimeout(() => {
      void refetch();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [analysisStatus, refetch]);

  // ── Handlers that reference derived data ──────────────────────────────
  const handlePreview = useCallback(
    async (id: number) => {
      const cand = visibleCandidates.find((c) => c.id === id);
      if (!cand) return;

      await audioPlayer.playClip('/api/export', {
        trackId,
        candidateId: cand.id,
        stem,
        fmt: config.fmt,
        fade_in: config.fade_in,
        fade_out: config.fade_out,
        br: config.br,
        start: cand.start,
        end: cand.end,
      });
    },
    [audioPlayer, config.br, config.fade_in, config.fade_out, config.fmt, trackId, stem, visibleCandidates]
  );

  const handleExport = useCallback(
    async (id: number) => {
      const cand = visibleCandidates.find((c) => c.id === id);
      if (!cand) return;

      try {
        const blob = await exportClip({
          trackId,
          candidateId: cand.id,
          stem,
          fmt: config.fmt,
          fade_in: config.fade_in,
          fade_out: config.fade_out,
          br: config.br,
          start: cand.start,
          end: cand.end,
        }).unwrap();
        const url = URL.createObjectURL(blob as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clip_${cand.id}.mp3`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Export failed:', e);
      }
    },
    [config.br, config.fade_in, config.fade_out, config.fmt, exportClip, trackId, stem, visibleCandidates]
  );

  return (
    <div data-part={PARTS.root}>
      {track && <MenuBar track={track} />}

      <div data-part={PARTS.mainLayout}>
        <aside data-part={PARTS.sidebar}>
          <MacWindow title="Presets">
            <PresetPanel
              presets={presetNames}
              activePreset={activePreset}
              onSelect={handlePresetSelect}
            />
          </MacWindow>

          <MacWindow
            title="Configuration"
            bodyStyle={{ display: 'flex', flexDirection: 'column', padding: 6, minHeight: 0, flex: 1 }}
          >
            <ConfigEditor
              config={config}
              onChange={handleConfigChange}
              onRun={handleRunAnalysis}
              onReset={handleReset}
              isLoading={isRunning}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            />
          </MacWindow>
        </aside>

        <div data-part={PARTS.mainPanel}>
          <MacWindow title="Transport" style={{ flexShrink: 0 }}>
            <TransportBar
              playhead={playhead}
              duration={timeline?.duration ?? 0}
              stem={stem}
              isPlaying={audioPlayer.isPlaying}
              onStemChange={handleStemChange}
              onPlay={() => {
                void audioPlayer.playTrack(getStemAudioUrl(stem), playhead);
              }}
              onPause={audioPlayer.pause}
              onSeekBack={() => {
                const nextTime = Math.max(0, playhead - 5);
                dispatch(setPlayhead(nextTime));
                audioPlayer.seekTo(nextTime);
              }}
              onSeekForward={() => {
                const nextTime = Math.min(timeline?.duration ?? 0, playhead + 5);
                dispatch(setPlayhead(nextTime));
                audioPlayer.seekTo(nextTime);
              }}
            />
          </MacWindow>

          {timeline && (
            <MacWindow title="Timeline — drag handles ◀ ▶ to resize candidates" style={{ flexShrink: 0 }}>
              <Timeline
                data={timeline}
                candidates={visibleCandidates}
                vocals={vocals}
                selectedId={selectedId}
                playhead={playhead}
                onSelect={handleCandidateSelect}
                onCandidateUpdate={handleCandidateUpdate}
                onPlayheadChange={handlePlayheadChange}
              />
            </MacWindow>
          )}

          <div data-part={PARTS.bottomPanel}>
            <MacWindow title="Candidates" bodyStyle={{ overflowY: 'auto' }}>
              {isLoading && <div style={{ padding: 16 }}>Loading...</div>}
              {isError && <div style={{ padding: 16 }}>Failed to load analysis.</div>}
              {!isLoading && !isError && analysisStatus && analysisStatus !== 'complete' && (
                <div style={{ padding: 16 }}>
                  <div><strong>Status:</strong> {analysisStatus}</div>
                  {analysisErrorMessage && (
                    <div style={{ marginTop: 8 }}><strong>Error:</strong> {analysisErrorMessage}</div>
                  )}
                  {analysisStatus !== 'failed' && (
                    <div style={{ marginTop: 8 }}>Polling for updated analysis results…</div>
                  )}
                </div>
              )}
              {!isLoading && !isError && analysisComplete && (
                <CandidateList
                  candidates={visibleCandidates}
                  selectedId={selectedId}
                  onSelect={handleCandidateSelect}
                  onPreview={handlePreview}
                />
              )}
            </MacWindow>

            {selectedCandidate && (
              <MacWindow
                title={`Detail — #${selectedCandidate.rank}${selectedCandidate.best ? ' ★ BEST' : ''}`}
                bodyStyle={{ overflowY: 'auto' }}
              >
                <CandidateDetail
                  candidate={selectedCandidate}
                  stem={stem}
                  onPreview={() => handlePreview(selectedCandidate.id)}
                  onExport={() => handleExport(selectedCandidate.id)}
                  onResetEdit={() => dispatch(clearCandidateEdit(selectedCandidate.id))}
                />
              </MacWindow>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
