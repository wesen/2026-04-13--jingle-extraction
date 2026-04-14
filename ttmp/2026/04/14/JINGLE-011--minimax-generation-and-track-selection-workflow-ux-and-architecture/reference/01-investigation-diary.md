---
Title: Investigation diary
Ticket: JINGLE-011
Status: active
Topics:
    - frontend
    - backend
    - minimax
    - ux
    - jingle-extractor
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: jingle-extractor-backend/app/main.py
      Note: Investigated active FastAPI routers and confirmed no generation router exists yet
    - Path: jingle-extractor-ui/src/App.tsx
      Note: Investigated current one-view app shell
    - Path: jingle-extractor-ui/src/api/jingleApi.ts
      Note: Investigated current API surface and unused track-list hook
    - Path: jingle_extractor.py
      Note: Investigated to confirm MiniMax generation already exists in the CLI
    - Path: out/vocal_jingles/README.md
      Note: Investigated creator-oriented output framing for UX guidance
ExternalSources: []
Summary: Chronological research diary for the MiniMax generation and track selection design ticket.
LastUpdated: 2026-04-14T23:06:00-04:00
WhatFor: Capture the investigation process, evidence collection, and delivery steps for JINGLE-011.
WhenToUse: Use when reviewing how the design was assembled or continuing the research/implementation stream later.
---


# Diary

## Goal

Capture the research and design work for productizing MiniMax generation and track selection in the jingle extractor application, including evidence gathering, architecture conclusions, documentation, and delivery.

## Step 1: Investigate the current generation-to-extraction gap and write the design ticket deliverables

I approached this as a product-gap investigation rather than a code-first implementation. The most important question was not “how do we add another route?” but “what step in the operator workflow is currently missing?” After reviewing the code and existing artifacts, the answer became clear: generation exists in the CLI, and extraction exists in the app, but the workflow for choosing among generated tracks does not yet exist as a product surface.

That framing shaped the whole document set. Instead of proposing a narrow “add generate button” change, I wrote the ticket around a studio workflow: generate multiple tracks, preview them, compare them, mark keepers, and then hand a selected track into the existing extractor. That better matches how someone actually creates jingles.

### Prompt Context

**User prompt (verbatim):** "Ok, let's actually tackle making the minimax generation part work, and selecting amongst tracks. 

Creat a ne wdocmgr ticket and analyze and design a UI for this, in ASCII screenshots and following the affordances of someone who creates jingles. 

Create a detailed analysis / design / implementation guide that is very detailed for a new intern, explaining all the parts of the system needed to understand what it is, with prose paragraphs and bullet point sand pseudocode and diagrams and api references and file
  references.
  It should be very clear and detailed. Store in the ticket and the nupload to remarkable."

**Assistant interpretation:** Create a new ticket focused on MiniMax generation and track-selection UX, gather evidence from the current codebase, then write a very detailed intern-facing design guide with ASCII mockups and implementation guidance, and upload the resulting bundle to reMarkable.

**Inferred user intent:** Turn the current single-track extraction app into a fuller studio workflow that supports real creative iteration before extraction.

### What I did
- Created `JINGLE-011` via `docmgr ticket create-ticket`
- Added:
  - `design-doc/01-minimax-generation-and-track-selection-ux-architecture-and-implementation-guide.md`
  - `reference/01-investigation-diary.md`
- Inspected the key code paths and artifacts that define current behavior:
  - `jingle_extractor.py`
  - `jingle-extractor-backend/app/main.py`
  - `jingle-extractor-backend/app/routes/analyze.py`
  - `jingle-extractor-backend/app/routes/tracks.py`
  - `jingle-extractor-backend/app/database.py`
  - `jingle-extractor-backend/app/pipeline.py`
  - `jingle-extractor-ui/src/App.tsx`
  - `jingle-extractor-ui/src/api/jingleApi.ts`
  - `jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx`
  - `jingle-extractor-ui/src/components/MenuBar/MenuBar.tsx`
  - `jingle-extractor-ui/src/features/analysis/analysisSlice.ts`
  - the original prototype and the older vocal-jingle README
- Wrote a detailed design doc covering:
  - system primer
  - current-state analysis
  - gap analysis
  - operator workflow
  - proposed UI with ASCII screenshots
  - backend/frontend architecture changes
  - API sketches
  - pseudocode
  - phased implementation plan
  - testing strategy
  - risks and alternatives

### Why
- The current product boundary is wrong for real use: it starts at analysis instead of starting at generation and selection.
- A new intern would struggle if we only said “wire MiniMax into FastAPI.” They need a full mental model of:
  - what already exists,
  - which pieces are reusable,
  - which concepts are missing,
  - and why the UX should be built around a creator’s workflow rather than around backend convenience.

### What worked
- The repo already had enough evidence to support a strong design without guesswork.
- The CLI and backend/frontend split made the architectural gap easy to explain.
- The older operator-facing artifact (`out/vocal_jingles/README.md`) was especially useful for grounding the UX in creator language rather than engineering abstractions.

### What didn't work
- A broad `rg` search initially walked into generated Storybook assets and produced noisy output. I reran the search with `--glob '!jingle-extractor-ui/storybook-static/**'` and `--glob '!jingle-extractor-ui/dist/**'` to keep the evidence set focused.
- While checking environment references, the shell output exposed the existence of a local MiniMax secret in `.envrc`. I did not copy that value into ticket docs and treated it as sensitive. Future investigations should prefer presence checks rather than printing secret-bearing lines directly.
- I also hit the exact shell-safety problem described by the `docmgr` skill: using unquoted backticks inside a `docmgr changelog update` shell command triggered command substitution and printed `/bin/bash: line 1: minimax: command not found` and `/bin/bash: line 1: ux: command not found`. I fixed the resulting malformed changelog entry by editing the markdown directly and avoiding raw backticks in subsequent shell text.

### What I learned
- The current product already has almost all extraction primitives needed after track selection.
- The missing product concept is not “audio” or “analysis”; it is **track catalog + generation run + selection workflow**.
- The cleanest path forward is to wrap the existing extractor in a studio shell instead of bloating `JingleExtractor` itself.

### What was tricky to build
- The tricky part was choosing the right level of abstraction. It would have been easy to recommend a shallow fix like “add a generate button and a track dropdown,” but that would not really solve the operator workflow.
- The better design required separating:
  - generation runs,
  - track library assets,
  - and the extractor workbench.
- Another subtle point was the current `POST /api/analyze` contract. Because it accepts a server-local file path, it is okay for development, but it is the wrong primary contract once generation becomes a first-class backend feature.

### What warrants a second pair of eyes
- Whether the library should reuse `/api/tracks` or add a clearer `/api/library/tracks` namespace.
- Whether generation should be strictly sequential in v1 or allow low-concurrency parallel requests.
- Whether compare mode belongs in the first implementation slice or should wait until the basic generate → preview → analyze loop is stable.

### What should be done in the future
- Implement the next feature ticket for JINGLE-011 in phases:
  1. backend generation routes and persistence,
  2. track library endpoint,
  3. track-centric analyze route,
  4. frontend studio shell,
  5. minimal generate + preview + extract handoff,
  6. compare mode later if needed.

### Code review instructions
- Start with the design doc:
  - `ttmp/2026/04/14/JINGLE-011--minimax-generation-and-track-selection-workflow-ux-and-architecture/design-doc/01-minimax-generation-and-track-selection-ux-architecture-and-implementation-guide.md`
- Then inspect the key current-state files referenced in the “File-by-file reference map” section.
- Confirm that the main thesis is evidence-backed:
  - generation exists in `jingle_extractor.py`
  - FastAPI does not expose it yet
  - the frontend is still a single-track extractor shell
  - `/api/tracks` is not yet a true library/catalog endpoint

### Technical details

Commands used during investigation:

```bash
cd /home/manuel/code/wesen/2026-04-13--jingle-extraction

docmgr status --summary-only
docmgr ticket create-ticket --ticket JINGLE-011 --title "MiniMax Generation and Track Selection Workflow UX and Architecture" --topics frontend,backend,minimax,ux,jingle-extractor
docmgr doc add --ticket JINGLE-011 --doc-type design-doc --title "MiniMax Generation and Track Selection UX Architecture and Implementation Guide"
docmgr doc add --ticket JINGLE-011 --doc-type reference --title "Investigation diary"

rg -n --glob '!jingle-extractor-ui/storybook-static/**' --glob '!jingle-extractor-ui/dist/**' "MiniMax|minimax|generate\(|trackId|selectedTrack|listTracks|/api/analyze" jingle_extractor.py jingle-extractor-backend jingle-extractor-ui -S

nl -ba jingle_extractor.py | sed -n '1,180p'
nl -ba jingle_extractor.py | sed -n '420,660p'
nl -ba jingle-extractor-backend/app/main.py | sed -n '1,220p'
nl -ba jingle-extractor-backend/app/routes/analyze.py | sed -n '1,220p'
nl -ba jingle-extractor-backend/app/routes/tracks.py | sed -n '1,220p'
nl -ba jingle-extractor-backend/app/database.py | sed -n '1,260p'
nl -ba jingle-extractor-backend/app/pipeline.py | sed -n '1,280p'
nl -ba jingle-extractor-ui/src/App.tsx | sed -n '1,160p'
nl -ba jingle-extractor-ui/src/api/jingleApi.ts | sed -n '1,220p'
nl -ba jingle-extractor-ui/src/components/JingleExtractor/JingleExtractor.tsx | sed -n '1,420p'
nl -ba jingle-extractor-ui/src/features/analysis/analysisSlice.ts | sed -n '1,260p'
nl -ba out/vocal_jingles/README.md | sed -n '1,220p'
```

## Step 2: Simplify the UX to one studio screen and add a widget inventory for design handoff

After the first draft, the user clarified that the UX should be simpler: one main screen for generation, current-run results, and the library, with a later switch into the existing jingle-mining screen only when needed. That changed the document from a multi-view studio shell proposal into a tighter two-screen model: one **Studio** screen plus the existing **Mining** screen.

I updated the design doc accordingly and added a concise YAML DSL plus a full inventory of the existing React widgets and their props. That way the UX designer gets both a conceptual layout and a concrete list of components that already exist in the design system.

### Prompt Context

**User prompt (verbatim):** "Ok, we only want a single UX screen, we don't want to overcomplicate it. Also make a concise YAML DSL representation of the react widgets you would use as a concise representation of the markup. We don't need to compare, just a view of the library, of the current run and results, and the possibility to analyze them and then switch to the jingle mining screen. 

You can use new widgets if they don't exist yet in the YAML, but reuse if possible, that way we can leverage our sdesign system and hand it off to the UX designer. Update and reupload to remarkable."

**Assistant interpretation:** Simplify the proposed IA to a single studio screen, remove compare mode, represent the UI in a concise widget YAML, and update the ticket deliverables for UX/design handoff.

**Inferred user intent:** Keep the product approachable and give the UX designer a practical, component-aware handoff rather than a broad architecture-only proposal.

### What I did
- Reworked the design doc from a three-workspace proposal into:
  - one main `Studio` screen,
  - one existing `Mining` screen for the handoff target
- Removed compare-mode emphasis from the proposed UI and phased plan
- Added a concise YAML DSL representation of the intended studio-screen widget tree
- Added a full inventory of the existing React widgets with their props, including:
  - `MacWindow`
  - `MenuBar`
  - `PresetPanel`
  - `ConfigEditor`
  - `TransportBar`
  - `Timeline`
  - `CandidateList`
  - `CandidateDetail`
  - `ScoreBar`
  - `DebugPanel`
  - `JingleExtractor`
- Updated the ticket docs and prepared them for re-upload to reMarkable

### Why
- The simplified one-screen studio concept is a better fit for the stated product direction
- The YAML DSL makes the proposed layout easier to discuss with a designer
- The widget inventory reduces handoff ambiguity and increases the chance of reusing the existing system instead of designing from scratch

### What worked
- The current component library is already rich enough to provide meaningful reuse guidance
- `MacWindow` and `MenuBar` remain especially useful anchors for the visual system
- `CandidateDetail` turned out to be a strong precedent for the future `TrackInspector` concept

### What didn't work
- N/A beyond the earlier course correction that the initial design had become too multi-screen and too heavy on compare mode

### What I learned
- The user wanted stronger design-handoff material, not just architecture prose
- A widget inventory with real props is much more actionable for UX/design collaboration than just naming conceptual components

### What was tricky to build
- The tricky part was keeping the design doc internally consistent after simplifying the IA. Several sections referenced compare mode or separate library views, so the update required touching not just the mockups but also the pseudocode, implementation phases, and validation framing.

### What warrants a second pair of eyes
- Whether `MenuBar` should be adapted directly for the studio screen or wrapped by a studio-specific header component
- Whether the future `TrackResultsList` and `TrackLibraryList` should be separate widgets or one generalized list component with mode-specific columns

### What should be done in the future
- Implement the studio screen using the new widget inventory as the reuse baseline
- Keep the design system handoff artifact updated as new reusable widgets are added

### Code review instructions
- Re-read the following sections in the design doc:
  - `Proposed solution overview`
  - `Proposed UI design`
  - `Concise YAML DSL for the studio screen`
  - `Existing widget inventory available today`
- Verify that compare-mode references were removed from the core direction and that the simplified IA is coherent

### Technical details

Key source files inspected for widget inventory:

```bash
find jingle-extractor-ui/src/components -maxdepth 2 -name '*.tsx' | sort
rg -n "interface .*Props|export function|type .*Props" jingle-extractor-ui/src/components -g '*.tsx'
```

## Step 3: Take over primitive extraction, fix visual regressions, and restore parity with legacy widgets

After the first extraction pass, the new primitives technically compiled but visually drifted from the baseline UI language. The user correctly called out that the DataList looked worse than the old CandidateList. I paused feature expansion and treated this as a consistency/quality recovery step: get the extracted primitives visually coherent first, then continue with new feature surfaces.

The most important correction was architectural, not cosmetic: shared primitive CSS had been unscoped to make Storybook stories render, but that broke consistency with the existing styling model (`[data-widget='jingle-extractor'] [data-part='...']`). I restored the original scoping model and fixed Storybook rendering the right way by wrapping stories with a widget-root decorator.

### Prompt Context

**User prompt (verbatim):** "Ok, we're tkaing over for your small brother who si kind of making a mess of the CSS and widgets as they were extracting primitives. Go over their work and address the inconsistencies compared to where we started, and suggest improvements."

**Assistant interpretation:** Audit the primitive extraction changes, identify where visuals/architecture drifted from the baseline widget system, fix those inconsistencies, and provide a concrete improvement plan.

**Inferred user intent:** Preserve the original polished visual language while still moving toward reusable primitives, avoiding regressions masked as refactors.

**Commit (code):** f28e73d — "fix(ui): restore primitive style consistency and DataList parity"

### What I did
- Audited extraction commits and uncommitted changes:
  - `2907fdf` (shared parts + shared css)
  - `75fcdad` (SegmentedControl)
  - uncommitted DataList work + CSS overrides
- Identified root causes of visual regressions:
  1. **DataList action buttons wrapping to a second row** because row actions were rendered as an extra grid cell without allocating an extra grid column.
  2. **Storybook style mismatch** caused by unscoped shared CSS selectors (global `[data-part=...]`) diverging from baseline scoped selectors.
  3. **Primitive stories not mounted under widget root**, so scoped styles did not apply in isolation.
- Implemented fixes:
  - Added explicit action-column support to `DataList` (`actionColumnWidth` + auto width fallback)
  - Restored shared CSS scoping to `[data-widget='jingle-extractor']` in:
    - `shared/button.css`
    - `shared/segmented-control.css`
    - `shared/panel.css`
  - Updated `DataList.css` to match legacy row density and action-button behavior
  - Added Storybook decorators to primitive stories so they render inside:
    - `data-widget='jingle-extractor'`
    - `data-je-theme='retro'`
  - Added a dedicated `DataList` parity story:
    - `CandidateList parity (legacy look)`
- Validated by rebuilding UI:
  - `cd jingle-extractor-ui && npm run build`

### Why
- Visual regressions in primitive extraction are risky: they undermine trust in the design system and make downstream feature work (studio screen) harder to review.
- The extraction goal is reuse **without** changing the visual contract users already validated.
- Keeping scoped selectors and adding story decorators is the lowest-risk way to preserve baseline behavior and still have isolated primitive docs.

### What worked
- Converting DataList action column from implicit overflow to explicit grid column fixed the largest visual break immediately.
- Adding a parity story made “looks like baseline?” objectively reviewable instead of subjective.
- Restoring scoped CSS brought primitive behavior back in line with the existing component architecture.

### What didn't work
- Initial attempt to fix Storybook by unscoping shared CSS globally produced style drift and inconsistencies.
- Storybook error around `SegmentedControl` first looked like provider/config issues, but the actual root cause was a missing stylesheet import path during iterative edits.
- Multiple commands were initially run from the repo root instead of `jingle-extractor-ui`, causing `npm run build`/script confusion until corrected.

### What I learned
- For this codebase, **widget-root scoping is a core styling invariant**, not optional.
- Primitive stories should emulate runtime context with decorators rather than forcing global CSS behavior.
- “Parity stories” are essential when replacing legacy widgets with primitives.

### What was tricky to build
- The trickiest part was balancing two competing goals:
  1. Storybook isolation convenience
  2. strict compatibility with baseline scoped styling
- Unscoping CSS fixed one problem (stories) while causing another (drift). The stable solution was to keep scoping and introduce decorators in stories.
- Another subtle issue: DataList action UI looked broken not because icon styles were wrong, but because the grid template omitted the action column, causing wrap artifacts that looked like glyph/render bugs.

### What warrants a second pair of eyes
- Whether `DataList` should own action column width calculation or require explicit `actionColumnWidth` always.
- Whether icon-button visuals should be unified under a single primitive (`btn-icon`) or allow per-list overrides for parity.
- Whether scoped shared primitives should live only under `shared/` or be split into “strict baseline” vs “studio-next” variants.

### What should be done in the future
- Migrate one existing widget (`CandidateList`) to `DataList` behind a parity check story before broader adoption.
- Add visual regression snapshots for parity stories.
- Introduce a tiny `WidgetStoryDecorator` helper so all future primitive stories get consistent widget+theme wrapping.

### Code review instructions
- Start with these files:
  - `jingle-extractor-ui/src/components/DataList/DataList.tsx`
  - `jingle-extractor-ui/src/components/DataList/DataList.css`
  - `jingle-extractor-ui/src/components/DataList/DataList.stories.tsx`
  - `jingle-extractor-ui/src/components/shared/button.css`
  - `jingle-extractor-ui/src/components/shared/segmented-control.css`
  - `jingle-extractor-ui/src/components/shared/panel.css`
  - `jingle-extractor-ui/src/components/SegmentedControl/SegmentedControl.stories.tsx`
- Validate with:
  - `cd jingle-extractor-ui && npm run build`
  - open Storybook and compare:
    - `CandidateList` legacy stories
    - `DataList` parity story
- Confirm there is no action-button row wrap and selected-row contrast still matches baseline.

### Technical details

Commands used in this cleanup step:

```bash
cd /home/manuel/code/wesen/2026-04-13--jingle-extraction

git status --short
git log --oneline -n 12

cd jingle-extractor-ui
npm run build

# Visual validation stories
# /iframe.html?id=jingleextractor-datalist--track-list
# /iframe.html?id=jingleextractor-datalist--candidate-list-parity
# /iframe.html?id=jingleextractor-candidatelist--none-selected
```

## Step 4: Continue extraction by integrating SegmentedControl into existing widgets without visual drift

After stabilizing DataList and restoring parity baselines, I moved to the next safe extraction target: segmented toggles. Instead of replacing styles wholesale, I integrated the primitive into already-shipped widgets using compatibility `data-part` overrides. This preserves runtime visuals, existing CSS selectors, and test assumptions while reducing duplicate toggle markup.

This step intentionally avoided any “new look.” The goal was structural reuse only. I verified parity via targeted Storybook captures and existing unit tests before committing.

### Prompt Context

**User prompt (verbatim):** "alright, let's continue."

**Assistant interpretation:** Proceed with the next extraction slice while keeping quality high and avoiding regressions.

**Inferred user intent:** Keep momentum after cleanup, but only with disciplined, low-risk refactors.

**Commit (code):** 427bbd0 — "refactor(ui): adopt SegmentedControl in TransportBar and ConfigEditor"

### What I did
- Extended `SegmentedControl` with compatibility props:
  - `rootPart?: string`
  - `buttonPart?: string`
- Refactored `TransportBar` to use `SegmentedControl` for stem toggle while preserving legacy parts:
  - `rootPart={PARTS.stemToggle}`
  - `buttonPart={PARTS.stemButton}`
- Refactored `ConfigEditor` strategy toggle to use `SegmentedControl` similarly:
  - `rootPart={PARTS.configStrategyRow}`
  - `buttonPart={PARTS.configStrategyButton}`
- Validated:
  - `npm run build`
  - `npx vitest run src/components/TransportBar/TransportBar.playback.test.tsx src/components/ConfigEditor/ConfigEditor.strategy.test.tsx`
  - Storybook visual checks for `TransportBar` and `ConfigEditor`

### Why
- These two widgets contained duplicated segmented-toggle logic and were ideal low-risk extraction points.
- Compatibility `data-part` overrides let us reuse behavior without changing visual contracts.
- This gives immediate design-system reuse value with minimal blast radius.

### What worked
- Existing tests passed without updates, confirming behavior parity.
- Storybook views showed unchanged appearance for both widgets.
- The primitive now supports incremental migration paths for other toggles.

### What didn't work
- One Storybook screenshot was captured while the iframe was still loading (spinner only). Re-capturing after a one-second wait and snapshot check resolved it.
- There was repeated shell friction from running npm commands in the repo root instead of `jingle-extractor-ui`; corrected by explicit `cd` before each build/test call.

### What I learned
- Compatibility `data-part` mapping is the safest extraction strategy in this codebase.
- Extraction succeeds fastest when we separate “structural reuse” from “visual redesign.”

### What was tricky to build
- The tricky part was preserving strict styling contracts while introducing a generic primitive. Without `rootPart/buttonPart` overrides, we would have had to modify CSS selectors and risk broad regressions.
- Another subtle constraint: stories and tests rely on stable aria/data-part behavior, so the primitive needed to preserve these semantics.

### What warrants a second pair of eyes
- Whether compatibility props on primitives should stay long-term or be phased out after full migration.
- Whether to add a lint/custom rule that encourages primitive reuse for segmented toggles going forward.

### What should be done in the future
- Next migration slice: replace `CandidateList` internals with `DataList` behind parity stories.
- Add visual snapshot assertions for parity stories in CI.
- Introduce a shared Storybook widget decorator helper to avoid repeated wrapper boilerplate.

### Code review instructions
- Review these files first:
  - `jingle-extractor-ui/src/components/SegmentedControl/SegmentedControl.tsx`
  - `jingle-extractor-ui/src/components/TransportBar/TransportBar.tsx`
  - `jingle-extractor-ui/src/components/ConfigEditor/ConfigEditor.tsx`
- Validate behavior:
  - click stem toggles in `TransportBar` stories
  - click strategy toggles in `ConfigEditor` stories
  - ensure active/inactive visual states still match baseline

### Technical details

```bash
cd /home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui
npm run build
npx vitest run src/components/TransportBar/TransportBar.playback.test.tsx src/components/ConfigEditor/ConfigEditor.strategy.test.tsx

# Storybook parity checks
# /iframe.html?id=jingleextractor-transportbar--stopped-inst
# /iframe.html?id=jingleextractor-configeditor--default-config
```


