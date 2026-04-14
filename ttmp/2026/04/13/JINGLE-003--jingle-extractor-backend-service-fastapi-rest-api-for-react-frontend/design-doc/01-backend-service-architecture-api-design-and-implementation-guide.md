---
Title: "Backend Service Architecture, API Design, and Implementation Guide"
Ticket: JINGLE-003
Status: active
Topics: [backend, api, python, fastapi, design-doc]
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
  - Path: ../../../../../../../../../home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle_extractor.py
    Note: "Existing Python CLI pipeline to be wrapped by the FastAPI service"
  - Path: ../../../../../../../../../home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/api/jingleApi.ts
    Note: "RTK Query API definition — the frontend contract this backend must satisfy"
  - Path: ../../../../../../../../../home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/api/types.ts
    Note: "TypeScript interfaces that define the JSON shapes the frontend expects"
  - Path: ../../../../../../../../../home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/mocks/handlers.ts
    Note: "MSW handlers showing exact request/response patterns the frontend uses"
  - Path: ../../../../../../../../../home/manuel/code/wesen/2026-04-13--jingle-extraction/jingle-extractor-ui/src/mocks/fixtures/thrash-metal.json
    Note: "Full fixture with real pipeline data — the truth for response shapes"
ExternalSources: []
Summary: "Complete architecture and implementation guide for a FastAPI backend that serves the Jingle Extractor React frontend. Wraps the existing Python pipeline (MiniMax, Demucs, WhisperX, librosa, pydub) behind a REST API."
LastUpdated: 2026-04-13T20:00:00Z
WhatFor: "Implement the backend service for JINGLE-003"
WhenToUse: "When building, testing, or extending the Jingle Extractor backend"
---

# Jingle Extractor Backend Service — Architecture & Implementation Guide

> **Audience**: A new team member or intern who needs to understand the full system and implement it end-to-end.
>
> **Prerequisites**: Basic Python, REST APIs, some exposure to audio processing concepts. You do **not** need to be an expert in FastAPI, Demucs, or WhisperX — this guide explains everything you need.

## Document Structure

This guide is split into seven focused sections. Read them in order for the full picture, or jump to any section for reference:

| # | Section | File | What it covers |
|---|---------|------|---------------|
| 1 | **System Overview** | [01-overview.md](01-overview.md) | Executive summary, system context, architecture diagram, data flow |
| 2 | **API Reference** | [02-api-reference.md](02-api-reference.md) | All 7 REST endpoints with request/response schemas, error codes, examples |
| 3 | **Data Models** | [03-data-models.md](03-data-models.md) | Pydantic models, SQLite schema, file storage layout, state machine |
| 4 | **Pipeline Integration** | [04-pipeline-integration.md](04-pipeline-integration.md) | How FastAPI wraps `jingle_extractor.py`, background tasks, progress |
| 5 | **Implementation Sketches** | [05-implementation-sketches.md](05-implementation-sketches.md) | Pseudocode for every endpoint handler, service layer, and worker |
| 6 | **Project Structure** | [06-project-structure.md](06-project-structure.md) | File layout, configuration, startup, testing strategy |
| 7 | **Security & Deployment** | [07-security-deployment.md](07-security-deployment.md) | Auth, CORS, rate limits, production deployment |

---

## Quick Links

- **Frontend API contract**: `jingle-extractor-ui/src/api/jingleApi.ts` — the RTK Query definition the frontend uses
- **Frontend types**: `jingle-extractor-ui/src/api/types.ts` — TypeScript interfaces for all JSON shapes
- **MSW handlers**: `jingle-extractor-ui/src/mocks/handlers.ts` — shows exact URL patterns and responses
- **Real fixture**: `jingle-extractor-ui/src/mocks/fixtures/thrash-metal.json` — real pipeline output
- **Existing CLI**: `jingle_extractor.py` — the Python pipeline this backend wraps
- **Real output**: `out/thrash_analysis/manifest.json` — actual analysis output on disk
- **Parent ticket**: JINGLE-001 (pipeline), JINGLE-002 (React UI)
