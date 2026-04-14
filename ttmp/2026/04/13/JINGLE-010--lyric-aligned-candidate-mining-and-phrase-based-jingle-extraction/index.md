---
Title: Lyric-Aligned Candidate Mining and Phrase-Based Jingle Extraction
Ticket: JINGLE-010
Status: active
Topics:
    - frontend
    - backend
    - fastapi
    - react
    - architecture
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: jingle-extractor-backend/app/pipeline.py
      Note: Current pipeline stores lyric segment timing and mines initial candidates from the instrumental path
    - Path: jingle-extractor-backend/app/routes/mine.py
      Note: Current candidate mining route uses vocal timestamps only as an overlap filter
    - Path: jingle-extractor-ui/src/components/DebugPanel/DebugPanel.tsx
      Note: Debug UI for comparing lyric and jingle timestamps that informs the future design
ExternalSources: []
Summary: ""
LastUpdated: 2026-04-13T23:26:44.015538949-04:00
WhatFor: ""
WhenToUse: ""
---


# Lyric-Aligned Candidate Mining and Phrase-Based Jingle Extraction

## Overview

This ticket tracks follow-up design and implementation work for **phrase-aware, lyric-centered jingle extraction**. It exists because the current backend can filter for vocal overlap, but it does not yet build candidates directly from WhisperX phrase timing. Earlier manual extraction runs showed that lyric-aligned windows can produce much better vocal hooks than a purely beat/onset-driven miner.

The immediate purpose of this ticket is to capture the design and carve the work out into a dedicated follow-up stream rather than mixing it into the transport/remine fixes in JINGLE-004.

## Key Links

- **Primary design doc**: [design/01-lyric-aligned-candidate-mining-design-guide.md](./design/01-lyric-aligned-candidate-mining-design-guide.md)
- **Comprehensive onboarding guide**: [design/02-current-system-vs-jingle-001-port-map-and-implementation-guide.md](./design/02-current-system-vs-jingle-001-port-map-and-implementation-guide.md)
- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field

## Status

Current status: **active**

Current scope:
- document why the current miner differs from earlier lyric-friendly manual results
- define a dedicated lyric-aligned mining strategy
- plan the backend/frontend/API changes needed to support that mode cleanly

## Topics

- frontend
- backend
- fastapi
- react
- architecture

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
