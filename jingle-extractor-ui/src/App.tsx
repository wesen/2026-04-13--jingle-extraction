/**
 * App.tsx — Root application component.
 *
 * Provides the JingleExtractor widget inside a themed container.
 */

import { JingleExtractor } from './components/JingleExtractor';
import { useAppSelector } from './hooks/useRedux';

export default function App() {
  const theme = useAppSelector((s) => s.analysis.theme);

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
      <JingleExtractor />
    </div>
  );
}
