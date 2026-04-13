/**
 * App.tsx — Root application component.
 *
 * This is the Phase 1 scaffold. The full JingleExtractor widget will replace
 * the placeholder once the component extraction is complete.
 */

import { useAppSelector, useAppDispatch } from './hooks/useRedux';
import { setTheme } from './features/analysis/analysisSlice';
import type { ThemeId } from './api/types';

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'retro', label: 'Retro (1-bit Mac)' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
];

function ThemeSwitcher() {
  const dispatch = useAppDispatch();
  const current = useAppSelector((s) => (s as { analysis: { theme: ThemeId } }).analysis.theme);

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '8px 12px',
        borderBottom: 'var(--je-border-width) solid var(--je-color-border)',
        background: 'var(--je-color-surface)',
      }}
    >
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => dispatch(setTheme(t.id))}
          data-part="theme-button"
          style={{
            padding: '4px 12px',
            background: current === t.id ? 'var(--je-color-selected)' : 'var(--je-color-surface)',
            color: current === t.id ? 'var(--je-color-selected-text)' : 'var(--je-color-text)',
            border: 'var(--je-border-width) solid var(--je-color-border)',
            borderRadius: 'var(--je-border-radius)',
            fontFamily: 'var(--je-font-family)',
            fontSize: 'var(--je-font-size-sm)',
            cursor: 'pointer',
            fontWeight: current === t.id ? 'var(--je-font-weight-bold)' : 'var(--je-font-weight-normal)',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Placeholder() {
  const theme = useAppSelector((s) => (s as { analysis: { theme: ThemeId } }).analysis.theme);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '40px',
        fontFamily: 'var(--je-font-family)',
      }}
    >
      <div
        style={{
          fontSize: '48px',
          fontWeight: 'var(--je-font-weight-bold)',
          color: 'var(--je-color-text)',
        }}
      >
        JINGLE EXTRACTOR
      </div>
      <div
        style={{
          fontSize: 'var(--je-font-size-lg)',
          color: 'var(--je-color-text-muted)',
        }}
      >
        Phase 1 Scaffold — Theme: <strong>{theme}</strong>
      </div>
      <div
        style={{
          width: '200px',
          height: '4px',
          background: 'var(--je-color-waveform)',
        }}
      />
      <div
        style={{
          fontSize: 'var(--je-font-size-sm)',
          color: 'var(--je-color-text-muted)',
          textAlign: 'center',
          maxWidth: '400px',
        }}
      >
        Tokens.css loaded. Next: extract ScoreBar, MacWindow, MenuBar
        components and wire up the full JingleExtractor widget.
      </div>
    </div>
  );
}

function AppInner() {
  const theme = useAppSelector((s) => (s as { analysis: { theme: ThemeId } }).analysis.theme);

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
      <ThemeSwitcher />
      <Placeholder />
    </div>
  );
}

export default function App() {
  return <AppInner />;
}
