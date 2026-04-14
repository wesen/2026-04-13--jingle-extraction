# Changelog

## 2026-04-13

- Initial workspace created


## 2026-04-13

Created follow-up ticket for lyric-aligned candidate mining and wrote the first design guide explaining why vocal-overlap filtering is not the same as phrase-aware lyric extraction.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/pipeline.py — Current initial mining path and stored lyric segment data
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/mine.py — Current overlap-filter-based miner that motivates the follow-up
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/DebugPanel/DebugPanel.tsx — Current debug view that can support future lyric-aligned inspection


## 2026-04-14

Added a detailed intern-facing onboarding guide mapping the current FastAPI + React product against the original JINGLE-001 workflow, including a port matrix, runtime diagrams, API notes, file references, and a phased implementation plan for lyric-aligned mining.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/2026/04/13/JINGLE-010--lyric-aligned-candidate-mining-and-phrase-based-jingle-extraction/design/02-current-system-vs-jingle-001-port-map-and-implementation-guide.md — Primary onboarding analysis and implementation guide


## 2026-04-14

Implemented the first lyric-aligned candidate miner by adding candidate_mode and lyric padding fields, extracting shared mining logic into a backend service, wiring both pipeline and remine through it, and tuning the Vocal Hooks preset threshold after live comparison against the rhythmic vocal-overlap miner on thrash_metal_01.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/presets.py — Vocal Hooks preset retuned for lyric-aligned scoring
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/mine.py — Remine route now supports lyric-aligned mining from stored vocal segments
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/services/candidate_mining.py — Shared rhythmic and lyric-aligned candidate construction service
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/DebugPanel/DebugPanel.tsx — UI summary exposes candidate strategy and lyric padding


## 2026-04-14

Documented and resolved a live export 500 that turned out to be a backend runtime environment issue rather than a mixing bug: the backend tmux session was restarted under the project virtualenv so orig-stem exports work again through the frontend proxy.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/2026/04/13/JINGLE-010--lyric-aligned-candidate-mining-and-phrase-based-jingle-extraction/reference/01-implementation-diary.md — Recorded export 500 diagnosis and runtime fix

