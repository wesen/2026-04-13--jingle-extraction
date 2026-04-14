# Tasks

## TODO


- [ ] Create project scaffold: app/ directory, config.py, database.py, models.py, run.py
- [ ] Implement Pydantic models (models.py) matching frontend api/types.ts exactly
- [ ] Implement Database wrapper (database.py) with SQLite schema and CRUD operations
- [ ] Implement GET /api/presets endpoint
- [ ] Implement GET /api/tracks endpoint
- [ ] Implement POST /api/analyze endpoint with background task scheduling
- [ ] Implement pipeline.py: wrap jingle_extractor.py functions with asyncio.to_thread + DB state management
- [ ] Implement scoring.py: subscore computation (attack, ending, energy, beat alignment)
- [ ] Implement GET /api/analysis/{track_id} endpoint
- [ ] Implement POST /api/mine endpoint (re-mining from stored data)
- [ ] Implement POST /api/export and POST /api/export/batch endpoints
- [ ] Write pytest unit tests for scoring functions
- [ ] Write pytest integration tests for all endpoints with test database
- [ ] Add Vite proxy config in jingle-extractor-ui to forward /api to FastAPI
- [ ] End-to-end test: analyze thrash_metal_01 through API, verify response matches fixture
