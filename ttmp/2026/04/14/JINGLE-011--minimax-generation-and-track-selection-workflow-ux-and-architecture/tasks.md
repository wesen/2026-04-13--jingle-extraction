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

## Later backend/runtime work

- [ ] Add backend generation-run persistence and routes
- [ ] Add a real track-library/catalog endpoint for generated and imported tracks
- [ ] Add a track-centric analyze endpoint (`track_id`, not server path)
- [ ] Wire the Studio screen to real RTK Query endpoints
- [ ] Validate the full flow live: generate batch → preview → analyze selected → extract jingles

