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

function mockSvgRect(svg: SVGSVGElement) {
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
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
}

describe('Timeline', () => {
  it('updates the playhead when the user clicks on the timeline background', () => {
    const onPlayheadChange = vi.fn();

    const { container } = render(
      <Timeline
        data={timelineData}
        stem="inst"
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

    mockSvgRect(svg!);

    fireEvent.click(svg!, { clientX: 700, clientY: 40 });

    expect(onPlayheadChange).toHaveBeenCalledTimes(1);
    expect(onPlayheadChange.mock.calls[0][0]).toBeCloseTo(25, 1);
  });

  it('selects a candidate when the candidate region is clicked', () => {
    const onSelect = vi.fn();

    const { container } = render(
      <Timeline
        data={timelineData}
        stem="inst"
        candidates={candidates}
        vocals={vocals}
        selectedId={null}
        playhead={0}
        onSelect={onSelect}
        onCandidateUpdate={vi.fn()}
        onPlayheadChange={vi.fn()}
      />
    );

    const candidateRegion = container.querySelector('[data-part="candidate-region"] rect');
    expect(candidateRegion).not.toBeNull();

    fireEvent.click(candidateRegion!);

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('clamps dragged candidate edges so start never crosses end', () => {
    const onCandidateUpdate = vi.fn();

    const { container } = render(
      <Timeline
        data={timelineData}
        stem="inst"
        candidates={candidates}
        vocals={vocals}
        selectedId={1}
        playhead={0}
        onSelect={vi.fn()}
        onCandidateUpdate={onCandidateUpdate}
        onPlayheadChange={vi.fn()}
      />
    );

    const svg = container.querySelector('svg') as SVGSVGElement;
    mockSvgRect(svg);

    // JSDOM does not implement pointer capture helpers on SVG by default.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (svg as any).setPointerCapture = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (svg as any).releasePointerCapture = vi.fn();

    const handles = container.querySelectorAll('[data-part="candidate-handle"]');
    expect(handles.length).toBe(2);

    fireEvent.pointerDown(handles[0], { pointerId: 1, clientX: 280 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 1400 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 1400 });

    expect(onCandidateUpdate).toHaveBeenCalled();
    expect(onCandidateUpdate.mock.calls.at(-1)?.[0]).toBe(1);
    expect(onCandidateUpdate.mock.calls.at(-1)?.[1]).toBe('start');
    expect(onCandidateUpdate.mock.calls.at(-1)?.[2]).toBeCloseTo(13.7, 1);
  });
});
