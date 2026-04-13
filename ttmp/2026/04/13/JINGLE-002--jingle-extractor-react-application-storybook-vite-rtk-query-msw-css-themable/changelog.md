# Changelog

## 2026-04-13

- Initial workspace created


## 2026-04-13

Created JINGLE-002 ticket with design doc, diary, and 11 tasks. Imported jingle-extractor-mac.jsx prototype. Analyzed 420-line JSX into 5 components, designed full architecture: Vite + TypeScript + RTK Query + MSW + Storybook + CSS custom property theming with data-part selectors.

### Related Files

- /home/manuel/Downloads/jingle-extractor-mac.jsx — Source prototype imported and analyzed


## 2026-04-13

Phase 1 scaffold complete: Vite + TypeScript + Storybook + RTK Query + MSW + CSS tokens. Created api/types.ts, app/store.ts, app/theme/*.css (3 themes), features/analysis/*.ts, features/audio/*.ts, api/jingleApi.ts, mocks/*.ts, utils/*.ts, components/JingleExtractor/parts.ts. TypeScript clean, Vite builds (270KB), lint passes.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/api/types.ts — Core TypeScript interfaces for all domain types


## 2026-04-13

Phase 2a: Extracted 3 leaf components with CSS + Storybook stories. ScoreBar (5 stories), MacWindow (3 stories), MenuBar (3 stories). All use data-part selectors, --je-* CSS tokens, ARIA attributes. TypeScript clean, Vite builds.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/ScoreBar — ScoreBar


## 2026-04-13

Phase 2b: TransportBar (4 stories), PresetPanel (3 stories), ConfigEditor (3 stories) + CSS. JSON editor with validation + error state. All with data-part, ARIA, --je-* tokens. Total 21 stories across 6 components. Fixed SB10 StoryObj args requirement.

### Related Files

- /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/TransportBar — TransportBar


## 2026-04-13

Phase 2c: CandidateList (4 stories) + CandidateDetail (3 stories). Uses ScoreBar internally. CandidateList: rank/time/duration/score/badge/preview columns. CandidateDetail: quality breakdown, context panel, export buttons. 28 stories total across 8 components. Fixed parts.ts duplicate keys.


## 2026-04-13

Phase 2d: Timeline decomposed into layers (BeatGrid, Candidate, Vocal, Waveform, Playhead) + useTimelineDrag hook + 4 stories. SVG viewBox 1400x210, xToT coordinate conversion, setPointerCapture for smooth drag. 32 stories across 9 components.

