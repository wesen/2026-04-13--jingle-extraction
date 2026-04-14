---
Title: Jingle Extractor Backend Service — FastAPI REST API for React Frontend
Ticket: JINGLE-003
Status: active
Topics:
    - backend
    - api
    - python
    - fastapi
    - design-doc
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: jingle-extractor-ui/src/api/jingleApi.ts
      Note: RTK Query API definition — the frontend contract this backend must satisfy exactly
    - Path: jingle-extractor-ui/src/api/types.ts
      Note: TypeScript interfaces that define all JSON shapes the frontend expects
    - Path: jingle-extractor-ui/src/mocks/fixtures/thrash-metal.json
      Note: Full fixture with real pipeline output — the source of truth for response shapes
    - Path: jingle-extractor-ui/src/mocks/handlers.ts
      Note: MSW handlers showing exact URL patterns and response shapes used during development
    - Path: jingle_extractor.py
      Note: Existing Python CLI pipeline that the FastAPI server wraps — all core functions (demucs_split
    - Path: out/thrash_analysis/manifest.json
      Note: Real analysis output from the Python pipeline for testing
    - Path: requirements.txt
      Note: Python dependencies — needs FastAPI/uvicorn additions
ExternalSources: []
Summary: ""
LastUpdated: 2026-04-13T20:22:55.628150869-04:00
WhatFor: ""
WhenToUse: ""
---


# Jingle Extractor Backend Service — FastAPI REST API for React Frontend

## Overview

<!-- Provide a brief overview of the ticket, its goals, and current status -->

## Key Links

- **Related Files**: See frontmatter RelatedFiles field
- **External Sources**: See frontmatter ExternalSources field

## Status

Current status: **active**

## Topics

- backend
- api
- python
- fastapi
- design-doc

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
