/**
 * CandidateDetail.stories.tsx — Storybook stories for CandidateDetail.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { CandidateDetail } from './CandidateDetail';
import type { Candidate, StemType } from '../../api/types';

const BEST_CANDIDATE: Candidate = {
  id: 1, rank: 1, start: 39.102, end: 43.102, score: 92,
  attack: 95, ending: 88, energy: 78, vocal_overlap: false, best: true,
};

const VOCAL_OVERLAP: Candidate = {
  id: 2, rank: 2, start: 35.1, end: 39.1, score: 91,
  attack: 90, ending: 85, energy: 82, vocal_overlap: true, best: false,
};

const LOW_SCORE: Candidate = {
  id: 5, rank: 5, start: 15.464, end: 17.964, score: 67,
  attack: 54, ending: 48, energy: 71, vocal_overlap: false, best: false,
};

const meta = {
  component: CandidateDetail,
  title: 'JingleExtractor/CandidateDetail',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof CandidateDetail>;

export default meta;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Story = StoryObj<any>;

function detailStory(name: string, candidate: Candidate, stem: StemType = 'inst'): Story {
  return {
    name,
    render: () => (
      <CandidateDetail
        candidate={candidate}
        stem={stem as StemType}
        onPreview={() => alert('Preview!')}
        onExport={() => alert('Export!')}
        onResetEdit={() => alert('Reset edit!')}
      />
    ),
  } as Story;
}

// ── Stories ────────────────────────────────────────────────────────────────

export const BestCandidate = detailStory('Best Candidate (#1)', BEST_CANDIDATE);
export const VocalOverlap = detailStory('Vocal Overlap Warning (#2)', VOCAL_OVERLAP);
export const LowScore = detailStory('Low Score (#5)', LOW_SCORE);
