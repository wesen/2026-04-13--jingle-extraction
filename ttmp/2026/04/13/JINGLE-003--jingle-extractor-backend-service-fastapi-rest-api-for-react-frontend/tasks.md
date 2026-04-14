# Tasks

## TODO


- [x] Create project scaffold: app/ directory, config.py, database.py, models.py, run.py
- [x] Implement Pydantic models (models.py) matching frontend api/types.ts exactly
- [x] Implement Database wrapper (database.py) with SQLite schema and CRUD operations
- [x] Implement GET /api/presets endpoint
- [x] Implement GET /api/tracks endpoint
- [x] Implement POST /api/analyze endpoint with background task scheduling
- [x] Implement pipeline.py: wrap jingle_extractor.py functions with asyncio.to_thread + DB state management
- [x] Implement scoring.py: subscore computation (attack, ending, energy, beat alignment)
- [x] Implement GET /api/analysis/{track_id} endpoint
- [x] Implement POST /api/mine endpoint (re-mining from stored data)
- [x] Implement POST /api/export and POST /api/export/batch endpoints
- [ ] Write pytest unit tests for scoring functions
- [ ] Write pytest integration tests for all endpoints with test database
- [x] Add Vite proxy config in jingle-extractor-ui to forward /api to FastAPI
- [x] End-to-end test: analyze thrash_metal_01 through API, verify response matches fixture
