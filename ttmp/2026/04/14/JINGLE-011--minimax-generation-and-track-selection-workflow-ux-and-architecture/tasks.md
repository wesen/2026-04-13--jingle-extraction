# Tasks

## Completed in this ticket

- [x] Create JINGLE-011 ticket workspace
- [x] Inspect current MiniMax generation logic in `jingle_extractor.py`
- [x] Inspect backend analysis/catalog contracts and database schema
- [x] Inspect frontend shell and identify current track-selection limitations
- [x] Write intern-facing design doc with ASCII UI mockups, architecture analysis, API sketches, pseudocode, and file references
- [x] Write chronological investigation diary
- [x] Relate key files to the design doc and diary
- [x] Upload the document bundle to reMarkable

## Storybook-first frontend implementation plan

### Foundation

- [x] Add frontend studio-domain types for generation runs and library tracks
- [x] Add a dedicated `studioSlice` with screen, selection, and filter state
- [x] Wire `studioSlice` into the Redux store
- [x] Add reusable story fixtures for generation runs and library tracks

### Components

- [x] Build `GenerationComposer` with tokenized CSS and Storybook states
- [x] Build `TrackResultsList` on top of the shared `DataList` primitive with Storybook states
- [x] Build `TrackLibraryList` on top of the shared `DataList` primitive with Storybook states
- [x] Build `TrackInspector` using existing panel/button styling primitives with Storybook states
- [x] Build `StudioScreen` composition component using `MacWindow`, `MenuBar`, and the new studio widgets
- [x] Add a Storybook integration story for the full `StudioScreen`

### Validation

- [x] Validate `npm run build` for the frontend
- [x] Validate `npm run lint` for the frontend
- [x] Validate `npm run build-storybook`

## Backend/runtime implementation plan

### Backend foundation

- [x] Add `generation_runs` persistence and track metadata extensions in the backend database layer
- [x] Add backend models for generation requests, generation-run summaries/details, and library track items
- [x] Add database helpers for generation runs and library track queries

### Backend routes and services

- [x] Add a generation service that wraps the existing MiniMax CLI integration and writes generated tracks into backend-owned track directories
- [x] Add `POST /api/generations`
- [x] Add `GET /api/generations`
- [x] Add `GET /api/generations/{generation_id}`
- [x] Add a real track-library/catalog endpoint for generated and imported tracks
- [x] Add a track-centric analyze endpoint (`track_id`, not server path)
- [x] Register the new routes in the FastAPI app

### Backend validation

- [x] Add endpoint tests for generation runs, library listing, and track-centric analyze flow
- [x] Validate `python3 -m pytest -q tests`

## Later frontend/runtime work

- [ ] Wire the Studio screen to real RTK Query endpoints
- [ ] Validate the full flow live: generate batch → preview → analyze selected → extract jingles

