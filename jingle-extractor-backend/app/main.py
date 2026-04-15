"""
Jingle Extractor API — FastAPI application factory.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS, DATA_DIR
from app.database import Database
from app.routes import analyze, analysis, export, generations, mine, presets, tracks


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "tracks").mkdir(exist_ok=True)
    (DATA_DIR / "exports").mkdir(exist_ok=True)
    db = Database()
    db.create_tables()
    yield


app = FastAPI(
    title="Jingle Extractor API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(analyze.router)
app.include_router(analysis.router)
app.include_router(generations.router)
app.include_router(mine.router)
app.include_router(export.router)
app.include_router(tracks.router)
app.include_router(presets.router)


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "version": "1.0.0"}
