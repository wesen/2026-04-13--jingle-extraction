"""Generation run routes for MiniMax-backed batch creation."""

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.database import Database
from app.models import (
    CreateGenerationRequest,
    GenerationAcceptedResponse,
    GenerationRunDetailResponse,
    GenerationRunStatus,
    GenerationRunSummary,
    TrackLibraryItem,
    TrackSourceType,
)
from app.services.generation_service import create_generation_run_record, run_generation_batch

router = APIRouter()


def _to_track_library_item(row: dict) -> TrackLibraryItem:
    return TrackLibraryItem(
        id=row["id"],
        display_name=row.get("display_name") or row["id"],
        duration=row.get("duration"),
        source_type=row.get("source_type") or TrackSourceType.IMPORTED.value,
        generation_run_id=row.get("generation_run_id"),
        variant_index=row.get("variant_index"),
        generation_status=row.get("generation_status"),
        analysis_status=row.get("analysis_status") or row.get("status"),
        prompt_snapshot=row.get("prompt_snapshot"),
        lyrics_snapshot=row.get("lyrics_snapshot"),
        instrumental_requested=(
            bool(row["instrumental_requested"])
            if row.get("instrumental_requested") is not None
            else None
        ),
        minimax_model=row.get("minimax_model"),
        decision=row.get("decision"),
    )


def _to_run_summary(row: dict) -> GenerationRunSummary:
    return GenerationRunSummary(
        id=row["id"],
        name=row["name"],
        prompt=row["prompt"],
        lyrics=row.get("lyrics"),
        model=row["model"],
        mode=row["mode"],
        countRequested=row["count_requested"],
        countCompleted=row["count_completed"],
        status=row["status"],
        createdAt=row.get("created_at"),
    )


@router.post("/api/generations", response_model=GenerationAcceptedResponse, status_code=202)
async def create_generation(request: CreateGenerationRequest, background_tasks: BackgroundTasks):
    db = Database()
    run_id = create_generation_run_record(db, request)
    background_tasks.add_task(run_generation_batch, run_id, request)
    return GenerationAcceptedResponse(
        generation_id=run_id,
        status=GenerationRunStatus.QUEUED,
        count_requested=request.count,
    )


@router.get("/api/generations", response_model=list[GenerationRunSummary])
async def list_generation_runs():
    db = Database()
    return [_to_run_summary(row) for row in db.list_generation_runs()]


@router.get("/api/generations/{generation_id}", response_model=GenerationRunDetailResponse)
async def get_generation_run(generation_id: str):
    db = Database()
    run = db.get_generation_run(generation_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Generation run not found: {generation_id}")

    tracks = [_to_track_library_item(row) for row in db.list_tracks_for_generation_run(generation_id)]
    summary = _to_run_summary(run)
    return GenerationRunDetailResponse(
        **summary.model_dump(),
        error_message=run.get("error_message"),
        tracks=tracks,
    )
