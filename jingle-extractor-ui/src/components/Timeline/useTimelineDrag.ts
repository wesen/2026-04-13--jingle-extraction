/**
 * useTimelineDrag.ts — Custom hook for draggable candidate handles in the Timeline SVG.
 *
 * Handles pointer capture for smooth drag interaction:
 * - onPointerDown: captures the pointer and records which candidate edge is active
 * - onPointerMove: converts the pointer x-position into time and emits updates
 * - onPointerUp: releases the pointer capture
 */

import { useCallback, useRef } from 'react';

interface DragState {
  candidateId: number;
  edge: 'start' | 'end';
}

interface UseTimelineDragOptions {
  maxTime?: number;
  xToT: (x: number) => number;
  onCandidateUpdate: (id: number, edge: 'start' | 'end', time: number) => void;
}

export function useTimelineDrag({
  maxTime = Infinity,
  xToT,
  onCandidateUpdate,
}: UseTimelineDragOptions) {
  const dragRef = useRef<DragState | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGRectElement>, candidateId: number, edge: 'start' | 'end') => {
      e.stopPropagation();
      e.preventDefault();
      const svg = e.currentTarget.ownerSVGElement;
      if (!svg) return;
      svg.setPointerCapture(e.pointerId);
      dragRef.current = { candidateId, edge };
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragRef.current) return;
      const { candidateId, edge } = dragRef.current;
      const rect = e.currentTarget.getBoundingClientRect();
      const svgX = (e.clientX - rect.left) * (1400 / rect.width);
      const time = xToT(svgX);
      const clamped = Math.max(0, Math.min(maxTime, time));
      onCandidateUpdate(candidateId, edge, clamped);
    },
    [maxTime, onCandidateUpdate, xToT]
  );

  const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
