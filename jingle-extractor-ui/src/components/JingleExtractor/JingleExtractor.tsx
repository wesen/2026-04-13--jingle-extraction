/**
 * JingleExtractor.tsx — Root widget composing all JingleExtractor components.
 *
 * This is the main public entrypoint. It:
 * - Reads analysis state from Redux (selectedCandidate, playhead, stem, config, theme)
 * - Reads analysis data from RTK Query (track, timeline, vocals, candidates)
 * - Composes: MenuBar + (Sidebar: PresetPanel + ConfigEditor) + (Main: TransportBar + Timeline + (Bottom: CandidateList | CandidateDetail))
 */

import { useCallback } from 'react';
import { useAnalyzeMutation, useGetAnalysisQuery, useMineCandidatesMutation, useExportClipMutation } from '../../api/jingleApi';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import {
  applyPreset,
  setConfig,
  setPlayhead,
  setSelectedCandidate,
  setStem,
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
import type { PresetName } from '../../api/types';
import './JingleExtractor.css';

interface JingleExtractorProps {
  /** Track ID to load. Defaults to 'thrash_metal_01' for demo. */
  trackId?: string;
}

export function JingleExtractor({ trackId = 'thrash_metal_01' }: JingleExtractorProps) {
  const dispatch = useAppDispatch();

  // ── Local UI state ────────────────────────────────────────────────────
  const selectedId = useAppSelector((s) => s.analysis.selectedCandidateId);
  const playhead = useAppSelector((s) => s.analysis.playhead);
  const stem = useAppSelector((s) => s.analysis.stem);
  const activePreset = useAppSelector((s) => s.analysis.activePreset);
  const config = useAppSelector((s) => s.analysis.config);

  // ── RTK Query ────────────────────────────────────────────────────────
  const { data: analysis, isLoading, isError } = useGetAnalysisQuery(trackId);
  const [runAnalysis, { isLoading: isRunning }] = useAnalyzeMutation();
  const [mineCandidates] = useMineCandidatesMutation();
  const [exportClip] = useExportClipMutation();
  const audioPlayer = useAudioPlayer();

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

  const handleStemChange = useCallback(
    (s: typeof stem) => dispatch(setStem(s)),
    [dispatch]
  );

  const handlePlayheadChange = useCallback(
    (t: number) => dispatch(setPlayhead(t)),
    [dispatch]
  );

  const handleCandidateSelect = useCallback(
    (id: number) => dispatch(setSelectedCandidate(id)),
    [dispatch]
  );

  const handleCandidateUpdate = useCallback(
    async (_id: number, _edge: 'start' | 'end', _time: number) => {
      try {
        await mineCandidates({ trackId, config }).unwrap();
      } catch {
        // ignore
      }
    },
    [mineCandidates, trackId, config]
  );

  // ── Derived data (must be before handlers that reference candidates) ──
  const track = analysis?.track;
  const timeline = analysis?.timeline;
  const vocals = analysis?.vocals?.segments ?? [];
  const candidates = analysis?.candidates ?? [];

  const selectedCandidate = candidates.find((c) => c.id === selectedId) ?? null;
  const presetNames = Object.keys(DEFAULT_PRESETS) as PresetName[];

  // ── Handlers that reference derived data ──────────────────────────────
  const handlePreview = useCallback(
    async (id: number) => {
      const cand = candidates.find((c) => c.id === id);
      if (!cand) return;
      audioPlayer.play('/api/export', {
        trackId,
        candidateId: cand.id,
        stem,
        fmt: 'mp3',
      });
    },
    [audioPlayer, candidates, trackId, stem]
  );

  const handleExport = useCallback(
    async (id: number) => {
      const cand = candidates.find((c) => c.id === id);
      if (!cand) return;
      try {
        const blob = await exportClip({
          trackId,
          candidateId: cand.id,
          stem,
          fmt: 'mp3',
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
    [exportClip, candidates, trackId, stem]
  );

  return (
    <div data-part={PARTS.root}>
      {/* Menu bar */}
      {track && (
        <MenuBar track={track} />
      )}

      {/* Main layout */}
      <div data-part={PARTS.mainLayout}>
        {/* Sidebar */}
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

        {/* Main panel */}
        <div data-part={PARTS.mainPanel}>
          {/* Transport */}
          <MacWindow title="Transport" style={{ flexShrink: 0 }}>
            <TransportBar
              playhead={playhead}
              duration={timeline?.duration ?? 0}
              stem={stem}
              isPlaying={false}
              onStemChange={handleStemChange}
              onPlay={() => {}}
              onPause={() => {}}
              onSeekBack={() => dispatch(setPlayhead(Math.max(0, playhead - 5)))}
              onSeekForward={() => dispatch(setPlayhead(Math.min(timeline?.duration ?? 0, playhead + 5)))}
            />
          </MacWindow>

          {/* Timeline */}
          {timeline && (
            <MacWindow title="Timeline — drag handles ◀ ▶ to resize candidates" style={{ flexShrink: 0 }}>
              <Timeline
                data={timeline}
                candidates={candidates}
                vocals={vocals}
                selectedId={selectedId}
                playhead={playhead}
                onSelect={handleCandidateSelect}
                onCandidateUpdate={handleCandidateUpdate}
                onPlayheadChange={handlePlayheadChange}
              />
            </MacWindow>
          )}

          {/* Bottom: candidates + detail */}
          <div data-part={PARTS.bottomPanel}>
            <MacWindow
              title="Candidates"
              bodyStyle={{ overflowY: 'auto' }}
            >
              {isLoading && <div style={{ padding: 16 }}>Loading...</div>}
              {isError && <div style={{ padding: 16 }}>Failed to load analysis.</div>}
              {!isLoading && !isError && (
                <CandidateList
                  candidates={candidates}
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
                />
              </MacWindow>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
