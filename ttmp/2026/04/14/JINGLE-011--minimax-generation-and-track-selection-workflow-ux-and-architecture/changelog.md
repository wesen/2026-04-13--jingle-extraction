# Changelog

## 2026-04-14

- Initial workspace created


## 2026-04-14

Created the JINGLE-011 research/design ticket for productizing MiniMax generation and track selection, wrote an intern-facing architecture and UX guide with ASCII screenshots and implementation phases, and documented the investigation process.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/2026/04/14/JINGLE-011--minimax-generation-and-track-selection-workflow-ux-and-architecture/design-doc/01-minimax-generation-and-track-selection-ux-architecture-and-implementation-guide.md — Primary detailed design deliverable
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/2026/04/14/JINGLE-011--minimax-generation-and-track-selection-workflow-ux-and-architecture/reference/01-investigation-diary.md — Chronological investigation record


## 2026-04-14

Validated the ticket with `docmgr doctor`, added the missing vocabulary entries (`minimax`, `ux`), and uploaded the bundle to reMarkable at `/ai/2026/04/14/JINGLE-011`.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/2026/04/14/JINGLE-011--minimax-generation-and-track-selection-workflow-ux-and-architecture/changelog.md — Recorded delivery and validation state
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/vocabulary.yaml — Added `minimax` and `ux` topic slugs for ticket hygiene


## 2026-04-14

Simplified the proposed UX from a multi-view studio shell to one main Studio screen plus the existing Mining screen, added a concise YAML widget DSL, and documented the full list of existing React widgets with their props for design-system handoff.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/2026/04/14/JINGLE-011--minimax-generation-and-track-selection-workflow-ux-and-architecture/design-doc/01-minimax-generation-and-track-selection-ux-architecture-and-implementation-guide.md — Updated IA
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/2026/04/14/JINGLE-011--minimax-generation-and-track-selection-workflow-ux-and-architecture/reference/01-investigation-diary.md — Recorded the simplification pass and widget-inventory handoff work


## 2026-04-14

Implemented the Storybook-first Studio UI slice: added studio-domain types and state, created GenerationComposer, TrackResultsList, TrackLibraryList, TrackInspector, and StudioScreen, and validated frontend build plus Storybook build.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/GenerationComposer/GenerationComposer.tsx — Created the generation form widget
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/StudioScreen/StudioScreen.tsx — Composed the new one-screen Studio layout from reusable widgets
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/TrackLibraryList/TrackLibraryList.tsx — Created the library list and filter widget
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/features/studio/studioSlice.ts — Dedicated Studio state model for the new one-screen workflow


## 2026-04-14

Implemented the backend Studio runtime slice: added generation-run persistence, generation service/routes, a real library endpoint, and track-centric analyze-by-id support, then validated the backend test suite.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/database.py — Added generation_runs and richer track catalog persistence
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/generations.py — Added generation run API endpoints
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/tracks.py — Added library endpoint and analyze-by-track-id endpoint
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/tests/test_endpoints.py — Added endpoint coverage for Studio backend workflows

