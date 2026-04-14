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
