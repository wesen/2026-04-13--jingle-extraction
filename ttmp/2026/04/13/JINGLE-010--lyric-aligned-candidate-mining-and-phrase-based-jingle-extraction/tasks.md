# Tasks

## Planned

### Ticket setup and scope
- [x] Create ticket workspace for lyric-aligned candidate mining follow-up
- [x] Write an initial design guide describing the problem and proposed direction
- [x] Write a comprehensive onboarding analysis / design / implementation guide comparing JINGLE-001 to the current productized system
- [ ] Relate the key current mining/frontend files to this ticket

### Backend design and extraction
- [ ] Extract candidate mining logic out of `app/routes/mine.py` into a reusable service layer
- [ ] Decide whether initial lyric-aligned mining is segment-based, word-span-based, or both
- [ ] Add config fields for mining strategy and lyric padding
- [ ] Implement a first backend lyric-aligned candidate builder using stored WhisperX timestamps
- [ ] Add candidate metadata describing lyric source segment/word provenance

### Frontend and API shape
- [ ] Expose mining strategy explicitly in the UI instead of overloading `vocal_mode`
- [ ] Add one or more lyric-centered presets
- [ ] Expand the debug panel to show lyric-source metadata for each candidate
- [ ] Make visible in the UI which mining mode generated the current candidates

### Validation
- [ ] Compare `rhythmic`, `vocal overlap`, and lyric-aligned mining on `thrash_metal_01`
- [ ] Validate phrase completeness subjectively by previewing exports
- [ ] Add backend tests for lyric-aligned mining behavior
- [ ] Add frontend tests for the new config/debug UI behavior
