# Tasks

## Completed

- [x] Inventory frontend, backend, and original prototype structure
- [x] Write full-stack review and alignment assessment for new intern onboarding
- [x] Record investigation diary with commands and validation results
- [x] Upload final document bundle to reMarkable

## Follow-up Implementation Backlog

### Phase 1 — Contract honesty and repo hygiene

#### API contract fixes
- [x] Change frontend `analyze` mutation typing to match backend `202 Accepted` response instead of `AnalysisResponse`
- [x] Introduce a typed union for `GET /api/analysis/{track_id}` covering both `complete` and `processing/failed` responses
- [x] Update UI loading/error/polling logic to use the new status-bearing response model explicitly
- [x] Add one integration test on the frontend API layer for `202` analysis responses
- [x] Add backend endpoint tests for `GET /api/analysis/{track_id}` in non-complete states

#### Config truthfulness
- [x] Decide whether `min_score` is a real supported feature for v1
- [x] If yes, apply `min_score` filtering in `app/pipeline.py`
- [x] If yes, apply `min_score` filtering in `app/routes/mine.py`
- [x] N/A — chose to support `min_score` for v1 instead of removing it from the UI/config surface
- [x] Decide whether `fade_in` and `fade_out` are user-configurable or fixed policy defaults
- [x] If configurable, add fade values to export request handling and apply them in `app/routes/export.py`
- [x] N/A — chose to keep fades configurable and make export honor them end to end

#### Repo hygiene
- [x] Add `storybook-static/` to `.gitignore`
- [x] Add backend runtime `data/` to `.gitignore`
- [x] Remove generated artifacts currently polluting lint/review status
- [x] Ensure the repo has a clean `git status` after build/storybook/test workflows

#### Runtime config consistency
- [x] Update `jingle-extractor-backend/run.py` to read host/port/log level from `app.config`
- [x] Verify backend startup behavior still works in tmux/dev workflows after that change

### Phase 2 — Playback and transport completion

#### Playback architecture
- [x] Decide on the single source of truth for playback state: Redux, controller hook, or hybrid with clear ownership
- [x] Document the playback model in code comments or a short reference doc
- [x] Refactor `useAudioPlayer` into a clearer playback controller with explicit lifecycle methods
- [x] Fix `useAudioPlayer` lint issues around callback ordering and dependencies
- [x] Add audio event handling for `loadedmetadata`, `timeupdate`, `ended`, and `error`

#### Transport behavior
- [x] Wire `TransportBar.onPlay` to real full-track playback
- [x] Wire `TransportBar.onPause` to real pause behavior
- [x] Wire seek back/forward buttons to both UI state and active audio state
- [x] Reflect active playback state in `TransportBar.isPlaying`
- [x] Keep the playhead synchronized during playback rather than only on clicks

#### Timeline playback integration
- [x] Make timeline clicks optionally seek active playback rather than only move a static playhead marker
- [x] Decide whether clicking the timeline should also auto-play from that position or only reposition
- [x] Add a test for “click timeline → playhead changes”
- [x] Add a test for “play transport → playhead advances over time”

#### Stem support
- [x] Decide whether `orig` should remain a visible stem option in the transport
- [x] If yes, ensure the backend materializes or serves an original normalized file for each track
- [x] Validate preview/export behavior for `orig`, `inst`, and `vox`
- [x] Add a backend test for missing-stem behavior and successful stem resolution

### Phase 3 — Candidate editing and timeline semantics

#### Local candidate edit model
- [x] Decide whether timeline drag edits are local-only until explicit commit, or immediately persisted
- [x] If local-only, compute visible candidates as server candidates overlaid with `editedCandidates`
- [x] N/A — chose a local-only candidate edit model for now, so no persistence API was introduced in this phase
- [x] Remove the current semantic mismatch where drag triggers global re-mining
- [x] Use the dragged `id`, `edge`, and `time` values meaningfully in the root handler

#### UI behavior for edits
- [x] Visually indicate when a candidate has unsaved local edits
- [x] Add reset/revert affordances for edited candidate boundaries
- [x] Decide whether selecting another preset/config should clear local candidate edits
- [x] Decide whether export should use edited boundaries, server boundaries, or only committed boundaries

#### Timeline implementation cleanup
- [x] Extract geometry helpers if `Timeline.tsx` continues to grow
- [x] Reduce imperative coupling between `Timeline.tsx` and the root widget
- [x] Add targeted tests for candidate handle dragging start/end constraints
- [x] Add tests for playhead clicks and selection interactions

### Phase 4 — Storybook and design-system cleanup

#### Storybook correctness
- [x] Standardize story imports on the Storybook framework package conventions used by the project
- [x] Remove invalid or obsolete ESLint disable comments in Storybook files
- [x] Clean up `preview.tsx` decorator lint issues
- [x] Remove unused `msw-storybook-addon` dependency if it is no longer needed
- [x] Verify `build-storybook` still succeeds after cleanup

#### Design-system polish
- [ ] Audit all extracted components for consistent `data-part` usage
- [ ] Ensure theme tokens fully cover any remaining hardcoded visual values
- [ ] Review accessibility labels/roles for Timeline, CandidateList, and TransportBar
- [ ] Add a small theming reference note showing the public styling API (`data-widget`, `data-je-theme`, `data-part`)

### Phase 5 — Backend hardening and service cleanup

#### Route/service organization
- [ ] Consider extracting candidate mining logic from `app/routes/mine.py` into a service/helper module
- [ ] Consider extracting clip rendering logic from `app/routes/export.py` into a dedicated export service module
- [ ] Decide whether pipeline post-processing and persistence steps should be split into smaller helpers inside `app/pipeline.py`
- [ ] Remove unused fields/helpers such as `config_hash` or implement them intentionally

#### Error handling and status flow
- [ ] Add explicit frontend behavior for backend `failed` analysis status
- [ ] Add backend tests for pipeline failure states and status propagation
- [ ] Ensure error messages surfaced by the backend are presented meaningfully in the UI

#### File-upload and multi-user readiness
- [ ] Replace or augment server-path-only analyze input with multipart upload support
- [ ] Decide how uploaded files are named and normalized into per-track storage
- [ ] Design an auth/API-key approach if multi-user deployment remains a roadmap item
- [ ] Decide whether progress should remain polling-based or move to SSE/WebSocket updates

### Phase 6 — Testing and validation expansion

#### Backend coverage
- [ ] Add tests for `POST /api/mine`
- [ ] Add tests for `POST /api/export`
- [ ] Add tests for `POST /api/export/batch`
- [ ] Add tests for status-bearing `GET /api/analysis/{track_id}` responses
- [ ] Add tests for missing stem and missing candidate errors

#### Frontend coverage
- [ ] Add interaction tests for transport controls
- [ ] Add interaction tests for candidate preview and export buttons
- [ ] Add interaction tests for timeline dragging
- [ ] Add tests for config validation / invalid JSON in `ConfigEditor`
- [ ] Add tests for theme switching if theme changes remain user-visible

#### Validation target
- [ ] Make `npm run build` pass consistently from a clean checkout
- [ ] Make `python3 -m pytest -q jingle-extractor-backend/tests` pass consistently from a clean checkout
- [x] Make `npm run lint` clean or explicitly narrow lint scope to source-only files
- [ ] Document the intended validation commands in the repo README or ticket follow-up notes

## Suggested ticket split for implementation

- [ ] JINGLE-005: API contracts + repo hygiene + lint cleanup
- [ ] JINGLE-006: Playback/transport completion
- [ ] JINGLE-007: Candidate editing semantics + timeline behavior
- [ ] JINGLE-008: Backend hardening + export/mining correctness
- [ ] JINGLE-009: Test expansion + CI validation tightening
