---
Title: MiniMax Generation and Track Selection Workflow UX and Architecture
Ticket: JINGLE-011
Status: active
Topics:
    - frontend
    - backend
    - minimax
    - ux
    - jingle-extractor
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: ""
LastUpdated: 2026-04-14T16:47:55.044615438-04:00
WhatFor: ""
WhenToUse: ""
---

# MiniMax Generation and Track Selection Workflow UX and Architecture

## Overview

JINGLE-011 is the design/research ticket for productizing the part of the workflow that happens before extraction: generating multiple tracks with MiniMax, browsing and comparing them, selecting keepers, and handing a chosen track into the existing extractor workbench.

The ticket deliverable is a detailed intern-facing guide that maps the current CLI/backend/frontend split, explains the gap between generation and extraction, proposes a creator-friendly UI in ASCII screenshots, sketches the backend/API changes required, and lays out a phased implementation plan.

## Key Links

- Design doc: `design-doc/01-minimax-generation-and-track-selection-ux-architecture-and-implementation-guide.md`
- Diary: `reference/01-investigation-diary.md`
- Related Files: See frontmatter `RelatedFiles`
- External Sources: See frontmatter `ExternalSources`

## Status

Current status: **active**

## Topics

- frontend
- backend
- minimax
- ux
- jingle-extractor

## Tasks

See [tasks.md](./tasks.md) for the current task list.

## Changelog

See [changelog.md](./changelog.md) for recent changes and decisions.

## Structure

- design/ - Architecture and design documents
- reference/ - Prompt packs, API contracts, context summaries
- playbooks/ - Command sequences and test procedures
- scripts/ - Temporary code and tooling
- various/ - Working notes and research
- archive/ - Deprecated or reference-only artifacts
