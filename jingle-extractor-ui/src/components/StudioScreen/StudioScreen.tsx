import type {
  GenerationComposerValue,
  GenerationRunSummary,
  LibrarySort,
  LibrarySourceFilter,
  LibraryStatusFilter,
  Track,
  TrackLibraryItem,
} from '../../api/types';
import { PARTS } from '../JingleExtractor/parts';
import { GenerationComposer } from '../GenerationComposer';
import { MacWindow } from '../MacWindow';
import { MenuBar } from '../MenuBar';
import { TrackInspector } from '../TrackInspector';
import { TrackLibraryList } from '../TrackLibraryList';
import { TrackResultsList } from '../TrackResultsList';
import './StudioScreen.css';

interface StudioScreenProps {
  composerValue: GenerationComposerValue;
  onComposerChange: (value: GenerationComposerValue) => void;
  onGenerate: () => void;
  onSavePrompt?: () => void;
  isGenerating?: boolean;
  currentRun: GenerationRunSummary | null;
  currentRunTracks: TrackLibraryItem[];
  libraryTracks: TrackLibraryItem[];
  selectedTrackId: string | null;
  previewingTrackId?: string | null;
  librarySearch: string;
  librarySourceFilter: LibrarySourceFilter;
  libraryStatusFilter: LibraryStatusFilter;
  librarySort: LibrarySort;
  onLibrarySearchChange: (value: string) => void;
  onLibrarySourceFilterChange: (value: LibrarySourceFilter) => void;
  onLibraryStatusFilterChange: (value: LibraryStatusFilter) => void;
  onLibrarySortChange: (value: LibrarySort) => void;
  onSelectTrack: (track: TrackLibraryItem) => void;
  onPreviewTrack: (track: TrackLibraryItem) => void;
  onAnalyzeTrack: (track: TrackLibraryItem) => void;
  onOpenInMining: (track: TrackLibraryItem) => void;
}

function toMenuTrack(track: TrackLibraryItem | null): Track {
  return {
    id: track?.display_name ?? 'studio',
    duration: track?.duration ?? 0,
    bpm: 170,
    language: 'en',
    lang_conf: 1,
    sr: 44100,
    dr_db: 12,
  };
}

export function StudioScreen({
  composerValue,
  onComposerChange,
  onGenerate,
  onSavePrompt,
  isGenerating = false,
  currentRun,
  currentRunTracks,
  libraryTracks,
  selectedTrackId,
  previewingTrackId = null,
  librarySearch,
  librarySourceFilter,
  libraryStatusFilter,
  librarySort,
  onLibrarySearchChange,
  onLibrarySourceFilterChange,
  onLibraryStatusFilterChange,
  onLibrarySortChange,
  onSelectTrack,
  onPreviewTrack,
  onAnalyzeTrack,
  onOpenInMining,
}: StudioScreenProps) {
  const selectedTrack =
    currentRunTracks.find((track) => track.id === selectedTrackId)
    ?? libraryTracks.find((track) => track.id === selectedTrackId)
    ?? null;

  return (
    <div data-part={PARTS.studioScreen}>
      <MenuBar track={toMenuTrack(selectedTrack)} />

      <div data-part={PARTS.studioLayout}>
        <div data-part={PARTS.studioColumn}>
          <MacWindow title="Generate Track Batch">
            <div style={{ padding: 8 }}>
              <GenerationComposer
                value={composerValue}
                onChange={onComposerChange}
                onGenerate={onGenerate}
                onSavePrompt={onSavePrompt}
                isGenerating={isGenerating}
              />
            </div>
          </MacWindow>

          <MacWindow title="Selected Track Inspector">
            <div style={{ padding: 8 }}>
              <TrackInspector
                track={selectedTrack}
                run={currentRun}
                isPreviewing={previewingTrackId === selectedTrack?.id}
                onPreview={selectedTrack ? () => onPreviewTrack(selectedTrack) : undefined}
                onAnalyze={selectedTrack ? () => onAnalyzeTrack(selectedTrack) : undefined}
                onOpenInMining={selectedTrack ? () => onOpenInMining(selectedTrack) : undefined}
              />
            </div>
          </MacWindow>
        </div>

        <div data-part={PARTS.studioColumn}>
          <div data-part={PARTS.studioWindowStack}>
            <MacWindow title="Current Run / Results">
              <div style={{ padding: 8 }}>
                <TrackResultsList
                  run={currentRun}
                  tracks={currentRunTracks}
                  selectedId={selectedTrackId}
                  previewingId={previewingTrackId}
                  onSelect={onSelectTrack}
                  onPreview={onPreviewTrack}
                  onAnalyze={onAnalyzeTrack}
                />
              </div>
            </MacWindow>

            <MacWindow title="Library">
              <div style={{ padding: 8 }}>
                <TrackLibraryList
                  tracks={libraryTracks}
                  selectedId={selectedTrackId}
                  previewingId={previewingTrackId}
                  search={librarySearch}
                  sourceFilter={librarySourceFilter}
                  statusFilter={libraryStatusFilter}
                  sort={librarySort}
                  onSearchChange={onLibrarySearchChange}
                  onSourceFilterChange={onLibrarySourceFilterChange}
                  onStatusFilterChange={onLibraryStatusFilterChange}
                  onSortChange={onLibrarySortChange}
                  onSelect={onSelectTrack}
                  onPreview={onPreviewTrack}
                  onAnalyze={onAnalyzeTrack}
                />
              </div>
            </MacWindow>
          </div>
        </div>
      </div>
    </div>
  );
}
