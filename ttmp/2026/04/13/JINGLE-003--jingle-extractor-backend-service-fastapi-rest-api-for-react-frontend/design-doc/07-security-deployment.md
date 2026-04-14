# Section 7: Security & Deployment

This section covers authentication, authorization, rate limiting, and production deployment considerations.

---

## 7.1 Security Model (v1: Local-Only)

For v1, the application is designed to run on a developer's local machine. Both the frontend and backend are accessed via `localhost`. There is **no authentication** and **no encryption**.

**What this means**:
- Anyone with access to `localhost:8000` can trigger analysis, access all tracks, and export clips.
- The MiniMax API key is stored in `.envrc` and loaded into the server process environment.
- Audio files on disk are accessible to any process on the machine.

**This is acceptable for a local development tool.** If you deploy this to a server, you must add the security measures below.

---

## 7.2 Authentication (v2: API Key)

For multi-user or server deployment, add API key authentication:

```python
# app/auth.py

from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
import os

API_KEY = os.getenv("JINGLE_API_KEY", "")

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(key: str = Security(api_key_header)):
    """Dependency that validates the API key."""
    if not API_KEY:
        return  # no key configured = auth disabled
    if key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return key

# Usage in routes:
@router.post("/api/analyze", dependencies=[Depends(verify_api_key)])
async def analyze(...):
    ...
```

The frontend would add the API key to RTK Query's `prepareHeaders`:

```typescript
// jingle-extractor-ui/src/api/jingleApi.ts
baseQuery: fetchBaseQuery({
  baseUrl: '/api/',
  prepareHeaders: (headers) => {
    const key = import.meta.env.VITE_API_KEY;
    if (key) headers.set('X-API-Key', key);
    return headers;
  },
}),
```

---

## 7.3 CORS Policy

CORS is configured in `app/main.py`. For local development, allow all localhost origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:6006",   # Storybook
        "http://localhost:3000",   # Alternative dev port
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)
```

For production, change `allow_origins` to the actual domain.

---

## 7.4 Rate Limiting

The pipeline is expensive (Demucs uses 2-8 GB RAM, WhisperX uses 4-10 GB). Without rate limiting, a user could:
- Submit 10 analysis requests simultaneously → OOM crash
- Request batch export of 100 clips → disk exhaustion

**v1 mitigation**: The `asyncio.Lock` in the pipeline ensures only one analysis runs at a time. Additional requests are queued (they wait for the lock).

**v2**: Add proper rate limiting with `slowapi`:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/analyze")
@limiter.limit("5/hour")  # max 5 analysis requests per hour per IP
async def analyze(request: Request, ...):
    ...
```

---

## 7.5 Input Validation

FastAPI + Pydantic handle most input validation automatically. Additional checks:

```python
# File path traversal prevention
import os

def safe_track_id(track_id: str) -> str:
    """Ensure track_id doesn't contain path traversal characters."""
    clean = track_id.replace("/", "_").replace("\\", "_").replace("..", "_")
    if clean != track_id:
        raise HTTPException(status_code=400, detail="Invalid track ID")
    return clean

# File size limits (for uploads in v2)
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB

# Audio file validation
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac", ".ogg", ".m4a"}
```

---

## 7.6 Production Deployment

### Docker

```dockerfile
# Dockerfile

FROM python:3.11-slim

# Install system dependencies (ffmpeg for pydub, build tools for numpy)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ app/
COPY run.py .
COPY jingle_extractor.py .

# Create data directory
RUN mkdir -p /data/tracks

ENV DATA_DIR=/data
ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

CMD ["python", "run.py"]
```

```bash
# Build and run
docker build -t jingle-extractor .
docker run -p 8000:8000 \
  -v $(pwd)/data:/data \
  -e MINIMAX_API_KEY=... \
  jingle-extractor
```

### GPU Support (for faster Demucs/WhisperX)

```dockerfile
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# Install Python + ffmpeg
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg
...
```

Run with: `docker run --gpus all -p 8000:8000 ...`

### Process Manager

For non-Docker deployment, use `systemd` or `supervisor`:

```ini
# /etc/systemd/system/jingle-extractor.service

[Unit]
Description=Jingle Extractor API
After=network.target

[Service]
Type=simple
User=jingle
WorkingDirectory=/opt/jingle-extractor
EnvironmentFile=/opt/jingle-extractor/.env
ExecStart=/opt/jingle-extractor/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Important**: Use `--workers 1` because the background task pipeline is not multi-process safe (SQLite write lock + GPU contention).

---

## 7.7 Logging

Configure structured logging for production:

```python
# app/main.py

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# Reduce noise from libraries
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
```

Pipeline progress is logged at INFO level:

```
2026-04-13 14:30:22 INFO app.pipeline [thrash_metal_01] Starting Demucs stem separation...
2026-04-13 14:33:45 INFO app.pipeline [thrash_metal_01] Demucs complete. Starting WhisperX transcription...
2026-04-13 14:48:12 INFO app.pipeline [thrash_metal_01] Transcription complete. Analyzing rhythm...
2026-04-13 14:48:15 INFO app.pipeline [thrash_metal_01] Mining candidates...
2026-04-13 14:48:22 INFO app.pipeline [thrash_metal_01] Pipeline complete. 5 candidates.
```

---

## 7.8 Health Check Endpoint

Add a simple health check for monitoring:

```python
@router.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "pipeline_lock": "busy" if pipeline_lock.locked() else "idle",
    }
```

---

## 7.9 Checklist: Before Deploying to a Server

- [ ] Set `MINIMAX_API_KEY` via environment variable (never commit)
- [ ] Enable CORS only for your domain
- [ ] Add API key authentication (`JINGLE_API_KEY` env var)
- [ ] Set `DATA_DIR` to a persistent volume
- [ ] Configure `DEMUCS_MODEL` and `WHISPERX_DEVICE` for your hardware
- [ ] Set `LOG_LEVEL=WARNING` to reduce log volume
- [ ] Add rate limiting (`slowapi`)
- [ ] Use HTTPS (via nginx reverse proxy or Cloudflare)
- [ ] Set up automated backups for `data/jingle_extractor.db`
- [ ] Monitor disk usage (audio files accumulate)
