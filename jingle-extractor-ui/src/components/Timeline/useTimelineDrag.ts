/**
 * useTimelineDrag.ts — Custom hook for draggable candidate handles in the Timeline SVG.
 *
 * Handles pointer capture for smooth drag interaction:
 * - onPointerDown: captures the pointer, records which candidate and edge is being dragged
 * - onPointerMove: updates the candidate's start or end time
 * - onPointerUp: releases the capture
 */

import { useCallback, useRef } from 'react';

interface DragState {
  candidateId: number;
  edge: 'start' | 'end';
}

interface UseTimelineDragOptions {
  /** Maximum time in the track */
  maxTime?: number;
  /** Called when a candidate's start or end time changes */
  onCandidateUpdate: (id: number, edge: 'start' | 'end', time: number) => void;
}

/**
 * Returns pointer event handlers for SVG candidate handle dragging.
 *
 * Usage:
 *   const { onPointerDown, onPointerMove, onPointerUp } = useTimelineDrag({ ... });
 *   <svg onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
 *     <rect onPointerDown={(e) => onPointerDown(e, candidateId, 'start')} />
 *   </svg>
 */
export function useTimelineDrag({
  maxTime = Infinity,
  onCandidateUpdate,
}: UseTimelineDragOptions) {
  const dragRef = useRef<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const xToTRef = useRef<((x: number) => number) | null>(null);

  const setSvgRef = useCallback((el: SVGSVGElement | null) => {
    svgRef.current = el;
  }, []);

  const setConverter = useCallback((xToT: (x: number) => number) => {
    xToTRef.current = xToT;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<Element>, candidateId: number, edge: 'start' | 'end') => {
      e.stopPropagation();
      e.preventDefault();
      // Walk up to find the SVG element
      let target: EventTarget | null = e.target;
      while (target && !(target instanceof SVGSVGElement)) {
        target = (target as Element).parentElement ?? (target as Element).parentNode;
      }
      const svg = target as SVGSVGElement | null;
      if (!svg) return;
      svg.setPointerCapture(e.pointerId);
      dragRef.current = { candidateId, edge };
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragRef.current || !xToTRef.current || !svgRef.current) return;
      const { candidateId, edge } = dragRef.current;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = (e.clientX - rect.left) * (1400 / rect.width);
      const time = xToTRef.current(svgX);
      const clamped = Math.max(0, Math.min(maxTime, time));
      onCandidateUpdate(candidateId, edge, clamped);
    },
    [maxTime, onCandidateUpdate]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragRef.current) return;
      if (!svgRef.current) return;
      svgRef.current.releasePointerCapture(e.pointerId);
      dragRef.current = null;
    },
    []
  );

  return {
    setSvgRef,
    setConverter,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
