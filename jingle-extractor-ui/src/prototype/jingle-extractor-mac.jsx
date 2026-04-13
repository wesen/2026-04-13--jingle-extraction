import { useState, useRef, useCallback, useEffect } from "react";

/* ───── mock data ───── */
const generateMockRMS = () => {
  const pts = [];
  for (let i = 0; i < 480; i++) {
    const t = (i / 480) * 55.6;
    let base = 0.04;
    if (t > 5 && t < 15) base = 0.06 + Math.sin(t * 0.5) * 0.02;
    if (t > 15 && t < 35) base = 0.11 + Math.sin(t * 0.3) * 0.03;
    if (t > 35 && t < 45) base = 0.18 + Math.sin(t * 0.7) * 0.05;
    if (t > 45) base = 0.09 + Math.sin(t * 0.4) * 0.03;
    pts.push(Math.max(0.001, base + (Math.random() - 0.5) * 0.03));
  }
  return pts;
};
const generateBeats = () => { const b = []; for (let t = 0.348; t < 55.6; t += 60 / 166.7) b.push(t); return b; };

const INIT_DATA = {
  track: { id: "thrash_metal_01", duration: 55.59, bpm: 166.7, language: "en", lang_conf: 0.76, sr: 44100, dr_db: 49.9 },
  timeline: { duration: 55.59, beats: generateBeats(), rms: generateMockRMS() },
  vocals: {
    segments: [
      { id: 1, start: 17.245, end: 18.006, text: "YOW!", conf: 0.93 },
      { id: 2, start: 29.834, end: 31.035, text: "SPINNIN' POWER!", conf: 0.48 },
      { id: 3, start: 32.876, end: 33.677, text: "BURNING FAST!", conf: 0.86 },
      { id: 4, start: 35.778, end: 39.421, text: "NO RETREAT UNTIL THE LAST!", conf: 0.83 },
      { id: 5, start: 41.175, end: 50.244, text: "Stress attack, no turning back…", conf: 0.60 },
    ],
  },
  candidates: [
    { id: 1, rank: 1, start: 39.102, end: 43.102, score: 92, attack: 95, ending: 88, energy: 78, vocal_overlap: false, best: true },
    { id: 2, rank: 2, start: 35.1, end: 39.1, score: 91, attack: 90, ending: 85, energy: 82, vocal_overlap: true, best: false },
    { id: 3, rank: 3, start: 45.7, end: 48.2, score: 89, attack: 87, ending: 90, energy: 75, vocal_overlap: false, best: false },
    { id: 4, rank: 4, start: 26.0, end: 30.0, score: 88, attack: 82, ending: 86, energy: 80, vocal_overlap: false, best: false },
    { id: 5, rank: 5, start: 15.464, end: 17.964, score: 87, attack: 84, ending: 83, energy: 74, vocal_overlap: false, best: false },
  ],
};

const PRESETS = {
  "Default": { min_dur: 2.0, max_dur: 4.5, min_score: 75, vocal_mode: "inst", atk_w: 6, end_w: 4, nrg_w: 3, beat_w: 3, max_cand: 5, fade_in: 8, fade_out: 18, fmt: "mp3", br: 192 },
  "Short Stings": { min_dur: 1.0, max_dur: 2.5, min_score: 80, vocal_mode: "any", atk_w: 8, end_w: 5, nrg_w: 4, beat_w: 2, max_cand: 8, fade_in: 4, fade_out: 10, fmt: "mp3", br: 192 },
  "Long Beds": { min_dur: 4.0, max_dur: 8.0, min_score: 60, vocal_mode: "inst", atk_w: 2, end_w: 2, nrg_w: 5, beat_w: 4, max_cand: 3, fade_in: 50, fade_out: 100, fmt: "wav", br: null },
  "Vocal Hooks": { min_dur: 0.5, max_dur: 4.0, min_score: 70, vocal_mode: "vocal", atk_w: 3, end_w: 3, nrg_w: 2, beat_w: 1, max_cand: 10, fade_in: 4, fade_out: 8, fmt: "mp3", br: 320 },
};

const fmt = (s) => { const m = Math.floor(s / 60); return `${m}:${(s % 60).toFixed(1).padStart(4, "0")}`; };

/* ───── 1-bit dither pattern as CSS ───── */
const CHECKER = `url("data:image/svg+xml,%3Csvg width='2' height='2' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='1' height='1' fill='black'/%3E%3Crect x='1' y='1' width='1' height='1' fill='black'/%3E%3C/svg%3E")`;
const LINES_H = `url("data:image/svg+xml,%3Csvg width='1' height='2' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='1' height='1' fill='black'/%3E%3C/svg%3E")`;

/* ───── MacWindow chrome ───── */
const MacWindow = ({ title, children, style = {}, bodyStyle = {} }) => (
  <div style={{ border: "2px solid #000", borderRadius: 6, background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden", ...style }}>
    {/* Title bar */}
    <div style={{ background: "#fff", borderBottom: "2px solid #000", padding: "3px 6px", display: "flex", alignItems: "center", gap: 6, minHeight: 22, userSelect: "none" }}>
      <div style={{ width: 13, height: 13, border: "2px solid #000", borderRadius: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, height: 13, backgroundImage: LINES_H, backgroundSize: "1px 2px", backgroundRepeat: "repeat" }} />
      <span style={{ fontFamily: "Chicago_mac, 'Geneva', monospace", fontSize: 12, fontWeight: 700, padding: "0 6px", background: "#fff", flexShrink: 0 }}>{title}</span>
      <div style={{ flex: 1, height: 13, backgroundImage: LINES_H, backgroundSize: "1px 2px", backgroundRepeat: "repeat" }} />
    </div>
    <div style={{ flex: 1, overflow: "auto", ...bodyStyle }}>{children}</div>
  </div>
);

/* ───── Waveform + draggable candidate handles ───── */
const Timeline = ({ data, candidates, setCandidates, selectedId, setSelectedId, playhead, setPlayhead }) => {
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const W = 1400, H = 210;
  const pad = { l: 0, r: 0, t: 8, b: 22 };
  const pW = W, pH = H - pad.t - pad.b;
  const dur = data.timeline.duration;
  const rms = data.timeline.rms;
  const maxRms = Math.max(...rms);

  const tToX = useCallback((t) => pad.l + (t / dur) * pW, [dur, pW]);
  const xToT = useCallback((x) => Math.max(0, Math.min(dur, ((x - pad.l) / pW) * dur)), [dur, pW]);

  const getSvgX = useCallback((clientX) => {
    const rect = svgRef.current.getBoundingClientRect();
    return (clientX - rect.left) * (W / rect.width);
  }, []);

  /* dither waveform: columns of 1px rects */
  const colW = W / rms.length;
  const waveRects = rms.map((v, i) => {
    const h = Math.max(1, (v / maxRms) * (pH * 0.45));
    const x = i * colW;
    const cy = pad.t + pH / 2;
    return <rect key={i} x={x} y={cy - h} width={Math.max(colW - 0.3, 0.5)} height={h * 2} fill="#000" />;
  });

  /* dragging */
  const onPointerDown = (e, candId, edge) => {
    e.stopPropagation();
    e.preventDefault();
    const svg = svgRef.current;
    svg.setPointerCapture(e.pointerId);
    dragRef.current = { candId, edge };
  };

  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const { candId, edge } = dragRef.current;
    const svgX = getSvgX(e.clientX);
    const t = xToT(svgX);
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== candId) return c;
        if (edge === "start") return { ...c, start: Math.min(t, c.end - 0.3) };
        return { ...c, end: Math.max(t, c.start + 0.3) };
      })
    );
  };

  const onPointerUp = (e) => {
    if (!dragRef.current) return;
    svgRef.current.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  const onBgClick = (e) => {
    const svgX = getSvgX(e.clientX);
    setPlayhead(xToT(svgX));
  };

  const HANDLE_W = 7;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}
      onClick={onBgClick}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* beat gridlines */}
      {data.timeline.beats.filter((_, i) => i % 4 === 0).map((t, i) => (
        <line key={i} x1={tToX(t)} x2={tToX(t)} y1={pad.t} y2={pad.t + pH} stroke="#000" strokeOpacity={0.07} strokeWidth={0.5} />
      ))}

      {/* candidate regions */}
      {candidates.map((c) => {
        const x1 = tToX(c.start), x2 = tToX(c.end);
        const isSel = selectedId === c.id;
        return (
          <g key={c.id}>
            {/* fill — dithered for selected */}
            <rect x={x1} y={pad.t} width={x2 - x1} height={pH}
              fill={isSel ? CHECKER : "#000"} opacity={isSel ? 0.18 : 0.06}
              style={{ imageRendering: "pixelated" }}
              onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }}
              cursor="pointer"
            />
            {/* top/bottom borders */}
            <rect x={x1} y={pad.t} width={x2 - x1} height={1.5} fill="#000" opacity={isSel ? 0.9 : 0.3} />
            <rect x={x1} y={pad.t + pH - 1.5} width={x2 - x1} height={1.5} fill="#000" opacity={isSel ? 0.9 : 0.3} />

            {/* label */}
            <text x={x1 + 6} y={pad.t + 14} fill="#000" fontSize="11" fontFamily="'Geneva', monospace" fontWeight={isSel ? 700 : 400} opacity={isSel ? 1 : 0.5}>
              #{c.rank}{c.best ? " ★" : ""}
            </text>

            {/* LEFT HANDLE */}
            <rect x={x1 - 1} y={pad.t} width={HANDLE_W} height={pH} fill="#000" opacity={0} cursor="ew-resize"
              onPointerDown={(e) => onPointerDown(e, c.id, "start")} />
            <rect x={x1} y={pad.t + pH * 0.15} width={2.5} height={pH * 0.7} fill="#000" opacity={isSel ? 0.85 : 0.35} rx={1} />
            {isSel && <>
              <rect x={x1 - 0.5} y={pad.t + pH * 0.38} width={3.5} height={2} fill="#000" />
              <rect x={x1 - 0.5} y={pad.t + pH * 0.48} width={3.5} height={2} fill="#000" />
              <rect x={x1 - 0.5} y={pad.t + pH * 0.58} width={3.5} height={2} fill="#000" />
            </>}

            {/* RIGHT HANDLE */}
            <rect x={x2 - HANDLE_W + 1} y={pad.t} width={HANDLE_W} height={pH} fill="#000" opacity={0} cursor="ew-resize"
              onPointerDown={(e) => onPointerDown(e, c.id, "end")} />
            <rect x={x2 - 2.5} y={pad.t + pH * 0.15} width={2.5} height={pH * 0.7} fill="#000" opacity={isSel ? 0.85 : 0.35} rx={1} />
            {isSel && <>
              <rect x={x2 - 3} y={pad.t + pH * 0.38} width={3.5} height={2} fill="#000" />
              <rect x={x2 - 3} y={pad.t + pH * 0.48} width={3.5} height={2} fill="#000" />
              <rect x={x2 - 3} y={pad.t + pH * 0.58} width={3.5} height={2} fill="#000" />
            </>}
          </g>
        );
      })}

      {/* vocal regions */}
      {data.vocals.segments.map((s) => {
        const x1 = tToX(s.start), x2 = tToX(s.end);
        return (
          <g key={s.id}>
            <rect x={x1} y={H - 32} width={x2 - x1} height={15} fill={CHECKER} opacity={0.12} style={{ imageRendering: "pixelated" }} />
            <rect x={x1} y={H - 32} width={x2 - x1} height={1} fill="#000" opacity={0.3} />
            <text x={x1 + 2} y={H - 21} fill="#000" fontSize="8.5" fontFamily="'Geneva', monospace" opacity={0.55}>
              {s.text.length > 20 ? s.text.slice(0, 18) + "…" : s.text}
            </text>
          </g>
        );
      })}

      {/* waveform */}
      {waveRects}

      {/* time labels */}
      {[0, 10, 20, 30, 40, 50].map((t) => (
        <text key={t} x={tToX(t)} y={H - 2} fill="#000" opacity={0.35} fontSize="9" fontFamily="'Geneva', monospace" textAnchor="middle">{t}s</text>
      ))}

      {/* playhead */}
      {playhead > 0 && (
        <>
          <line x1={tToX(playhead)} x2={tToX(playhead)} y1={0} y2={H} stroke="#000" strokeWidth={1.5} />
          <polygon points={`${tToX(playhead) - 4},0 ${tToX(playhead) + 4},0 ${tToX(playhead)},7`} fill="#000" />
        </>
      )}
    </svg>
  );
};

/* ───── JSON Editor ───── */
const JsonEditor = ({ config, onChange }) => {
  const [raw, setRaw] = useState(JSON.stringify(config, null, 2));
  const [err, setErr] = useState(null);

  useEffect(() => { setRaw(JSON.stringify(config, null, 2)); setErr(null); }, [config]);

  const handleChange = (val) => {
    setRaw(val);
    try { const p = JSON.parse(val); setErr(null); onChange(p); } catch (e) { setErr(e.message.split(" at ")[0]); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <textarea
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        style={{
          flex: 1, minHeight: 0,
          background: "#fff",
          color: err ? "#000" : "#000",
          border: "2px solid #000",
          borderRadius: 0,
          padding: "6px 8px",
          fontFamily: "'Geneva', monospace",
          fontSize: 11,
          lineHeight: 1.5,
          resize: "none",
          outline: "none",
          whiteSpace: "pre",
          overflowWrap: "normal",
          overflowX: "auto",
          ...(err ? { backgroundImage: CHECKER, backgroundSize: "2px 2px", imageRendering: "pixelated", color: "#fff" } : {}),
        }}
      />
      {err && (
        <div style={{
          background: "#000", color: "#fff",
          fontFamily: "'Geneva', monospace", fontSize: 10,
          padding: "3px 6px", marginTop: -2, borderBottomLeftRadius: 0,
        }}>
          ✗ {err}
        </div>
      )}
    </div>
  );
};

/* ───── Score bar (1-bit style) ───── */
const Bar1Bit = ({ label, value }) => {
  const filled = Math.round(value / 5); // out of 20
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ width: 52, fontSize: 11, fontFamily: "'Geneva', monospace", textAlign: "right" }}>{label}</span>
      <div style={{ display: "flex", gap: 1 }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{
            width: 6, height: 12,
            background: i < filled ? "#000" : "transparent",
            border: "1px solid #000",
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, fontFamily: "'Geneva', monospace", width: 24, textAlign: "right" }}>{value}</span>
    </div>
  );
};

/* ───── Main ───── */
export default function JingleExtractorRetro() {
  const [activePreset, setActivePreset] = useState("Default");
  const [config, setConfig] = useState(PRESETS["Default"]);
  const [candidates, setCandidates] = useState(INIT_DATA.candidates);
  const [selectedId, setSelectedId] = useState(1);
  const [playhead, setPlayhead] = useState(0);
  const [stem, setStem] = useState("inst");
  const data = INIT_DATA;
  const selC = candidates.find((c) => c.id === selectedId);

  const handlePreset = (name) => { setActivePreset(name); setConfig({ ...PRESETS[name] }); };
  const handleConfigChange = (c) => { setConfig(c); setActivePreset(null); };

  return (
    <div style={{
      fontFamily: "'Geneva', 'Monaco', 'Courier New', monospace",
      background: "#c0c0c0",
      backgroundImage: CHECKER,
      backgroundSize: "2px 2px",
      imageRendering: "pixelated",
      minHeight: "100vh",
      color: "#000",
    }}>
      {/* Menu bar */}
      <div style={{
        background: "#fff",
        borderBottom: "2px solid #000",
        padding: "2px 12px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "'Geneva', monospace",
        height: 24,
      }}>
        <span>🍎</span>
        <span style={{ borderBottom: "none" }}>File</span>
        <span>Edit</span>
        <span>View</span>
        <span>Analysis</span>
        <span>Export</span>
        <span style={{ marginLeft: "auto", fontWeight: 400, fontSize: 11 }}>
          {data.track.id}.mp3 — {fmt(data.track.duration)} — {data.track.bpm} BPM — {data.track.language.toUpperCase()}
        </span>
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", height: "calc(100vh - 28px)", padding: 8, gap: 8 }}>

        {/* LEFT PANEL */}
        <div style={{ width: 290, minWidth: 290, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Presets */}
          <MacWindow title="Presets" style={{ flexShrink: 0 }}>
            <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 3 }}>
              {Object.keys(PRESETS).map((name) => (
                <button
                  key={name}
                  onClick={() => handlePreset(name)}
                  style={{
                    background: activePreset === name ? "#000" : "#fff",
                    color: activePreset === name ? "#fff" : "#000",
                    border: "2px solid #000",
                    borderRadius: 4,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontFamily: "'Geneva', monospace",
                    fontWeight: activePreset === name ? 700 : 400,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {activePreset === name ? "◆ " : "◇ "}{name}
                </button>
              ))}
            </div>
          </MacWindow>

          {/* Config JSON */}
          <MacWindow title="Configuration" style={{ flex: 1, minHeight: 0 }} bodyStyle={{ display: "flex", flexDirection: "column", padding: 6, minHeight: 0 }}>
            <JsonEditor config={config} onChange={handleConfigChange} />
            <div style={{ paddingTop: 6, display: "flex", gap: 4 }}>
              <button style={{
                flex: 1,
                background: "#000", color: "#fff",
                border: "2px solid #000", borderRadius: 6,
                padding: "7px 0", fontSize: 12, fontWeight: 700,
                fontFamily: "'Geneva', monospace", cursor: "pointer",
              }}>
                ▶ Run Analysis
              </button>
              <button style={{
                background: "#fff", color: "#000",
                border: "2px solid #000", borderRadius: 6,
                padding: "7px 10px", fontSize: 12,
                fontFamily: "'Geneva', monospace", cursor: "pointer",
              }}>
                Reset
              </button>
            </div>
          </MacWindow>
        </div>

        {/* RIGHT: TIMELINE + DETAIL */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>

          {/* Transport bar */}
          <MacWindow title="Transport" style={{ flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", padding: "4px 10px", gap: 12, fontSize: 11 }}>
              <div style={{ display: "flex", gap: 2 }}>
                {[["orig", "Original"], ["inst", "Instrumental"], ["vox", "Vocals"]].map(([k, l]) => (
                  <button key={k} onClick={() => setStem(k)} style={{
                    background: stem === k ? "#000" : "#fff",
                    color: stem === k ? "#fff" : "#000",
                    border: "2px solid #000", borderRadius: 4,
                    padding: "2px 8px", fontSize: 10,
                    fontFamily: "'Geneva', monospace", cursor: "pointer",
                    fontWeight: stem === k ? 700 : 400,
                  }}>{l}</button>
                ))}
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: "'Geneva', monospace", fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
                {fmt(playhead)}
              </span>
              <span style={{ fontSize: 11, opacity: 0.5 }}>/ {fmt(data.track.duration)}</span>
              <div style={{ display: "flex", gap: 3, marginLeft: 8 }}>
                {["◁◁", "▮▮", "▷", "▷▷"].map((sym) => (
                  <button key={sym} style={{
                    background: "#fff", border: "2px solid #000", borderRadius: 4,
                    width: 28, height: 22, fontSize: 10, cursor: "pointer",
                    fontFamily: "'Geneva', monospace", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{sym}</button>
                ))}
              </div>
            </div>
          </MacWindow>

          {/* Timeline waveform */}
          <MacWindow title="Timeline — drag handles ◀ ▶ to resize candidates" style={{ flexShrink: 0 }}>
            <div style={{ padding: 4, background: "#fff" }}>
              <Timeline
                data={data}
                candidates={candidates}
                setCandidates={setCandidates}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                playhead={playhead}
                setPlayhead={setPlayhead}
              />
            </div>
          </MacWindow>

          {/* Bottom: candidate list + detail */}
          <div style={{ flex: 1, display: "flex", gap: 8, minHeight: 0 }}>

            {/* Candidate list */}
            <MacWindow title="Candidates" style={{ flex: 1, minHeight: 0 }} bodyStyle={{ overflowY: "auto" }}>
              <div style={{ padding: 4 }}>
                {candidates.map((c) => {
                  const isSel = selectedId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 8px",
                        background: isSel ? "#000" : "transparent",
                        color: isSel ? "#fff" : "#000",
                        cursor: "pointer",
                        borderBottom: "1px solid #000",
                        fontSize: 11,
                      }}
                    >
                      <span style={{ fontWeight: 700, width: 18, textAlign: "center" }}>
                        {c.best ? "★" : `#${c.rank}`}
                      </span>
                      <span style={{ flex: 1 }}>
                        {fmt(c.start)} → {fmt(c.end)}
                      </span>
                      <span style={{ opacity: 0.6 }}>
                        {(c.end - c.start).toFixed(1)}s
                      </span>
                      <span style={{ fontWeight: 700 }}>{c.score}</span>
                      {c.vocal_overlap ? (
                        <span style={{ fontSize: 9, border: `1px solid ${isSel ? "#fff" : "#000"}`, borderRadius: 2, padding: "0 3px" }}>⚠ vox</span>
                      ) : (
                        <span style={{ fontSize: 9 }}>✓</span>
                      )}
                      <button
                        style={{
                          background: isSel ? "#fff" : "#000",
                          color: isSel ? "#000" : "#fff",
                          border: "none", borderRadius: 3,
                          padding: "1px 5px", fontSize: 10,
                          fontFamily: "'Geneva', monospace", cursor: "pointer",
                        }}
                      >▶</button>
                    </div>
                  );
                })}
              </div>
            </MacWindow>

            {/* Detail */}
            {selC && (
              <MacWindow title={`Detail — #${selC.rank}${selC.best ? " ★ BEST" : ""}`} style={{ width: 280, minWidth: 280, minHeight: 0 }} bodyStyle={{ overflowY: "auto" }}>
                <div style={{ padding: 10, fontSize: 11 }}>
                  <div style={{ marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #000" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
                      Candidate #{selC.rank}
                    </div>
                    <div>{fmt(selC.start)} → {fmt(selC.end)} · {(selC.end - selC.start).toFixed(1)}s</div>
                  </div>

                  <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>QUALITY</div>
                  <Bar1Bit label="Attack" value={selC.attack} />
                  <Bar1Bit label="Ending" value={selC.ending} />
                  <Bar1Bit label="Energy" value={selC.energy} />
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700 }}>Overall</span>
                    <span style={{ fontSize: 20, fontWeight: 700 }}>{selC.score}</span>
                  </div>

                  <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid #000" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>CONTEXT</div>
                    {[
                      ["Vocal overlap", selC.vocal_overlap ? "⚠ Yes" : "✓ None"],
                      ["Start on onset", selC.attack > 85 ? "✓ Yes" : "~ Close"],
                      ["End on beat", selC.ending > 85 ? "✓ Yes" : "~ Close"],
                      ["Stem", stem],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ opacity: 0.6 }}>{k}</span>
                        <span style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 14, display: "flex", gap: 4 }}>
                    <button style={{
                      flex: 1, background: "#fff", color: "#000",
                      border: "2px solid #000", borderRadius: 6,
                      padding: "7px 0", fontSize: 11,
                      fontFamily: "'Geneva', monospace", cursor: "pointer",
                    }}>▶ Preview</button>
                    <button style={{
                      flex: 1, background: "#000", color: "#fff",
                      border: "2px solid #000", borderRadius: 6,
                      padding: "7px 0", fontSize: 11, fontWeight: 700,
                      fontFamily: "'Geneva', monospace", cursor: "pointer",
                    }}>⬇ Export</button>
                  </div>
                </div>
              </MacWindow>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
