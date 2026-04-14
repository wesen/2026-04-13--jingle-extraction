"""POST /api/analyze"""

import logging
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.database import Database
from app.models import (
    AnalysisConfig,
    AnalysisStatus,
    AnalyzeRequest,
    AnalyzeAcceptedResponse,
)
logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/analyze", response_model=AnalyzeAcceptedResponse, status_code=202)
async def analyze(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """Start the analysis pipeline for an audio file."""
    audio_path = Path(request.audio_file)
    if not audio_path.exists():
        raise HTTPException(
            status_code=404, detail=f"Audio file not found: {request.audio_file}"
        )

    track_id = audio_path.stem.replace(" ", "_")

    db = Database()
    existing = db.get_track(track_id)
    if existing and existing["status"] == AnalysisStatus.COMPLETE.value:
        return AnalyzeAcceptedResponse(
            track_id=track_id, status=AnalysisStatus.COMPLETE
        )

    db.create_track(track_id, str(audio_path), status=AnalysisStatus.UPLOADED.value)

    # Lazy import to avoid pulling in heavy ML deps at test time
    from app.pipeline import run_pipeline

    background_tasks.add_task(run_pipeline, track_id, str(audio_path), request.config)

    logger.info("Scheduled analysis for track=%s, file=%s", track_id, audio_path)
    return AnalyzeAcceptedResponse(track_id=track_id, status=AnalysisStatus.UPLOADED)
