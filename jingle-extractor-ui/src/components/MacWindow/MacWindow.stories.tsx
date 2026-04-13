/**
 * MacWindow.stories.tsx — Storybook stories for MacWindow.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { MacWindow } from './MacWindow';

const meta = {
  component: MacWindow,
  title: 'JingleExtractor/MacWindow',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof MacWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ────────────────────────────────────────────────────────────────

export const Empty: Story = {
  args: {
    title: 'Presets',
    children: <div style={{ padding: '16px' }}>No content yet.</div>,
  },
};

export const WithContent: Story = {
  args: {
    title: 'Candidates',
    children: (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ padding: '8px', borderBottom: '1px solid #000' }}>
          #1 ★ 39.1s → 43.1s — Score: 92
        </div>
        <div style={{ padding: '8px', borderBottom: '1px solid #000' }}>
          #2 35.1s → 39.1s — Score: 91
        </div>
        <div style={{ padding: '8px' }}>
          #3 45.7s → 48.2s — Score: 89
        </div>
      </div>
    ),
  },
};

export const Scrollable: Story = {
  args: {
    title: 'Long List',
    bodyStyle: { maxHeight: '200px' },
    children: (
      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column' }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{ padding: '8px', borderBottom: '1px solid rgba(0,0,0,0.2)' }}>
            Item {i + 1}
          </div>
        ))}
      </div>
    ),
  },
};
