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
LastUpdated: 2026-04-14T16:48:09.409104937-04:00
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
