/**
 * Timeline.stories.tsx — Storybook stories for Timeline.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Timeline } from './Timeline';
import type { Candidate, TimelineData, VocalSegment } from '../../api/types';

// Realistic mock data
const THRASH_TIMELINE: TimelineData = {
  duration: 55.59,
  beats: Array.from({ length: 150 }, (_, i) => 0.348 + i * (60 / 166.7)),
  rms: Array.from({ length: 480 }, (_, i) => {
    const t = (i / 480) * 55.59;
    let base = 0.04;
    if (t > 5 && t < 15) base = 0.06 + Math.sin(t * 0.5) * 0.02;
    if (t > 15 && t < 35) base = 0.11 + Math.sin(t * 0.3) * 0.03;
    if (t > 35 && t < 45) base = 0.18 + Math.sin(t * 0.7) * 0.05;
    if (t > 45) base = 0.09 + Math.sin(t * 0.4) * 0.03;
    return Math.max(0.001, base + (Math.random() - 0.5) * 0.03);
  }),
};

const THRASH_CANDIDATES: Candidate[] = [
  { id: 1, rank: 1, start: 39.102, end: 43.102, score: 92, attack: 95, ending: 88, energy: 78, vocal_overlap: false, best: true },
  { id: 2, rank: 2, start: 35.1, end: 39.1, score: 91, attack: 90, ending: 85, energy: 82, vocal_overlap: true, best: false },
  { id: 3, rank: 3, start: 45.7, end: 48.2, score: 89, attack: 87, ending: 90, energy: 75, vocal_overlap: false, best: false },
  { id: 4, rank: 4, start: 26.0, end: 30.0, score: 88, attack: 82, ending: 86, energy: 80, vocal_overlap: false, best: false },
  { id: 5, rank: 5, start: 15.464, end: 17.964, score: 87, attack: 84, ending: 83, energy: 74, vocal_overlap: false, best: false },
];

const THRASH_VOCALS: VocalSegment[] = [
  { id: 1, start: 17.245, end: 18.006, text: 'YOW!', conf: 0.93 },
  { id: 2, start: 29.834, end: 31.035, text: "SPINNIN' POWER!", conf: 0.48 },
  { id: 3, start: 32.876, end: 33.677, text: 'BURNING FAST!', conf: 0.86 },
  { id: 4, start: 35.778, end: 39.421, text: 'NO RETREAT UNTIL THE LAST!', conf: 0.83 },
  { id: 5, start: 41.175, end: 50.244, text: 'Stress attack, no turning back…', conf: 0.60 },
];

const meta = {
  component: Timeline,
  title: 'JingleExtractor/Timeline',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'light' },
  },
} satisfies Meta<typeof Timeline>;

export default meta;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Story = StoryObj<any>;

function timelineStory(name: string, candidates: Candidate[], vocals: VocalSegment[], selectedId: number | null, playhead: number): Story {
  return {
    name,
    render: () => {
      const [cands, setCands] = useState(candidates);
      const [sel, setSel] = useState<number | null>(selectedId);
      const [ph, setPh] = useState(playhead);
      return (
        <Timeline
          data={THRASH_TIMELINE}
          candidates={cands}
          vocals={vocals}
          selectedId={sel}
          playhead={ph}
          onSelect={setSel}
          onCandidateUpdate={(id, edge, time) => {
            setCands((prev) =>
              prev.map((c) => c.id === id ? { ...c, [edge]: time } : c)
            );
          }}
          onPlayheadChange={setPh}
        />
      );
    },
  } as Story;
}

// ── Stories ────────────────────────────────────────────────────────────────

export const Default = timelineStory(
  'With Candidates + Vocals + Playhead',
  THRASH_CANDIDATES,
  THRASH_VOCALS,
  1,
  17.2
);

export const NoSelection = timelineStory(
  'No Candidate Selected',
  THRASH_CANDIDATES,
  THRASH_VOCALS,
  null,
  0
);

export const NoCandidates = timelineStory(
  'No Candidates',
  [],
  THRASH_VOCALS,
  null,
  30
);

export const NoVocals = timelineStory(
  'No Vocals',
  THRASH_CANDIDATES,
  [],
  1,
  25
);
