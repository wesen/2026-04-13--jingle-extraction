---
Title: Diary
Ticket: JINGLE-004
Status: active
Topics:
    - frontend
    - backend
    - architecture
    - review
    - react
    - fastapi
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: .gitignore
      Note: Repo hygiene cleanup recorded in Step 9
    - Path: jingle-extractor-backend/app/routes/export.py
      Note: Phase 1 export-setting truthfulness implementation from Step 8
    - Path: jingle-extractor-backend/app/routes/tracks.py
      Note: Playback stem route and orig fallback implemented in Step 10
    - Path: jingle-extractor-backend/run.py
      Note: Verified startup now honors HOST/PORT/LOG_LEVEL during Step 8
    - Path: jingle-extractor-backend/tests/test_endpoints.py
      Note: Backend validation evidence
    - Path: jingle-extractor-ui/.storybook/main.ts
      Note: Storybook static public setup persisted during hygiene cleanup
    - Path: jingle-extractor-ui/.storybook/preview.tsx
      Note: Lint failure evidence for Storybook configuration
    - Path: jingle-extractor-ui/src/api/jingleApi.test.ts
      Note: Frontend API-layer test coverage added during Step 7
    - Path: jingle-extractor-ui/src/components/CandidateDetail/CandidateDetail.tsx
      Note: Step 13 local edit context and reset affordance
    - Path: jingle-extractor-ui/src/components/CandidateList/CandidateList.tsx
      Note: Step 13 edited candidate visual indicator
    - Path: jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx
      Note: Validation-time callback fix and root runtime review
    - Path: jingle-extractor-ui/src/components/Timeline/Timeline.test.tsx
      Note: Step 11 timeline interaction test
    - Path: jingle-extractor-ui/src/components/TransportBar/TransportBar.playback.test.tsx
      Note: Step 11 transport/playhead interaction test
    - Path: jingle-extractor-ui/src/features/analysis/analysisSlice.ts
      Note: Step 13 local-only candidate edit state model
    - Path: jingle-extractor-ui/src/hooks/useAudioPlayer.ts
      Note: |-
        Playback hook validation findings
        Playback controller refactor and event model implemented in Step 10
    - Path: jingle-extractor-ui/vitest.config.ts
      Note: Minimal Vitest configuration added to run source tests without Storybook include patterns
    - Path: ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/scripts/validate_export_stems.py
      Note: Step 12 runtime validation script for export across all stems
ExternalSources: []
Summary: Chronological investigation diary for the full-stack architecture review, including repo discovery, validation commands, key findings, and delivery steps.
LastUpdated: 2026-04-13T21:48:00-04:00
WhatFor: Capture how the review was performed, what evidence was gathered, what validation passed or failed, and how to continue the investigation later.
WhenToUse: Use when continuing the JINGLE-004 review, verifying claims in the design doc, or replaying the investigation commands.
---









# Diary

## Goal

This diary captures how I investigated the current React and FastAPI implementations for the jingle extractor, how I evaluated the extraction from the original imported JSX prototype, what validation I ran, and what major cleanup findings emerged. It is intended to let another engineer continue the review or challenge any conclusion with concrete commands and file references.

## Step 1: Create the review ticket and establish the investigation frame

I started by turning the user request into a new ticket instead of overloading the earlier build tickets. That was important because the requested deliverable is not a feature implementation; it is a full-stack review artifact aimed at onboarding and cleanup planning. I also loaded the relevant ticket/docmgr/reMarkable/diary skills first so the output format, bookkeeping, and upload path would be consistent with the rest of the project.

The goal in this first step was to create a stable documentation home, define the review scope, and identify the minimum set of evidence I would need before writing conclusions.

### Prompt Context

**User prompt (verbatim):** "Alright, we're the big brother taking over. Analyze the react implementation and the backend implementation and do a new docmgr ticket and make a thorough review of the code, where we are at, if the proper components have been extracted from the original import, if the backend is properly aligned, and just code quality in general.

reate a detailed analysis / design / code review that is very detailed for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file
  references.
  It should be very clear and detailed. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create a new docmgr ticket dedicated to a codebase review, perform an evidence-based assessment of both frontend and backend, compare the current React implementation to the original imported prototype, write a detailed intern-friendly design/review document plus diary, and upload the final bundle to reMarkable.

**Inferred user intent:** The user wants a durable, high-quality architectural handoff document that explains the current system, highlights misalignments and cleanup opportunities, and can be used by a new engineer to understand and continue the project.

**Commit (code):** N/A

### What I did

- Loaded the relevant skills and references with `read`:
  - `ticket-research-docmgr-remarkable`
  - `docmgr`
  - `remarkable-upload`
  - `frontend-review-docmgr-remarkable`
  - `code-quality-review-cleanup`
  - `diary`
- Ran:
  ```bash
  docmgr status --summary-only
  ```
- Created the ticket and initial documents:
  ```bash
  docmgr ticket create-ticket --ticket JINGLE-004 --title "Jingle Extractor Full-Stack Architecture Review and Code Quality Assessment" --topics frontend,backend,architecture,review,react,fastapi
  docmgr doc add --ticket JINGLE-004 --doc-type design-doc --title "Full-Stack Architecture Review, Alignment Assessment, and Cleanup Plan"
  docmgr doc add --ticket JINGLE-004 --doc-type reference --title "Diary"
  ```
- Added task placeholders for the review workflow.

### Why

- A separate ticket avoids mixing review material with the original implementation tickets.
- The review needed its own changelog, task list, and reMarkable upload destination.
- Skill-loading ensured the review followed the project’s preferred documentation workflow rather than becoming an ad hoc markdown dump.

### What worked

- `docmgr` was available and created the ticket cleanly.
- The new ticket path was created under `ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/`.
- The generated design doc and diary paths were in the expected locations.

### What didn't work

- The autogenerated `tasks.md` included a placeholder `- [ ] Add tasks here`, so the task list needed later cleanup rather than being ready as-is.

### What I learned

- The repository already had a good ticket cadence (`JINGLE-001` through `JINGLE-003`), so `JINGLE-004` was the natural continuation for a review deliverable.
- The docmgr scaffold is minimal by design; it expects the user or assistant to actively curate tasks/changelog rather than relying on the generated boilerplate.

### What was tricky to build

The tricky part here was not technical complexity; it was review discipline. The codebase already had a lot of context and recent work, so the risk was writing a “smart-sounding” opinion piece instead of an evidence-backed review. I deliberately postponed conclusions until after I had concrete inventory output, validation results, and line-anchored file evidence.

### What warrants a second pair of eyes

- Whether the chosen review scope is the right one for the next implementation phase.
- Whether a future follow-up ticket should split frontend cleanup from backend cleanup or keep them together.

### What should be done in the future

- Consider standardizing a reusable “architecture review ticket” template so future reviews start with stronger task scaffolding.

### Code review instructions

- Start with the ticket root: `ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/`
- Confirm the design doc and diary exist before reading details.
- Compare this ticket’s findings to the original implementation tickets for continuity.

### Technical details

- Ticket created: `JINGLE-004`
- Ticket path: `ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/`
- Design doc path: `design-doc/01-full-stack-architecture-review-alignment-assessment-and-cleanup-plan.md`
- Diary path: `reference/01-diary.md`

## Step 2: Inventory the frontend, backend, and original prototype

After the ticket existed, I mapped the repository surface area. The main goal was to verify whether the current React implementation actually reflects a thoughtful decomposition of the original prototype or whether it only looks decomposed on the surface. I also wanted a quick count of frontend components, stories, backend app files, and tests before reading the code in detail.

This step gave me the topological map needed for the deeper review in later steps.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Build a high-confidence architecture inventory before making any claims about extraction quality or backend alignment.

**Inferred user intent:** The user wants a review that is anchored in the actual codebase shape, not just a narrative summary.

**Commit (code):** N/A

### What I did

- Counted the combined repo file inventory:
  ```bash
  rg --files jingle-extractor-ui jingle-extractor-backend | wc -l
  ```
- Listed component files:
  ```bash
  find jingle-extractor-ui/src/components -maxdepth 2 -type f | sort
  ```
- Listed backend app files:
  ```bash
  find jingle-extractor-backend/app -maxdepth 3 -type f | sort
  ```
- Counted Storybook surface and exported stories:
  ```bash
  find jingle-extractor-ui/src/components -name '*.stories.tsx' | wc -l
  python3 - <<'PY'
  import glob,re
  files=glob.glob('jingle-extractor-ui/src/components/**/*.stories.tsx', recursive=True)
  count=0
  for f in files:
      txt=open(f).read()
      n=len(re.findall(r'^export const ', txt, re.M))
      print(f'{n:2d} {f}')
      count+=n
  print('TOTAL_STORIES',count)
  PY
  ```
- Read the original prototype import and the main frontend/backend entrypoints.

### Why

- Counting files and stories is a fast sanity check that helps distinguish “real decomposition” from “handful of files around a still-monolithic root.”
- Reading the original prototype before the current implementation makes it easier to judge whether extraction preserved the right seams.

### What worked

- The component directory showed ten extracted component groups.
- The Storybook scan showed **10 story files** and **35 exported stories**.
- The prototype file clearly exposed the original seams: `MacWindow`, `Timeline`, `JsonEditor`, `Bar1Bit`, inline menu/transport/candidate/detail sections.
- The extracted React component set mapped well to those seams.

### What didn't work

- One early story-count command was malformed:
  ```bash
  rg -n "stories\.tsx$" jingle-extractor-ui/src/components --files | wc -l
  ```
  and produced:
  ```text
  rg: stories\.tsx$: No such file or directory (os error 2)
  ```
- I replaced it with `find ... -name '*.stories.tsx'` and a small Python counting script.

### What I learned

- The extraction effort was real. The prototype’s major logical pieces do exist as standalone components in the current codebase.
- The current question is less “Did they extract the right components?” and more “Did the runtime behavior catch up with the component extraction?”

### What was tricky to build

The tricky part was deciding whether to judge extraction by file count or by responsibility boundaries. File count alone can be misleading. The useful test was: “Can I map each major prototype responsibility to a modern component with a clear semantic role?” On that test, the frontend did well.

### What warrants a second pair of eyes

- Whether `Timeline` should remain a single exported component with internal render layers or be broken into separately testable subcomponents.
- Whether `JingleExtractor` is at the right orchestration size or should be slimmed down further.

### What should be done in the future

- Add a short architecture index or diagram inside the frontend repo itself so future onboarding does not require reconstructing the component map from the filesystem.

### Code review instructions

- Read the prototype first: `ttmp/.../sources/local/jingle-extractor-mac.jsx`
- Then compare against `jingle-extractor-ui/src/components/*`
- Verify the extraction matrix in the design doc by reading the matching files side by side.

### Technical details

- Story files found: 10
- Stories counted: 35
- Key prototype anchors found:
  - `const MacWindow`
  - `const Timeline`
  - `const JsonEditor`
  - `const Bar1Bit`
  - root inline transport/candidates/detail sections

## Step 3: Inspect the frontend runtime model and find the main state seams

With the component map in hand, I shifted to runtime behavior. I read the root widget, the API layer, the Redux slices, the audio hook, and the timeline implementation. The main question in this step was: “Does the current runtime model match what the UI components imply?”

This is where the largest frontend issues became visible.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Evaluate how the current React runtime is wired, not just how it is visually decomposed.

**Inferred user intent:** The user wants to know whether the frontend is merely well-organized or actually coherent at runtime.

**Commit (code):** N/A

### What I did

- Read:
  - `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
  - `jingle-extractor-ui/src/api/jingleApi.ts`
  - `jingle-extractor-ui/src/api/types.ts`
  - `jingle-extractor-ui/src/features/analysis/analysisSlice.ts`
  - `jingle-extractor-ui/src/features/audio/audioSlice.ts`
  - `jingle-extractor-ui/src/components/Timeline/Timeline.tsx`
  - `jingle-extractor-ui/src/hooks/useAudioPlayer.ts`
  - several leaf components and Storybook files
- Ran targeted repository searches:
  ```bash
  rg -n "editedCandidates" jingle-extractor-ui/src -S
  rg -n "audioSlice|isPlaying|currentTime|setCurrentTime|playFrom|useAudioPlayer|playClip" jingle-extractor-ui/src -S
  rg -n "msw-storybook-addon|@storybook/react'|@storybook/react\"" jingle-extractor-ui -S
  ```

### Why

- The review needed to identify dead state, duplicated state, or mismatched callback semantics.
- Repository-wide searches are the fastest way to confirm whether a slice or field is actually in active use.

### What worked

- The searches made the two biggest frontend state issues immediately obvious:
  1. `editedCandidates` exists in the analysis slice but is never consumed elsewhere.
  2. `audioSlice` exists in the store, but most actual playback behavior is happening outside Redux in `useAudioPlayer`, and the transport component is still being passed `isPlaying={false}`.
- Reading `JingleExtractor.tsx` showed that candidate dragging still triggers `mineCandidates()` rather than applying local candidate edits.

### What didn't work

- The current runtime model does not fully support what the component APIs visually promise.
- `TransportBar` is extracted as a reusable control surface, but `onPlay` and `onPause` are still no-ops in the root widget.
- Candidate dragging is semantically mismatched: the UI suggests “edit this candidate,” but the code performs a global re-mine trigger.

### What I learned

- The strongest frontend work is at the component boundary layer and theming layer.
- The weakest frontend work is in the orchestration layer, especially where server data, local edit state, and playback state meet.

### What was tricky to build

The tricky part here was separating three kinds of incomplete code:

1. code that is intentionally placeholder,
2. code that reflects an unfinished migration,
3. code that is structurally wrong.

For example, a no-op transport button is not automatically an architectural flaw; it can just be unfinished implementation. But a drag callback that ignores `id`, `edge`, and `time` in favor of calling `mineCandidates({ trackId, config })` is not just incomplete. It is conceptually mismatched to the UI action. That difference matters in the review.

### What warrants a second pair of eyes

- Whether playback should be centralized in Redux or kept as an imperative controller hook.
- Whether candidate edits should remain local-only or gain a first-class backend patch API.

### What should be done in the future

- Pick one playback model and remove the half-in/half-out state split.
- Complete the `editedCandidates` loop or delete the state until the feature exists.

### Code review instructions

- Start in `JingleExtractor.tsx`
- Compare handler wiring against the actual slice state and hooks
- Search for `editedCandidates` and `audioSlice` usages to confirm dead/partial state findings

### Technical details

Useful evidence commands:

```bash
rg -n "editedCandidates" jingle-extractor-ui/src -S
rg -n "audioSlice|isPlaying|currentTime|setCurrentTime|playFrom|useAudioPlayer|playClip" jingle-extractor-ui/src -S
```

## Step 4: Inspect backend architecture, route contracts, and persistence model

Once the frontend behavior map was clear, I read the backend app factory, models, database wrapper, routes, scoring helpers, and tests. The goal was to determine whether the backend is fundamentally aligned with the UI and whether it expresses the system’s intended workflow clearly enough for a new engineer.

This step confirmed that the backend is structurally solid, but it also surfaced several contract-level inconsistencies.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Determine whether the backend service shape matches what the frontend thinks exists and whether the implementation is internally coherent.

**Inferred user intent:** The user wants to know whether the backend is “real” and properly aligned, not just a thin mockable scaffold.

**Commit (code):** N/A

### What I did

- Read:
  - `jingle-extractor-backend/app/main.py`
  - `jingle-extractor-backend/app/models.py`
  - `jingle-extractor-backend/app/config.py`
  - `jingle-extractor-backend/app/database.py`
  - `jingle-extractor-backend/app/pipeline.py`
  - `jingle-extractor-backend/app/routes/analyze.py`
  - `jingle-extractor-backend/app/routes/analysis.py`
  - `jingle-extractor-backend/app/routes/mine.py`
  - `jingle-extractor-backend/app/routes/export.py`
  - `jingle-extractor-backend/app/scoring.py`
  - `jingle-extractor-backend/tests/test_endpoints.py`
  - `jingle-extractor-backend/tests/test_scoring.py`
- Ran a targeted search for ignored `min_score` usage:
  ```bash
  rg -n "min_score" jingle-extractor-backend/app -S
  ```
- Captured numbered file output for key files using `nl -ba ... | sed -n ...`.

### Why

- The backend review needed both structural understanding and proof of which config fields or contracts are actually implemented.
- Searching for `min_score` is a fast way to distinguish “typed/preset-backed” from “actually enforced.”

### What worked

- The backend is easy to understand. `main.py`, `models.py`, `database.py`, and `pipeline.py` form a clean conceptual stack.
- The four-table SQLite design is appropriate for the current product shape.
- The pipeline serialization via `asyncio.Lock` and use of `asyncio.to_thread` are sensible for heavy sync ML work.
- The core success payload (`AnalysisResponse`) is closely aligned with the frontend TypeScript interfaces.

### What didn't work

- `min_score` is typed and preset-backed but not actually used in backend mining/scoring code.
- `fade_in` / `fade_out` are accepted in config but export still hardcodes 20ms / 50ms fades.
- `run.py` ignores the host/port/log-level settings defined in `app.config`.
- The frontend `analyze` mutation type assumes an analysis payload, but the backend returns an accepted-status payload.
- `GET /api/analysis/{track_id}` can also return a 202 status payload that is not represented in the frontend query type.

### What I learned

- The backend is not “fake” or merely a façade. It is a legitimate service layer over the pipeline.
- The backend’s main issues are not architectural collapse; they are feature incompleteness and contract honesty.

### What was tricky to build

The hardest part of this step was avoiding unfair criticism of a v1 service. For example, hardcoded fades are not inherently bad if the product intentionally standardizes them. The real issue is that the rest of the system exposes `fade_in` and `fade_out` as if they are user-configurable. That makes the problem one of *contract truthfulness*, not merely “missing polish.”

### What warrants a second pair of eyes

- Whether `orig` should remain a first-class stem option before the backend consistently materializes or serves an original normalized file.
- Whether the candidate edit model should be solved backend-first or frontend-first.

### What should be done in the future

- Add explicit route/service tests for `/api/mine`, `/api/export`, and `/api/export/batch`.
- Decide whether config fields that are not honored yet should be implemented immediately or hidden.

### Code review instructions

- Read `models.py` and `types.ts` together first.
- Then compare `routes/analyze.py` and `routes/analysis.py` against `jingleApi.ts`.
- Finally read `pipeline.py` and `routes/export.py` to understand where runtime behavior diverges from exposed config.

### Technical details

Useful evidence command:

```bash
rg -n "min_score" jingle-extractor-backend/app -S
```

Observed result: only model/preset definitions were found, not mining or export logic.

## Step 5: Run validation commands and correct one small compile break found during review

Before writing the final review, I ran the normal validation commands that a reviewer or follow-up engineer would expect: frontend build, backend tests, and frontend lint. This step was important because the document needed to describe the current validation posture honestly, not rely on old assumptions from earlier tickets.

During this validation pass I also corrected one small compile break introduced during earlier UI probing: `JingleExtractor.tsx` was calling `audioPlayer.play(...)`, but the hook now exposes `playClip(...)`. I changed that one callback name so the build status in the review reflects a real baseline rather than an artifact of a half-finished exploratory edit.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Validate the current codebase and report the actual posture, even if some checks fail.

**Inferred user intent:** The user wants a review that includes whether the current code actually builds/tests cleanly and where validation gaps remain.

**Commit (code):** N/A

### What I did

- Fixed one callback name mismatch in `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`:
  - changed `audioPlayer.play(...)` to `audioPlayer.playClip(...)`
- Ran frontend build:
  ```bash
  cd jingle-extractor-ui && npm run build
  ```
- Ran backend tests:
  ```bash
  python3 -m pytest -q jingle-extractor-backend/tests
  ```
- Ran frontend lint:
  ```bash
  cd jingle-extractor-ui && npm run lint
  ```

### Why

- A code review without validation evidence is not very useful.
- The review needed to distinguish “architecturally concerning” from “actually breaking the repo right now.”

### What worked

- Frontend build passed.
- Backend tests passed with:
  ```text
  20 passed in 0.40s
  ```
- The one-line callback-name fix restored a clean build baseline.

### What didn't work

The frontend lint run failed. Key exact failures included:

```text
/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/.storybook/preview.tsx
  26:5  error  Definition for rule 'react/display-name' was not found  react/display-name
```

```text
/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/ScoreBar/ScoreBar.stories.tsx
  5:1  error  Do not import renderer package "@storybook/react" directly...
```

```text
/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/hooks/useAudioPlayer.ts
  26:5  error  Error: Cannot access variable before it is declared
```

```text
/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/storybook-static/sb-manager/globals-runtime.js
  ... many errors from generated output being linted ...
```

I also hit two earlier command/environment issues while validating:

```bash
cd /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend && ../.venv/bin/pytest -q
```

returned:

```text
/bin/bash: line 1: ../.venv/bin/pytest: No such file or directory
```

and:

```bash
cd /home/manuel/code/wesen/2026-04-13--jingle-extraction && .venv/bin/python -m pytest -q jingle-extractor-backend/tests
```

returned:

```text
/home/manuel/code/wesen/2026-04-13--jingle-extraction/.venv/bin/python: No module named pytest
```

I then used system `python3 -m pytest`, which worked.

### What I learned

- The repo is in a better state than the lint output first suggests. Build and backend tests both pass.
- The lint posture is noisy because it mixes genuine source issues with generated artifacts under `storybook-static/`.
- The local virtual environment contains the runtime stack but not `pytest`, while system Python does.

### What was tricky to build

The tricky part here was deciding whether to “fix all validation” or to preserve the review boundary. The user asked for an analysis deliverable, not a cleanup sprint. I fixed the single callback-name break because it was a direct artifact of review-time probing and prevented a truthful build result. I did not expand the scope into a full lint cleanup pass; instead I documented the lint failures as part of the review findings.

### What warrants a second pair of eyes

- Whether the team wants lint to be a release gate immediately, or whether storybook/generated-output cleanup should happen in a follow-up ticket.
- Whether `useAudioPlayer.ts` should be cleaned as part of the transport implementation ticket rather than a separate hygiene pass.

### What should be done in the future

- Add `storybook-static/` and backend `data/` to `.gitignore`.
- Decide whether `pytest` should be available in `.venv` or whether system Python is the intended test runner.

### Code review instructions

- Re-run the three validation commands exactly as above.
- Compare the pass/fail posture in this diary to the summary in the design doc.
- Review the one-line `play` → `playClip` fix as a baseline-restoring change, not as feature work.

### Technical details

Validation commands used:

```bash
cd jingle-extractor-ui && npm run build
python3 -m pytest -q jingle-extractor-backend/tests
cd jingle-extractor-ui && npm run lint
```

## Step 6: Write the review deliverables and prepare for ticket bookkeeping + upload

After evidence gathering and validation, I wrote the main design/review document and this diary into the ticket. The main review document was written for a new intern, so it emphasizes system orientation, end-to-end flow, extraction completeness, alignment assessment, and cleanup sequencing rather than only listing bugs.

This final writing step is what turns the investigation into a durable handoff artifact rather than a temporary chat summary.

### Prompt Context

**User prompt (verbatim):** (same as Step 1)

**Assistant interpretation:** Synthesize the investigation into a detailed, reusable document set that can be stored in docmgr and delivered to reMarkable.

**Inferred user intent:** The user wants a professional-quality knowledge transfer packet, not just a terse audit memo.

**Commit (code):** N/A

### What I did

- Wrote the primary design/review document into:
  - `design-doc/01-full-stack-architecture-review-alignment-assessment-and-cleanup-plan.md`
- Wrote the diary into:
  - `reference/01-diary.md`
- Planned the remaining bookkeeping steps:
  - relate key files
  - update tasks/changelog
  - run `docmgr doctor`
  - upload bundle to reMarkable

### Why

- The deliverable needed to be intern-friendly and long-lived.
- The review needed both a narrative design doc and a chronological diary, because they serve different purposes.

### What worked

- The design doc was able to capture both broad architecture and specific concrete issues.
- The diary now contains exact commands, exact notable errors, and continuation guidance.

### What didn't work

- N/A at the time of writing this step; remaining work is bookkeeping and upload rather than new investigation.

### What I learned

- The codebase is mature enough to support a serious architecture review but still young enough that several “surface complete, runtime incomplete” features remain.
- The most valuable next work is consistency, not more component extraction.

### What was tricky to build

The tricky part of the writing phase was calibrating the tone. A review for a new intern must be detailed and explanatory, but it should not be melodramatic or vague. I tried to keep it factual: explain what is strong, what is incomplete, what is misleading, and why those distinctions matter.

### What warrants a second pair of eyes

- Whether the cleanup phases in the review are ordered correctly for the team’s priorities.
- Whether the playback/model issues should be split into separate follow-up tickets.

### What should be done in the future

- Convert the highest-priority findings into implementation tickets once the review is read.

### Code review instructions

- Read the design doc first.
- Use this diary second to replay the evidence.
- Re-run the listed commands if you want to verify current posture.

### Technical details

Primary doc written:

- `ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/design-doc/01-full-stack-architecture-review-alignment-assessment-and-cleanup-plan.md`

Diary written:

- `ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/reference/01-diary.md`

## Step 7: Implement Phase 1 contract fixes for status-bearing analysis responses

I started the implementation work with the first cluster of Phase 1 tasks because they are the highest-leverage correctness fixes: the frontend API typings were lying about what the backend returns, the root widget did not model in-progress analysis responses explicitly, and there was no automated coverage for those status-bearing paths. This was a good first implementation slice because it improved correctness without forcing a large behavioral redesign.

This step changed both the TypeScript contract layer and the validation surface. The main goals were to make the route types honest, make the UI explicitly understand pending/failed analysis states, and add tests on both sides of the contract.

### Prompt Context

**User prompt (verbatim):** "alright, go through the tasks one by one, committing at appropriate intervals, and keeping a detailed diary as you work"

**Assistant interpretation:** Start implementing the backlog incrementally, use focused commits rather than one giant change, and keep the ticket diary updated after each logical step.

**Inferred user intent:** The user wants disciplined execution of the review backlog, with visible progress, clean commit boundaries, and enough diary detail for later review or handoff.

**Commit (code):** 59a45bb — "fix(api): model status-bearing analysis responses"

### What I did
- Updated frontend types in `jingle-extractor-ui/src/api/types.ts`:
  - added `AnalysisStatus`
  - added `AnalyzeAcceptedResponse`
  - added `AnalysisPendingResponse`
  - added `GetAnalysisResponse`
  - added `isAnalysisCompleteResponse(...)`
- Updated `jingle-extractor-ui/src/api/jingleApi.ts`:
  - changed `analyze` mutation to return `AnalyzeAcceptedResponse`
  - changed `getAnalysis` query to return `GetAnalysisResponse`
  - added a test-friendly absolute fallback base URL for non-browser environments
- Updated `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`:
  - explicitly distinguished complete analysis payloads from status payloads
  - added a simple polling loop using `refetch()` while status is still in progress
  - rendered status/error text in the candidates panel when analysis is not yet complete
- Added frontend API-layer tests in `jingle-extractor-ui/src/api/jingleApi.test.ts`
- Added a minimal `jingle-extractor-ui/vitest.config.ts` so UI tests can run without Storybook test-pattern interference
- Added backend endpoint tests in `jingle-extractor-backend/tests/test_endpoints.py` for:
  - in-progress `202` analysis response
  - failed `202` analysis response
- Marked docmgr tasks 5–9 complete

### Why
- The review identified contract mismatch as the highest-priority correctness issue.
- The frontend should not pretend `POST /api/analyze` returns a full `AnalysisResponse` when the backend returns a `202 Accepted` envelope.
- The UI needs to model status-bearing responses explicitly or else pending/failed states become implicit bugs.
- Tests were added immediately so this contract fix is less likely to regress.

### What worked
- Frontend build passed after the contract changes:
  ```bash
  cd jingle-extractor-ui && npm run build
  ```
- Backend endpoint tests passed:
  ```bash
  python3 -m pytest -q jingle-extractor-backend/tests/test_endpoints.py
  ```
- The new frontend API-layer tests passed once the test environment base URL issue was handled:
  ```bash
  cd jingle-extractor-ui && npx vitest run --config vitest.config.ts src/api/jingleApi.test.ts
  ```
- The resulting commit boundary is clean and focused on one class of problem: status-bearing API correctness.

### What didn't work
- My first attempt to run the Vitest file failed because RTK Query was constructing requests from relative `/api/...` URLs in a Node test environment:
  ```text
  TypeError: Failed to parse URL from /api/analyze
  ```
  and:
  ```text
  TypeError: Failed to parse URL from /api/analysis/thrash_metal_01
  ```
- The first Vitest invocation also got caught by Storybook-oriented test patterns and reported:
  ```text
  No test files found, exiting with code 1
  include: src/**/*.mdx, src/**/*.stories.@(js|jsx|mjs|ts|tsx)
  ```

### What I learned
- The frontend test story was weaker than the review initially implied; getting the *first* real API-layer test running required a small amount of test-runner normalization.
- RTK Query with relative browser paths is fine in the app, but tests benefit from an explicit absolute fallback base URL or a browser-like environment.
- Once the route types were honest, the UI code became easier to reason about because it had to acknowledge incomplete analysis states directly.

### What was tricky to build

The tricky part was that this change was not just a type rename. The moment `getAnalysis` stopped pretending it always returned a full `AnalysisResponse`, the root widget had to become explicit about its state machine. That exposed the hidden coupling between “query succeeded” and “analysis is complete.” In the old code those two ideas were effectively conflated. The fix required making the code say what it actually means: a query can succeed while the analysis itself is still in progress.

Another subtle point was the test environment. The application uses a relative `/api/` base URL because it is browser-first and Vite-proxied. Node-based Vitest execution does not automatically provide that base context, so the API slice needed a test-friendly absolute fallback. That is a good example of a change that looks incidental in the diff but materially improves maintainability.

### What warrants a second pair of eyes
- Whether the polling strategy should remain `setTimeout(refetch, 1500)` in the root widget or move into a more explicit RTK Query polling policy.
- Whether the non-browser `API_BASE_URL` fallback should stay inside the production API slice or be injected by a small test-specific layer.
- Whether the UI should show the status panel somewhere more prominent than the candidate list area.

### What should be done in the future
- Add frontend tests for the root widget rendering pending and failed status payloads, not just API-layer dispatch tests.
- Add one backend test for a fully complete `/api/analysis/{track_id}` response to complement the new `202` cases.
- Consider a discriminated-union response helper if more status-bearing routes are added later.

### Code review instructions
- Start with `jingle-extractor-ui/src/api/types.ts` and `jingle-extractor-ui/src/api/jingleApi.ts`
- Then review `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx` to see how pending/failed states are handled
- Review the new tests in:
  - `jingle-extractor-ui/src/api/jingleApi.test.ts`
  - `jingle-extractor-backend/tests/test_endpoints.py`
- Re-run these commands:
  ```bash
  cd jingle-extractor-ui && npm run build
  cd jingle-extractor-ui && npx vitest run --config vitest.config.ts src/api/jingleApi.test.ts
  cd /home/manuel/code/wesen/2026-04-13--jingle-extraction && python3 -m pytest -q jingle-extractor-backend/tests/test_endpoints.py
  ```

### Technical details
- Files changed for this step:
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/api/types.ts`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/api/jingleApi.ts`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/api/jingleApi.test.ts`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/vitest.config.ts`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/tests/test_endpoints.py`
- Tasks completed in this step: 5, 6, 7, 8, 9

## Step 8: Make config truthful by honoring `min_score` and export render settings

After the API contract work, I moved to the next Phase 1 correctness cluster: configuration truthfulness. The review had identified that `min_score`, `fade_in`, and `fade_out` were visible across the UI, presets, and backend models, but they were not all being honored in the runtime behavior. This is the kind of inconsistency that makes a system feel unreliable even when the underlying architecture is good.

In this step I made two explicit product decisions. First, `min_score` should remain a real supported feature for v1 rather than being removed from the config surface. Second, fades should remain configurable, but the system defaults should be aligned to the project preference of 20ms fade-in and 50ms fade-out. With those decisions in place, I wired the backend and frontend so the settings are actually used.

### Prompt Context

**User prompt (verbatim):** (same as Step 7)

**Assistant interpretation:** Continue executing the backlog with focused commits and diary updates, moving from review findings into actual correctness fixes.

**Inferred user intent:** The user wants the visible controls and config surface to match real system behavior, not remain half-implemented placeholders.

**Commit (code):** 402d5b2 — "fix(export): honor min score and export render settings"

### What I did
- Applied `min_score` filtering in `jingle-extractor-backend/app/pipeline.py`
- Applied `min_score` filtering in `jingle-extractor-backend/app/routes/mine.py`
- Extended frontend export request types in `jingle-extractor-ui/src/api/jingleApi.ts` to include:
  - `fade_in`
  - `fade_out`
  - `br`
- Extended backend export models in `jingle-extractor-backend/app/models.py` to accept the same values with sane defaults
- Updated `jingle-extractor-backend/app/routes/export.py` so `_render_clip(...)` now uses requested fade values and bitrate when exporting MP3s
- Updated `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx` so preview/export requests pass the current config’s `fmt`, `fade_in`, `fade_out`, and `br`
- Updated preset defaults in both frontend and backend to 20ms fade-in / 50ms fade-out:
  - `jingle-extractor-ui/src/utils/constants.ts`
  - `jingle-extractor-backend/app/presets.py`
  - `jingle-extractor-ui/src/mocks/handlers.ts`
  - related config fixtures/stories/tests
- Updated `jingle-extractor-backend/run.py` to respect `HOST`, `PORT`, and `LOG_LEVEL` from `app.config`
- Marked tasks 10, 11, 12, 14, 15, 21, and 22 complete
- Marked the alternative-path tasks as N/A in `tasks.md`:
  - removing `min_score`
  - treating fades as fixed-only UI-hidden policy

### Why
- A config value that is visible but ignored is worse than an absent feature because it teaches users not to trust the UI.
- `min_score` is a useful, intuitive control and worth keeping.
- The project already has an explicit user preference for 20ms/50ms fades, so aligning defaults to that preference reduces surprise.
- `run.py` should not silently ignore settings already declared in the backend config module.

### What worked
- Frontend build still passed:
  ```bash
  cd jingle-extractor-ui && npm run build
  ```
- Full backend tests passed after the change:
  ```bash
  python3 -m pytest -q jingle-extractor-backend/tests
  ```
- Backend startup smoke test showed `run.py` now honors overridden environment config:
  ```bash
  cd jingle-extractor-backend && PORT=8011 timeout 5 ../.venv/bin/python run.py
  ```
  with log output including:
  ```text
  INFO:     Uvicorn running on http://0.0.0.0:8011
  ```
- The preset/default surface is now much more honest: the fade values seen in config can actually influence export rendering.

### What didn't work
- The export-setting work exposed one more implicit truthfulness gap: bitrate (`br`) was also effectively hardcoded before this change. I chose to wire it through while already touching the export path so the fix would be complete instead of half-finished.
- There are still no dedicated route tests for `/api/export` or `/api/mine`; those remain future tasks even though this step improved the implementation correctness.

### What I learned
- Several of the “incomplete config” problems shared the same root cause: the original prototype surface was preserved, but the service-backed implementation only partially absorbed it.
- The best fixes in this phase are the ones that collapse ambiguity. After this step, the answer to “does `min_score` matter?” and “do fade settings matter?” is no longer “sort of.”
- Small backend entrypoint fixes like `run.py` config consistency are cheap and worth doing early because they reduce deployment confusion later.

### What was tricky to build

The subtle design choice here was whether to make fades fixed policy or real configuration. The review backlog explicitly called for a decision, and either path was valid. I chose configurable fades for three reasons:

1. the existing UI and model shape already expose them,
2. removing them would create more surface churn right away,
3. wiring them through end to end was straightforward once I was already changing the export request contract.

The other tricky part was deciding how much default normalization to do. The existing prototype-derived presets had different fade values, but the project context called for 20ms fade-in and 50ms fade-out as the preferred smoothing behavior. I standardized the current defaults to those values so the system behavior matches the stated preference more closely.

### What warrants a second pair of eyes
- Whether bitrate should remain request-configurable or eventually be normalized by export preset/theme policy
- Whether all preset fade values should truly stay identical now, or whether later UX work should reintroduce differentiated fades intentionally
- Whether `_render_clip(...)` should move into a dedicated export service module sooner rather than later

### What should be done in the future
- Add backend tests that exercise `/api/mine` with `min_score` thresholds
- Add backend tests that verify `/api/export` actually honors fade/bitrate inputs
- Decide whether the export request should eventually include more explicit naming for “render settings” vs “analysis settings”

### Code review instructions
- Start with backend logic:
  - `jingle-extractor-backend/app/pipeline.py`
  - `jingle-extractor-backend/app/routes/mine.py`
  - `jingle-extractor-backend/app/routes/export.py`
- Then compare the request contract changes in:
  - `jingle-extractor-ui/src/api/jingleApi.ts`
  - `jingle-extractor-backend/app/models.py`
- Finally review how the root widget passes current config values into preview/export in:
  - `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
- Re-run these commands:
  ```bash
  cd jingle-extractor-ui && npm run build
  cd /home/manuel/code/wesen/2026-04-13--jingle-extraction && python3 -m pytest -q jingle-extractor-backend/tests
  cd jingle-extractor-backend && PORT=8011 timeout 5 ../.venv/bin/python run.py
  ```

### Technical details
- Files changed for this step:
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/models.py`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/pipeline.py`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/presets.py`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/export.py`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/mine.py`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/run.py`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/tests/conftest.py`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/api/jingleApi.ts`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/api/jingleApi.test.ts`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/ConfigEditor/ConfigEditor.stories.tsx`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/hooks/useAudioPlayer.ts`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/mocks/handlers.ts`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/utils/constants.ts`
- Tasks completed in this step: 10, 11, 12, 14, 15, 21, 22
- Tasks explicitly resolved as N/A by decision: 13, 16

## Step 9: Clean repo hygiene, ignore generated artifacts, and get back to a clean working tree

With the contract and config-truthfulness fixes committed, I finished the remaining Phase 1 hygiene work. This step was partly about new changes and partly about eliminating lingering repository noise: generated output directories were not ignored, and a few legitimate tracked source changes from the current UI shell/Storybook setup were still sitting uncommitted. Until those were resolved, the repository could not reach a clean post-build state.

The goal of this step was simple: after normal frontend/backend workflows, `git status` should be clean instead of cluttered by generated artifacts or long-lived local modifications.

### Prompt Context

**User prompt (verbatim):** (same as Step 7)

**Assistant interpretation:** Continue walking the backlog in order and make the repository healthier after each implementation slice, not just functionally more correct.

**Inferred user intent:** The user wants disciplined progress where each phase leaves the repo in a reviewable, committable state.

**Commit (code):** b5d4d94 — "chore(repo): ignore generated artifacts and persist current ui shell"

### What I did
- Updated `.gitignore` to ignore:
  - `jingle-extractor-ui/storybook-static/`
  - `jingle-extractor-backend/data/`
- Removed generated working-tree artifacts:
  ```bash
  rm -rf jingle-extractor-ui/storybook-static jingle-extractor-backend/data
  ```
- Committed the current tracked UI-shell/Storybook changes that were already part of the real working baseline:
  - `jingle-extractor-ui/src/App.tsx`
  - `jingle-extractor-ui/.storybook/main.ts`
  - `jingle-extractor-ui/.storybook/preview.tsx`
  - `jingle-extractor-backend/app/routes/analyze.py`
- Re-ran validation workflows:
  ```bash
  cd jingle-extractor-ui && npm run build
  cd jingle-extractor-ui && npm run build-storybook
  python3 -m pytest -q jingle-extractor-backend/tests
  ```
- Confirmed the working tree was clean afterward:
  ```bash
  git status --short
  ```

### Why
- Generated artifacts should not pollute review or lint status.
- A long-lived dirty working tree makes it harder to see the *next* real change.
- The current App/Storybook shell changes were clearly intended baseline behavior and needed to be brought into version control instead of remaining accidental local drift.

### What worked
- Frontend production build passed.
- Storybook production build passed and regenerated `storybook-static/`, which remained ignored as intended.
- Backend tests passed.
- `git status --short` returned clean after the commit.

### What didn't work
- Nothing new failed in this step, but it did reveal that some important baseline UI/Storybook work had been left uncommitted earlier. That was not a code bug, but it was a repository hygiene problem.

### What I learned
- Repo hygiene work is not glamorous, but it has a disproportionate effect on development speed because it reduces ambient confusion.
- Getting back to a clean working tree before starting the next feature cluster is worth doing, especially in a project with multiple ongoing frontend/backend changes.
- Storybook build output is a classic source of accidental repo noise; ignoring it explicitly removes a lot of friction.

### What was tricky to build

The main tricky point here was deciding whether to revert or commit the existing tracked modifications in `App.tsx` and Storybook configuration. Reverting them would have moved the repository backward toward an older placeholder shell, which was clearly not the intended state of the application. Committing them as part of the hygiene pass was the right call because it restored honesty between the working tree and the actual current app baseline.

### What warrants a second pair of eyes
- Whether any additional generated artifacts should be ignored more explicitly in the future
- Whether Storybook configuration cleanup should be split further in the later Storybook-specific tasks, or whether the current baseline is already good enough structurally

### What should be done in the future
- Keep the habit of checking `git status` after each build/test/storybook workflow cluster
- Follow up with the later Storybook lint/import cleanup tasks so repository hygiene also includes clean lint output, not just ignored artifacts

### Code review instructions
- Review `.gitignore` first
- Confirm the current App shell and Storybook files now live in source control
- Re-run:
  ```bash
  cd jingle-extractor-ui && npm run build
  cd jingle-extractor-ui && npm run build-storybook
  cd /home/manuel/code/wesen/2026-04-13--jingle-extraction && python3 -m pytest -q jingle-extractor-backend/tests
  git status --short
  ```
- The important success criterion is that the final `git status --short` output is empty.

### Technical details
- Files committed in this step:
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/.gitignore`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/App.tsx`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/.storybook/main.ts`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/.storybook/preview.tsx`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/analyze.py`
- Tasks completed in this step: 17, 18, 19, 20

## Step 10: Build a real playback controller and wire transport to backend-served stems

With Phase 1 complete, I moved into the first major Phase 2 cluster: real playback. The review had identified that the transport bar existed visually but did not actually control audio, and the timeline playhead was only a static marker rather than a live playback cursor. To fix that properly, I needed both a frontend playback controller and a backend path that the browser could actually load as full-track audio.

The implementation decision for this phase was to let `useAudioPlayer` own the live `HTMLAudioElement` lifecycle while Redux continues to store the projected UI cursor state (`playhead`) and user selection state (`stem`). That keeps imperative browser audio control out of Redux while still letting the rest of the UI observe playback progress in a serializable way.

### Prompt Context

**User prompt (verbatim):** (same as Step 7)

**Assistant interpretation:** Continue into the next task cluster and replace placeholder playback behavior with real end-to-end audio control.

**Inferred user intent:** The user wants the app to stop behaving like a static mock and start acting like a real audio tool, with transport controls that actually work.

**Commit (code):** 2ce4483 — "feat(playback): wire transport to backend stem audio"

### What I did
- Added a new backend route in `jingle-extractor-backend/app/routes/tracks.py`:
  - `GET /api/tracks/{track_id}/audio/{stem}`
  - returns a full-track stem as a `FileResponse`
- Added original-audio support in `jingle-extractor-backend/app/pipeline.py`:
  - materializes `orig.mp3` into the track directory when running the pipeline
  - copies directly when the source is already MP3
  - transcodes to MP3 via `pydub` otherwise
- Added fallback resolution for `orig` in both:
  - `jingle-extractor-backend/app/routes/tracks.py`
  - `jingle-extractor-backend/app/routes/export.py`
  so existing analyzed tracks can still use `original_path` even if `orig.mp3` was not materialized yet
- Refactored `jingle-extractor-ui/src/hooks/useAudioPlayer.ts` into a clearer playback controller:
  - explicit ownership model documented in comments
  - `playClip(...)` for preview clips
  - `playTrack(...)` for full-track playback
  - `pause()`, `stop()`, `seekTo()`
  - event handling for `loadedmetadata`, `timeupdate`, `ended`, `error`, `play`, and `pause`
- Updated `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`:
  - transport Play now calls `playTrack(...)`
  - transport Pause now pauses real audio
  - seek back/forward update both Redux playhead and active audio state
  - timeline clicks now reposition the active audio if one is loaded
  - stem changes while playing switch playback to the new stem at the current playhead
  - `TransportBar.isPlaying` now reflects live audio state instead of a hardcoded `false`
- Added backend endpoint tests in `jingle-extractor-backend/tests/test_endpoints.py` for:
  - successful stem file serving
  - missing-stem 404 behavior
- Marked playback/stem-support tasks 23–34, 37, 38, and 40 complete

### Why
- The transport bar could not become real until the browser had an addressable full-track audio source.
- A full-track route is simpler and more honest than trying to fake long-form playback through repeated clip exports.
- The hook/controller model keeps audio behavior localized while still letting the rest of the UI react to progress through callbacks.
- Supporting `orig` mattered because the transport already exposed it as a first-class option.

### What worked
- Frontend build passed:
  ```bash
  cd jingle-extractor-ui && npm run build
  ```
- Full backend tests passed after adding the new route tests:
  ```bash
  python3 -m pytest -q jingle-extractor-backend/tests
  ```
- The new test count increased to 24 passed.
- The backend test route for stem serving succeeded using temp files and the patched test `DATA_DIR` setup.
- The playhead wiring is now structurally correct: playback time events can drive the UI instead of the UI inventing time on its own.

### What didn't work
- My first attempt to “manually validate” the new audio route against the already-running backend on port 8000 was misleading because that server’s current SQLite state did not contain `thrash_metal_01` in `/api/tracks` at that moment. I ran:
  ```bash
  curl -s http://localhost:8000/api/tracks
  ```
  and got:
  ```json
  []
  ```
  Then:
  ```bash
  curl -s http://localhost:8000/api/tracks/thrash_metal_01/audio/inst
  ```
  returned:
  ```json
  {"detail":"Track not found: thrash_metal_01"}
  ```
- I also initially used `curl -I` against the audio endpoint and got:
  ```text
  HTTP/1.1 405 Method Not Allowed
  allow: GET
  ```
  because the endpoint only implements `GET`, not `HEAD`.

### What I learned
- The route design for full-track audio is straightforward, but manual validation depends heavily on the state of the live backend DB, so backend tests are the more reliable signal here.
- The playback-controller approach is much easier to reason about once `timeupdate` events are feeding the shared playhead state.
- Supporting `orig` robustly requires thinking about both newly analyzed tracks and already analyzed tracks that predate the new `orig.mp3` materialization step.

### What was tricky to build

The hard part of this step was not just “playing audio.” It was deciding where playback truth lives. If Redux owned too much, the implementation would become awkward and non-serializable because `HTMLAudioElement` is inherently imperative browser state. If the hook owned everything with no projection outward, the rest of the app would not know where playback is. The solution was a split with clear boundaries:

- hook owns the live audio element,
- Redux owns the projected cursor state (`playhead`) and user choices,
- the root widget bridges the two.

Another subtle issue was backward compatibility for existing analyzed tracks. New pipeline runs can now materialize `orig.mp3`, but older tracks might only have `original_path`. Adding fallback resolution in the routes avoids forcing a full re-analysis before transport can work on original audio.

### What warrants a second pair of eyes
- Whether full-track audio should eventually move behind a dedicated audio/router module rather than living in `tracks.py`
- Whether `orig` fallback should be centralized in a shared helper instead of duplicated in `tracks.py` and `export.py`
- Whether the app should preserve paused full-track playback when a preview clip is triggered, instead of stopping current playback entirely

### What should be done in the future
- Add browser-level interaction tests for transport play/pause and timeline seeking
- Add explicit validation of preview/export behavior for `orig`, `inst`, and `vox` against a live analyzed track
- Revisit the candidate-drag behavior next, since timeline seeking is now real but candidate editing is still semantically wrong

### Code review instructions
- Start with backend support:
  - `jingle-extractor-backend/app/routes/tracks.py`
  - `jingle-extractor-backend/app/pipeline.py`
  - `jingle-extractor-backend/app/routes/export.py`
- Then review the playback controller:
  - `jingle-extractor-ui/src/hooks/useAudioPlayer.ts`
- Finally review the root wiring:
  - `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
- Re-run:
  ```bash
  cd jingle-extractor-ui && npm run build
  cd /home/manuel/code/wesen/2026-04-13--jingle-extraction && python3 -m pytest -q jingle-extractor-backend/tests
  ```
- If you want to reproduce the manual live-server check, verify first that `/api/tracks` is not empty on the running backend instance.

### Technical details
- Files changed for this step:
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/pipeline.py`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/export.py`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/tracks.py`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/tests/test_endpoints.py`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/hooks/useAudioPlayer.ts`
- Tasks completed in this step: 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 37, 38, 40
- Task intentionally left for later in this area: 39 (full preview/export validation across `orig`, `inst`, and `vox` against a live analyzed track)

## Step 11: Add frontend interaction tests for timeline clicks and transport-driven playhead updates

After wiring real playback, I added the first frontend interaction tests that exercise the user-facing behavior rather than just the contract layer. This step covered the two remaining tasks in the immediate playback cluster: one test for clicking the timeline background to move the playhead, and one test for pressing Play in the transport and seeing the visible playhead advance via audio time updates.

I used a lightweight JSDOM + Testing Library setup rather than jumping straight to end-to-end browser automation. That choice keeps the tests fast and focused while still exercising real React components and event wiring.

### Prompt Context

**User prompt (verbatim):** (same as Step 7)

**Assistant interpretation:** Continue the playback task cluster by turning the newly implemented transport/timeline behavior into regression-tested frontend interactions.

**Inferred user intent:** The user wants the work to harden as it goes, not just accumulate code changes without behavioral proof.

**Commit (code):** cb07c99 — "test(ui): cover timeline clicks and transport playhead sync"

### What I did
- Installed frontend test dependencies in `jingle-extractor-ui/package.json`:
  - `jsdom`
  - `@testing-library/react`
  - `@testing-library/user-event`
- Added `jingle-extractor-ui/src/components/Timeline/Timeline.test.tsx`
  - verifies clicking the timeline background calls `onPlayheadChange(...)` with the expected time value
  - stubs `getBoundingClientRect()` so the SVG click math is deterministic in JSDOM
- Added `jingle-extractor-ui/src/components/TransportBar/TransportBar.playback.test.tsx`
  - builds a small harness using `TransportBar` + `useAudioPlayer`
  - replaces the browser `Audio` object with a `FakeAudio` test double
  - verifies clicking Play and emitting `timeupdate` advances the visible playhead state
- Ran:
  ```bash
  cd jingle-extractor-ui && npx vitest run --config vitest.config.ts src/components/Timeline/Timeline.test.tsx src/components/TransportBar/TransportBar.playback.test.tsx
  cd jingle-extractor-ui && npm run build
  cd /home/manuel/code/wesen/2026-04-13--jingle-extraction && python3 -m pytest -q jingle-extractor-backend/tests
  ```

### Why
- The playback work was now important enough to deserve regression tests.
- These two tests cover the main user-visible behavior added in the previous step without requiring a full end-to-end browser harness.
- Introducing JSDOM/Testing Library now also lays groundwork for the later frontend interaction tasks in the backlog.

### What worked
- The new Vitest component tests passed.
- Frontend build still passed after adding the tests and dependencies.
- Backend tests still passed, confirming the new frontend test setup did not destabilize the full-stack repo.
- The `FakeAudio` approach made it possible to test playhead advancement deterministically without real media playback.

### What didn't work
- The first build attempt after adding the transport playback test failed because I imported `vi` but did not use it:
  ```text
  src/components/TransportBar/TransportBar.playback.test.tsx(6,32): error TS6133: 'vi' is declared but its value is never read.
  ```
- I removed the unused import and re-ran the tests/build successfully.

### What I learned
- JSDOM + Testing Library is sufficient for a useful first layer of interaction testing in this repo.
- The timeline click math is very sensitive to DOM geometry, so explicit `getBoundingClientRect()` stubbing is necessary for deterministic tests.
- A small `FakeAudio` class is enough to validate the playback-controller projection path (`timeupdate` → callback → visible playhead state).

### What was tricky to build

The biggest tricky point was avoiding an overly complicated test harness. It would have been easy to over-invest in a pseudo-browser media stack. Instead, I kept the tests narrow:

- Timeline test checks SVG click-to-time conversion.
- Transport playback test checks that Play plus `timeupdate` events propagate to visible state.

That keeps the tests resilient and aligned with the actual tasks they are meant to close. The only part that required careful handling was the fake `Audio` implementation, because the hook uses both direct event properties (`ontimeupdate`, `onplay`, etc.) and an explicit `addEventListener('loadedmetadata', ...)` callback.

### What warrants a second pair of eyes
- Whether the project should eventually standardize on JSDOM component tests plus a smaller number of Playwright end-to-end tests
- Whether the `FakeAudio` test double should be extracted into a reusable test helper as more playback tests are added

### What should be done in the future
- Add tests for candidate preview/export buttons now that the testing infrastructure exists
- Add tests for timeline drag behavior once the candidate edit model is fixed
- Consider a higher-level integration test around the full `JingleExtractor` widget once the transport + candidate editing semantics are more stable

### Code review instructions
- Review the new test files:
  - `jingle-extractor-ui/src/components/Timeline/Timeline.test.tsx`
  - `jingle-extractor-ui/src/components/TransportBar/TransportBar.playback.test.tsx`
- Review the package changes in:
  - `jingle-extractor-ui/package.json`
  - `jingle-extractor-ui/package-lock.json`
- Re-run:
  ```bash
  cd jingle-extractor-ui && npx vitest run --config vitest.config.ts src/components/Timeline/Timeline.test.tsx src/components/TransportBar/TransportBar.playback.test.tsx
  cd jingle-extractor-ui && npm run build
  cd /home/manuel/code/wesen/2026-04-13--jingle-extraction && python3 -m pytest -q jingle-extractor-backend/tests
  ```

### Technical details
- Files changed for this step:
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/package.json`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/package-lock.json`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/Timeline/Timeline.test.tsx`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/TransportBar/TransportBar.playback.test.tsx`
- Tasks completed in this step: 35, 36

## Step 12: Validate preview/export behavior for `orig`, `inst`, and `vox`

The last remaining task in the immediate playback/stem-support cluster was explicit validation that preview/export behavior works across all three visible stem modes: `orig`, `inst`, and `vox`. Rather than relying on the state of the long-running backend session on port 8000, I created a ticket-local validation script that builds a temporary database and temporary stem files, then exercises the export route directly inside the backend runtime.

This approach was more reliable than live-manual testing because it controls the DB state, the available files, and the candidate row all in one place.

### Prompt Context

**User prompt (verbatim):** (same as Step 7)

**Assistant interpretation:** Finish the remaining validation gap in the playback/stem-support area and record the exact commands and failures encountered along the way.

**Inferred user intent:** The user wants the task list closed with real evidence, not assumptions that the newly added `orig`/stem support “probably works.”

**Commit (code):** N/A

### What I did
- Added a ticket-local validation script at:
  - `ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/scripts/validate_export_stems.py`
- The script:
  - patches backend `DATA_DIR` to a temporary directory
  - creates a temporary SQLite DB
  - generates silent MP3 files for `orig`, `inst`, and `vox`
  - inserts a candidate row into the database
  - calls the backend export route directly for each stem
  - asserts non-empty `audio/mpeg` output for each case
- Ran:
  ```bash
  cd /home/manuel/code/wesen/2026-04-13--jingle-extraction
  .venv/bin/python ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/scripts/validate_export_stems.py
  ```
- Marked task 39 complete

### Why
- The live backend session did not have stable track state for manual verification.
- A deterministic ticket-local validation script is easier to rerun later than a hand-executed sequence of `curl` and DB assumptions.
- The validation needed to exercise the actual backend export implementation, not just frontend wiring.

### What worked
- The final validation script succeeded with:
  ```text
  orig: ok (10284 bytes)
  inst: ok (10284 bytes)
  vox: ok (10284 bytes)
  ```
- The script lives under the ticket’s `scripts/` directory, so it is preserved as repeatable evidence.

### What didn't work
- The first script attempt failed because Python could not import the backend package:
  ```text
  ModuleNotFoundError: No module named 'app'
  ```
  I fixed this by prepending `jingle-extractor-backend/` to `sys.path` inside the script.
- The second attempt failed because `.venv` did not have `httpx`, which `fastapi.testclient` requires through Starlette:
  ```text
  RuntimeError: The starlette.testclient module requires the httpx package to be installed.
  ```
  Instead of installing more packages into the runtime venv, I rewrote the script to call `app.routes.export.export_clip(...)` directly and consume the `StreamingResponse.body_iterator` asynchronously.

### What I learned
- For backend validation in this project, a direct in-process route call can be simpler and more reliable than forcing `TestClient` into an environment that is not fully provisioned for it.
- Keeping ticket-local scripts under `ttmp/.../scripts/` is useful; it turns a one-off debugging trick into a reusable validation artifact.
- The `orig`/`inst`/`vox` export path is now validated independently of the live backend’s current DB contents.

### What was tricky to build

The tricky part was not the export logic itself but the validation environment. The repo currently has two Python realities:

- system `python3`, which has `pytest` for the lightweight backend tests,
- project `.venv`, which has the heavier runtime/media packages like `pydub` but is missing some test-only dependencies like `httpx`.

That split makes ad hoc validation slightly awkward. The direct async route-call approach turned out to be the cleanest compromise because it uses the runtime environment that actually has the audio dependencies without forcing a package install just to run a temporary validation.

### What warrants a second pair of eyes
- Whether `httpx` should be installed into `.venv` so future in-venv TestClient-based validations are easier
- Whether the export validation script should eventually evolve into a real backend test once the backend test environment is unified

### What should be done in the future
- Revisit the backend Python environment split and decide whether one environment should become canonical for all tests
- Convert the stem export validation into a normal automated test if/when `.venv` and `pytest`/`httpx` are aligned

### Code review instructions
- Read the script:
  - `ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/scripts/validate_export_stems.py`
- Re-run:
  ```bash
  cd /home/manuel/code/wesen/2026-04-13--jingle-extraction
  .venv/bin/python ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/scripts/validate_export_stems.py
  ```
- Confirm the script prints successful non-empty output for `orig`, `inst`, and `vox`.

### Technical details
- File added in this step:
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/ttmp/2026/04/13/JINGLE-004--jingle-extractor-full-stack-architecture-review-and-code-quality-assessment/scripts/validate_export_stems.py`
- Task completed in this step: 39

## Step 13: Replace candidate drag re-mining with local editable candidate overlays

The next major issue after playback was the timeline drag behavior. The review had already shown that dragging a candidate handle was semantically wrong: the UI implies “edit this candidate window,” but the code was translating that gesture into a global `/api/mine` call. In this step I resolved that mismatch by choosing a local-only edit model for now and wiring the UI around that choice.

The implementation goal was to make dragging immediately update the visible candidate boundaries, visually indicate edited candidates, provide a reset path, clear stale edits when presets/config change, and make preview/export honor the edited boundaries even though no persistence API exists yet.

### Prompt Context

**User prompt (verbatim):** (same as Step 7)

**Assistant interpretation:** Continue down the backlog and fix the next high-impact behavioral seam, which is candidate editing semantics in the timeline.

**Inferred user intent:** The user wants timeline drag to behave intuitively and not secretly trigger unrelated server-side re-mining work.

**Commit (code):** 6bd9244 — "feat(timeline): make candidate drag edits local and exportable"

### What I did
- Updated `jingle-extractor-ui/src/features/analysis/analysisSlice.ts`:
  - `setConfig(...)` now clears local candidate edits
  - `applyPreset(...)` now clears local candidate edits
  - added `clearAllCandidateEdits()` for explicit bulk reset capability
- Chose **local-only candidate edits** for this phase instead of introducing a persistence API
- Rewrote `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx` to:
  - stop calling `/api/mine` on handle drag
  - dispatch `updateCandidateStart(...)` / `updateCandidateEnd(...)` instead
  - compute `visibleCandidates` as `server candidates + local edited overrides`
  - use `visibleCandidates` in Timeline, CandidateList, CandidateDetail, preview, and export
  - pass `start`/`end` overrides to `/api/export` so edited boundaries affect preview/export immediately
  - expose a reset action for the selected candidate via `clearCandidateEdit(...)`
- Updated export request models to accept optional `start`/`end` overrides:
  - frontend `ExportRequest`
  - backend `ExportRequest`
  - backend export route now uses override boundaries when provided
- Updated `jingle-extractor-ui/src/components/CandidateList/CandidateList.tsx`
  - added a visual edited marker (`✎`) in the badge area
- Updated `jingle-extractor-ui/src/components/CandidateDetail/CandidateDetail.tsx`
  - added “Local edit” context state
  - added `Reset Edit` action when a candidate has local edits
- Updated `jingle-extractor-ui/src/components/CandidateDetail/CandidateDetail.stories.tsx` to satisfy the new required `onResetEdit` prop after the component API change
- Marked tasks 41, 42, 44, 45, 46, 47, 48, and 49 complete
- Marked the persistence-API branch task as N/A because the decision in this phase was local-only editing

### Why
- Dragging a handle should edit that handle, not globally re-score the entire analysis.
- A local-only model is the right intermediate step because it fixes user semantics immediately without forcing backend API design too early.
- Preview/export must honor the visible edited boundaries or the UI becomes inconsistent again.
- Clearing edits on preset/config changes avoids stale local overrides being applied to conceptually different candidate sets.

### What worked
- Frontend build passed after the refactor.
- Vitest frontend tests still passed.
- Backend tests still passed.
- The root widget now has a clear mental model: server candidates are immutable source data; local edits are UI overlays.

### What didn't work
- The first build after changing `CandidateDetail` failed because the Storybook story was still using the old component props:
  ```text
  src/components/CandidateDetail/CandidateDetail.stories.tsx(41,8): error TS2741: Property 'onResetEdit' is missing in type '{ candidate: Candidate; stem: StemType; onPreview: () => void; onExport: () => void; }' but required in type 'CandidateDetailProps'.
  ```
  I updated the story to pass `onResetEdit={() => alert('Reset edit!')}` and then re-ran build/tests successfully.

### What I learned
- The local-overlay model solves the immediate UX problem with much less risk than adding a persistence endpoint prematurely.
- Export override parameters are a useful bridge technique: they let the visible UI remain truthful before the backend has a first-class editable-candidate concept.
- Clearing candidate edits when presets/config change is essential; otherwise local overrides outlive the server-side assumptions they were based on.

### What was tricky to build

The most subtle design choice here was deciding what “edited candidate” actually means. There are three plausible models:

1. drag immediately persists to the backend,
2. drag updates only the local UI until an explicit commit exists,
3. drag should be disallowed until a persistence API exists.

I chose option 2 because it delivers the expected interaction today while keeping the backend API surface stable. The trick then becomes making the rest of the UI consistent with that choice. That is why preview/export now send explicit `start`/`end` overrides: without that, the candidate list would show edited times while the exported clip would still come from the old server boundary.

### What warrants a second pair of eyes
- Whether the local-only model should later gain a visible “unsaved changes” banner at the panel level, not just candidate-local markers
- Whether `Reset Edit` should also exist in the list view, not only in the detail view
- Whether batch export should eventually support per-candidate edited-boundary overrides too

### What should be done in the future
- Add timeline drag tests now that the drag behavior is local and deterministic
- Consider extracting visible-candidate overlay logic into a selector/helper if the root widget grows more candidate-edit behavior
- Revisit whether local-only edits should survive track reloads or analysis refetches

### Code review instructions
- Start with the state model:
  - `jingle-extractor-ui/src/features/analysis/analysisSlice.ts`
- Then review the root orchestration:
  - `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
- Then inspect the UI surfaces:
  - `jingle-extractor-ui/src/components/CandidateList/CandidateList.tsx`
  - `jingle-extractor-ui/src/components/CandidateDetail/CandidateDetail.tsx`
- Finally inspect the export override path:
  - `jingle-extractor-ui/src/api/jingleApi.ts`
  - `jingle-extractor-backend/app/models.py`
  - `jingle-extractor-backend/app/routes/export.py`
- Re-run:
  ```bash
  cd jingle-extractor-ui && npm run build
  cd jingle-extractor-ui && npx vitest run --config vitest.config.ts
  cd /home/manuel/code/wesen/2026-04-13--jingle-extraction && python3 -m pytest -q jingle-extractor-backend/tests
  ```

### Technical details
- Files changed for this step:
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/features/analysis/analysisSlice.ts`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/CandidateList/CandidateList.tsx`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/CandidateDetail/CandidateDetail.tsx`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/components/CandidateDetail/CandidateDetail.stories.tsx`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/hooks/useAudioPlayer.ts`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/api/jingleApi.ts`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/models.py`
  - `/home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-backend/app/routes/export.py`
- Tasks completed in this step: 41, 42, 44, 45, 46, 47, 48, 49
- Task explicitly resolved as N/A by decision: 43
