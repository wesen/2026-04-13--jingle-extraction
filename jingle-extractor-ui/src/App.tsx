/**
 * App.tsx — Root application component.
 *
 * Provides the JingleExtractor widget inside a themed container.
 */

import { JingleExtractor } from './components/JingleExtractor';
import { SegmentedControl } from './components/SegmentedControl';
import { StudioRuntimeScreen } from './components/StudioScreen';
import { setActiveScreen } from './features/studio/studioSlice';
import { useAppDispatch, useAppSelector } from './hooks/useRedux';

export default function App() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.analysis.theme);
  const activeScreen = useAppSelector((s) => s.studio.activeScreen);
  const miningTrackId = useAppSelector((s) => s.studio.selectedTrackId);

  return (
    <div
      data-widget="jingle-extractor"
      data-je-theme={theme}
      style={{
        minHeight: '100vh',
        background: 'var(--je-color-bg)',
        color: 'var(--je-color-text)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '8px 8px 0' }}>
        <SegmentedControl
          value={activeScreen}
          label="Workspace"
          options={[
            { value: 'studio', label: 'Studio' },
            { value: 'mining', label: 'Mining' },
          ]}
          onChange={(next) => dispatch(setActiveScreen(next))}
        />
      </div>

      {activeScreen === 'studio' ? (
        <StudioRuntimeScreen />
      ) : (
        <JingleExtractor
          trackId={miningTrackId ?? 'thrash_metal_01'}
          useTrackAnalyze={!!miningTrackId}
        />
      )}
    </div>
  );
}
