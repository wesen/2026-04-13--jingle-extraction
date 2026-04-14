// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Timeline } from './Timeline';
import type { Candidate, TimelineData, VocalSegment } from '../../api/types';

const timelineData: TimelineData = {
  duration: 50,
  beats: [0, 1, 2, 3, 4, 5],
  rms: [0.1, 0.2, 0.15, 0.3, 0.2, 0.1],
  onsets: [0.5, 1.5, 2.5],
};

const candidates: Candidate[] = [
  {
    id: 1,
    rank: 1,
    start: 10,
    end: 14,
    score: 95,
    attack: 90,
    ending: 92,
    energy: 88,
    vocal_overlap: false,
    best: true,
  },
];

const vocals: VocalSegment[] = [];

describe('Timeline', () => {
  it('updates the playhead when the user clicks on the timeline background', () => {
    const onPlayheadChange = vi.fn();

    const { container } = render(
      <Timeline
        data={timelineData}
        candidates={candidates}
        vocals={vocals}
        selectedId={1}
        playhead={0}
        onSelect={vi.fn()}
        onCandidateUpdate={vi.fn()}
        onPlayheadChange={onPlayheadChange}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();

    vi.spyOn(svg!, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1400,
      bottom: 210,
      width: 1400,
      height: 210,
      toJSON: () => ({}),
    });

    fireEvent.click(svg!, { clientX: 700, clientY: 40 });

    expect(onPlayheadChange).toHaveBeenCalledTimes(1);
    expect(onPlayheadChange.mock.calls[0][0]).toBeCloseTo(25, 1);
  });
});
