# Tasks

## Planned

### Ticket setup and scope
- [x] Create ticket workspace for lyric-aligned candidate mining follow-up
- [x] Write an initial design guide describing the problem and proposed direction
- [x] Write a comprehensive onboarding analysis / design / implementation guide comparing JINGLE-001 to the current productized system
- [x] Relate the key current mining/frontend files to this ticket

### Backend design and extraction
- [x] Extract candidate mining logic out of `app/routes/mine.py` into a reusable service layer
- [x] Decide whether initial lyric-aligned mining is segment-based, word-span-based, or both
- [x] Add config fields for mining strategy and lyric padding
- [x] Implement a first backend lyric-aligned candidate builder using stored WhisperX timestamps
- [ ] Add candidate metadata describing lyric source segment/word provenance

### Frontend and API shape
- [ ] Expose mining strategy explicitly in the UI instead of overloading `vocal_mode`
- [x] Add one or more lyric-centered presets
- [ ] Expand the debug panel to show lyric-source metadata for each candidate
- [x] Make visible in the UI which mining mode generated the current candidates

### Validation
- [x] Compare `rhythmic`, `vocal overlap`, and lyric-aligned mining on `thrash_metal_01`
- [ ] Validate phrase completeness subjectively by previewing exports
- [x] Add backend tests for lyric-aligned mining behavior
- [ ] Add frontend tests for the new config/debug UI behavior
