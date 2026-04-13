/**
 * CandidateList.stories.tsx — Storybook stories for CandidateList.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CandidateList } from './CandidateList';
import type { Candidate } from '../../api/types';

const THRASH_CANDIDATES: Candidate[] = [
  { id: 1, rank: 1, start: 39.102, end: 43.102, score: 92, attack: 95, ending: 88, energy: 78, vocal_overlap: false, best: true },
  { id: 2, rank: 2, start: 35.1, end: 39.1, score: 91, attack: 90, ending: 85, energy: 82, vocal_overlap: true, best: false },
  { id: 3, rank: 3, start: 45.7, end: 48.2, score: 89, attack: 87, ending: 90, energy: 75, vocal_overlap: false, best: false },
  { id: 4, rank: 4, start: 26.0, end: 30.0, score: 88, attack: 82, ending: 86, energy: 80, vocal_overlap: false, best: false },
  { id: 5, rank: 5, start: 15.464, end: 17.964, score: 87, attack: 84, ending: 83, energy: 74, vocal_overlap: false, best: false },
];

const meta = {
  component: CandidateList,
  title: 'JingleExtractor/CandidateList',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof CandidateList>;

export default meta;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Story = StoryObj<any>;

function listStory(name: string, selectedId: number | null): Story {
  return {
    name,
    render: () => {
      const [sel, setSel] = useState<number | null>(selectedId);
      return (
        <CandidateList
          candidates={THRASH_CANDIDATES}
          selectedId={sel}
          onSelect={setSel}
          onPreview={(id) => alert(`Preview candidate ${id}`)}
        />
      );
    },
  } as Story;
}

// ── Stories ────────────────────────────────────────────────────────────────

export const NoneSelected = listStory('None Selected', null);
export const FirstSelected = listStory('First Selected (Best)', 1);
export const MiddleSelected = listStory('Middle Selected (#3)', 3);
export const WithVocalOverlap = listStory('Vocal Overlap Warning (#2)', 2);
