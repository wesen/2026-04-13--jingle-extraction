# Changelog

## 2026-04-13

- Initial workspace created


## 2026-04-13

Created a full-stack architecture review and onboarding-quality code assessment covering frontend extraction quality, backend alignment, validation status, and phased cleanup recommendations.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/design-doc/01-full-stack-architecture-review-alignment-assessment-and-cleanup-plan.md — Primary review deliverable
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/reference/01-diary.md — Investigation diary and validation record


## 2026-04-13

Validated the ticket with docmgr doctor, uploaded the final bundle to reMarkable, and verified the remote document listing under /ai/2026/04/13/JINGLE-004/.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/index.md — Ticket overview and delivery status


## 2026-04-13

Expanded the review ticket into a detailed phased implementation backlog covering API contract fixes, playback completion, candidate editing semantics, Storybook/design-system cleanup, backend hardening, and test expansion.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/tasks.md — Detailed follow-up task list derived from the review findings


## 2026-04-13

Implemented Phase 1 API contract fixes: typed analyze as a 202 accepted response, modeled status-bearing analysis query results explicitly in the frontend, added root polling/status UI, and added frontend/backend tests for 202 analysis states (commit 59a45bb).

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/tests/test_endpoints.py — New backend tests for 202 analysis states
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/api/jingleApi.ts — Frontend API contract fixes for analyze/getAnalysis
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx — Explicit UI handling for processing/failed analysis responses


## 2026-04-13

Implemented Phase 1 config truthfulness fixes: min_score now filters both pipeline and /api/mine results, export requests now carry fade/bitrate settings that the backend actually honors, preset fade defaults were standardized to 20ms/50ms, and run.py now respects backend config values (commit 402d5b2).

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/pipeline.py — min_score filtering added to pipeline candidate selection
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/export.py — Export rendering now honors fade and bitrate settings
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/mine.py — min_score filtering added to on-demand re-mining
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/run.py — Runtime config values now flow into uvicorn startup


## 2026-04-13

Finished the remaining Phase 1 hygiene work: ignored generated backend/frontend artifacts, committed the current App shell and Storybook baseline, verified build/build-storybook/tests all pass, and restored a clean git status after normal workflows (commit b5d4d94).

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/.gitignore — Generated artifact ignore rules for storybook-static and backend data
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/.storybook/preview.tsx — Persisted current Storybook Redux wrapper baseline
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/App.tsx — Persisted current App shell rendering the real JingleExtractor widget


## 2026-04-13

Implemented the first full playback slice: added a backend stem-audio route, materialized/fell back to original audio for orig playback, refactored the frontend audio hook into a real playback controller, and wired transport play/pause/seek plus timeline seeking into live audio playback (commit 2ce4483).

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/tracks.py — Full-track stem route for browser playback
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx — Transport/timeline integration with live playback
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/hooks/useAudioPlayer.ts — Playback controller ownership model and audio event wiring


## 2026-04-13

Added the first frontend interaction tests for playback: timeline background clicks now have a component test, and transport playhead advancement now has a JSDOM test using a FakeAudio harness (commit cb07c99).

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/Timeline/Timeline.test.tsx — Timeline click interaction regression test
- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/TransportBar/TransportBar.playback.test.tsx — Transport playback/playhead interaction regression test

