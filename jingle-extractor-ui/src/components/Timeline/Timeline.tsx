/**
 * Timeline.tsx — Audio timeline with waveform, candidate regions, vocal segments, and playhead.
 *
 * Composed of SVG layers:
 * - Beat grid (background lines)
 * - Candidate regions (selectable, draggable handles)
 * - Vocal regions (highlighted text)
 * - Waveform (RMS energy bars)
 * - Playhead (vertical line + triangle)
 */

import { useCallback, useMemo, useRef } from 'react';
import type { Candidate, StemType, TimelineData, VocalSegment } from '../../api/types';
import { PARTS } from '../JingleExtractor/parts';
import { useTimelineDrag } from './useTimelineDrag';
import './Timeline.css';

const HANDLE_W = 7; // px

interface TimelineProps {
  data: TimelineData;
  stem: StemType;
  candidates: Candidate[];
  vocals: VocalSegment[];
  selectedId: number | null;
  playhead: number;
  onSelect: (id: number) => void;
  onCandidateUpdate: (id: number, edge: 'start' | 'end', time: number) => void;
  onPlayheadChange: (time: number) => void;
}

function tToX(t: number, dur: number, pW: number, padL: number): number {
  return padL + (t / dur) * pW;
}

function clampCandidateEdgeTime(
  candidate: Candidate,
  edge: 'start' | 'end',
  time: number,
  maxTime: number
): number {
  if (edge === 'start') {
    return Math.max(0, Math.min(time, candidate.end - 0.3));
  }

  return Math.min(maxTime, Math.max(time, candidate.start + 0.3));
}

interface BeatGridLayerProps {
  data: TimelineData;
  padT: number;
  pH: number;
  dur: number;
  pW: number;
  padL: number;
}

function BeatGridLayer({ data, padT, pH, dur, pW, padL }: BeatGridLayerProps) {
  const visibleBeats = data.beats.filter((_, i) => i % 4 === 0);
  return (
    <g data-part={PARTS.beatGrid}>
      {visibleBeats.map((t, i) => (
        <line
          key={i}
          x1={tToX(t, dur, pW, padL)}
          x2={tToX(t, dur, pW, padL)}
          y1={padT}
          y2={padT + pH}
          stroke="var(--je-color-beat-line)"
          strokeWidth={0.5}
        />
      ))}
    </g>
  );
}

interface CandidateLayerProps {
  candidates: Candidate[];
  selectedId: number | null;
  padT: number;
  pH: number;
  dur: number;
  pW: number;
  padL: number;
  onSelect: (id: number) => void;
  onPointerDown: (e: React.PointerEvent<SVGRectElement>, id: number, edge: 'start' | 'end') => void;
}

function GripLines({ x, padT, pH }: { x: number; padT: number; pH: number }) {
  return (
    <>
      {[0.38, 0.48, 0.58].map((frac, i) => (
        <rect
          key={i}
          x={x - 0.5}
          y={padT + pH * frac}
          width={3.5}
          height={2}
          fill="var(--je-color-candidate-border)"
        />
      ))}
    </>
  );
}

function CandidateLayer({
  candidates,
  selectedId,
  padT,
  pH,
  dur,
  pW,
  padL,
  onSelect,
  onPointerDown,
}: CandidateLayerProps) {
  return (
    <g>
      {candidates.map((c) => {
        const x1 = tToX(c.start, dur, pW, padL);
        const x2 = tToX(c.end, dur, pW, padL);
        const isSel = selectedId === c.id;
        const fill = isSel ? 'url(#checker)' : 'var(--je-color-candidate-fill)';
        const fillOpacity = isSel ? 0.18 : 1;
        const borderOpacity = isSel ? 0.9 : 0.3;

        return (
          <g key={c.id} data-part={PARTS.candidateRegion}>
            <rect
              x={x1}
              y={padT}
              width={x2 - x1}
              height={pH}
              fill={fill}
              opacity={fillOpacity}
              style={{ imageRendering: 'pixelated' }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(c.id);
              }}
              cursor="pointer"
            />
            <rect
              x={x1}
              y={padT}
              width={x2 - x1}
              height={1.5}
              fill="var(--je-color-candidate-border)"
              opacity={borderOpacity}
            />
            <rect
              x={x1}
              y={padT + pH - 1.5}
              width={x2 - x1}
              height={1.5}
              fill="var(--je-color-candidate-border)"
              opacity={borderOpacity}
            />
            <text
              x={x1 + 6}
              y={padT + 14}
              fill="var(--je-color-text)"
              fontSize={11}
              fontFamily="var(--je-font-family)"
              fontWeight={isSel ? 'bold' : 'normal'}
              opacity={isSel ? 1 : 0.5}
            >
              #{c.rank}
              {c.best ? ' ★' : ''}
            </text>

            <rect
              data-part={PARTS.candidateHandle}
              x={x1 - 1}
              y={padT}
              width={HANDLE_W}
              height={pH}
              fill="transparent"
              cursor="ew-resize"
              onPointerDown={(e) => onPointerDown(e, c.id, 'start')}
            />
            <rect
              x={x1}
              y={padT + pH * 0.15}
              width={2.5}
              height={pH * 0.7}
              fill="var(--je-color-candidate-border)"
              opacity={isSel ? 0.85 : 0.35}
              rx={1}
            />
            <GripLines x={x1} padT={padT} pH={pH} />

            <rect
              data-part={PARTS.candidateHandle}
              x={x2 - HANDLE_W + 1}
              y={padT}
              width={HANDLE_W}
              height={pH}
              fill="transparent"
              cursor="ew-resize"
              onPointerDown={(e) => onPointerDown(e, c.id, 'end')}
            />
            <rect
              x={x2 - 2.5}
              y={padT + pH * 0.15}
              width={2.5}
              height={pH * 0.7}
              fill="var(--je-color-candidate-border)"
              opacity={isSel ? 0.85 : 0.35}
              rx={1}
            />
            <GripLines x={x2} padT={padT} pH={pH} />
          </g>
        );
      })}
    </g>
  );
}

interface VocalLayerProps {
  segments: VocalSegment[];
  dur: number;
  pW: number;
  padL: number;
  svgH: number;
}

function VocalLayer({ segments, dur, pW, padL, svgH }: VocalLayerProps) {
  const bottomY = svgH - 32;
  const labelH = 15;

  return (
    <g>
      {segments.map((s) => {
        const x1 = tToX(s.start, dur, pW, padL);
        const x2 = tToX(s.end, dur, pW, padL);
        const displayText = s.text.length > 20 ? `${s.text.slice(0, 18)}…` : s.text;

        return (
          <g key={s.id} data-part={PARTS.vocalRegion}>
            <rect
              x={x1}
              y={bottomY}
              width={x2 - x1}
              height={labelH}
              fill="url(#checker)"
              opacity={0.12}
              style={{ imageRendering: 'pixelated' }}
            />
            <rect
              x={x1}
              y={bottomY}
              width={x2 - x1}
              height={1}
              fill="var(--je-color-border)"
              opacity={0.3}
            />
            <text
              x={x1 + 2}
              y={bottomY + labelH - 6}
              fill="var(--je-color-text)"
              fontSize={8.5}
              fontFamily="var(--je-font-family)"
              opacity={0.55}
            >
              {displayText}
            </text>
          </g>
        );
      })}
    </g>
  );
}

interface WaveformLayerProps {
  rms: number[];
  padT: number;
  pH: number;
  pW: number;
}

function WaveformLayer({ rms, padT, pH, pW }: WaveformLayerProps) {
  const maxRms = Math.max(...rms, 0.001);
  const colW = pW / rms.length;

  return (
    <g data-part={PARTS.waveform}>
      {rms.map((v, i) => {
        const h = Math.max(1, (v / maxRms) * (pH * 0.45));
        const x = i * colW;
        const cy = padT + pH / 2;
        return (
          <rect
            key={i}
            x={x}
            y={cy - h}
            width={Math.max(colW - 0.3, 0.5)}
            height={h * 2}
            fill="var(--je-color-waveform)"
          />
        );
      })}
    </g>
  );
}

interface PlayheadLayerProps {
  playhead: number;
  svgH: number;
  dur: number;
  pW: number;
  padL: number;
}

function PlayheadLayer({ playhead, svgH, dur, pW, padL }: PlayheadLayerProps) {
  if (playhead <= 0) return null;
  const x = tToX(playhead, dur, pW, padL);
  return (
    <g data-part={PARTS.playhead} aria-label="Playhead">
      <line x1={x} x2={x} y1={0} y2={svgH} stroke="var(--je-color-playhead)" strokeWidth={1.5} />
      <polygon points={`${x - 4},0 ${x + 4},0 ${x},7`} fill="var(--je-color-playhead)" />
    </g>
  );
}

export function Timeline({
  data,
  stem,
  candidates,
  vocals,
  selectedId,
  playhead,
  onSelect,
  onCandidateUpdate,
  onPlayheadChange,
}: TimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 1400;
  const H = 210;
  const padL = 0;
  const padT = 8;
  const pW = W - padL;
  const pH = H - padT - 22;
  const dur = data.duration;
  const waveformRms = useMemo(() => {
    const stemRms = data.waveforms?.[stem];
    return stemRms && stemRms.length > 0 ? stemRms : data.rms;
  }, [data.rms, data.waveforms, stem]);

  const xToT = useCallback(
    (x: number) => Math.max(0, Math.min(dur, (x / pW) * dur)),
    [dur, pW]
  );

  const { onPointerDown, onPointerMove, onPointerUp } = useTimelineDrag({
    maxTime: dur,
    xToT,
    onCandidateUpdate: (id, edge, time) => {
      const candidate = candidates.find((c) => c.id === id);
      if (!candidate) return;
      onCandidateUpdate(id, edge, clampCandidateEdgeTime(candidate, edge, time, dur));
    },
  });

  const handleBgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = (e.clientX - rect.left) * (W / rect.width);
      onPlayheadChange(xToT(svgX));
    },
    [W, onPlayheadChange, xToT]
  );

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      data-part={PARTS.timeline}
      style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
      onClick={handleBgClick}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="img"
      aria-label="Audio timeline with candidates"
    >
      <defs>
        <pattern id="checker" x="0" y="0" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="1" height="1" fill="black" />
          <rect x="1" y="1" width="1" height="1" fill="black" />
        </pattern>
      </defs>

      {[0, 10, 20, 30, 40, 50].map((t) => (
        <text
          key={t}
          x={tToX(t, dur, pW, padL)}
          y={H - 2}
          fill="var(--je-color-text)"
          opacity={0.35}
          fontSize={9}
          fontFamily="var(--je-font-family)"
          textAnchor="middle"
        >
          {t}s
        </text>
      ))}

      <BeatGridLayer data={data} padT={padT} pH={pH} dur={dur} pW={pW} padL={padL} />
      <VocalLayer segments={vocals} dur={dur} pW={pW} padL={padL} svgH={H} />
      <CandidateLayer
        candidates={candidates}
        selectedId={selectedId}
        padT={padT}
        pH={pH}
        dur={dur}
        pW={pW}
        padL={padL}
        onSelect={onSelect}
        onPointerDown={onPointerDown}
      />
      <WaveformLayer rms={waveformRms} padT={padT} pH={pH} pW={pW} />
      <PlayheadLayer playhead={playhead} svgH={H} dur={dur} pW={pW} padL={padL} />
    </svg>
  );
}
