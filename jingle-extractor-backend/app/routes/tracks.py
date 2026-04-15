"""Track catalog, library, audio, and analyze-by-id routes."""

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import FileResponse

from app.config import stem_path
from app.database import Database
from app.models import (
    AnalysisStatus,
    AnalyzeAcceptedResponse,
    AnalyzeTrackRequest,
    StemType,
    Track,
    TrackLibraryItem,
    TrackSourceType,
)

router = APIRouter()


def _resolve_stem_source(track: dict, stem: str) -> Path:
    spath = stem_path(track["id"], stem)
    if spath.exists():
        return spath

    if stem == "orig":
        original_path = Path(track["original_path"])
        if original_path.exists():
            return original_path

    return spath


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


def _derived_library_status(row: dict) -> str:
    analysis_status = row.get("analysis_status") or row.get("status") or AnalysisStatus.NOT_STARTED.value
    if analysis_status == AnalysisStatus.COMPLETE.value:
        return "analyzed"
    if analysis_status != AnalysisStatus.NOT_STARTED.value:
        return analysis_status
    return row.get("generation_status") or "pending"


def _get_run_pipeline():
    from app.pipeline import run_pipeline

    return run_pipeline


@router.get("/api/tracks", response_model=list[Track])
async def list_tracks():
    """List all analyzed tracks (completed only)."""
    db = Database()
    rows = db.list_tracks()
    return [
        Track(
            id=r["id"],
            duration=r["duration"],
            bpm=r["bpm"],
            language=r["language"],
            lang_conf=r["lang_conf"],
            sr=r["sr"],
            dr_db=r["dr_db"],
        )
        for r in rows
        if (r.get("analysis_status") or r["status"]) == AnalysisStatus.COMPLETE.value
    ]


@router.get("/api/library/tracks", response_model=list[TrackLibraryItem])
async def list_library_tracks(
    source: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("newest"),
):
    db = Database()
    rows = db.list_library_tracks()

    if source and source != "all":
        rows = [row for row in rows if row.get("source_type") == source]

    if status and status != "all":
        rows = [row for row in rows if _derived_library_status(row) == status]

    if search:
        needle = search.lower()
        rows = [
            row
            for row in rows
            if needle in (row.get("display_name") or row["id"]).lower()
        ]

    if sort == "name":
        rows.sort(key=lambda row: (row.get("display_name") or row["id"]).lower())
    elif sort == "oldest":
        rows = list(reversed(rows))

    return [_to_track_library_item(row) for row in rows]


@router.post("/api/library/tracks/{track_id}/analyze", response_model=AnalyzeAcceptedResponse, status_code=202)
async def analyze_track(track_id: str, request: AnalyzeTrackRequest, background_tasks: BackgroundTasks):
    db = Database()
    track = db.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track not found: {track_id}")

    analysis_status = track.get("analysis_status") or track.get("status") or AnalysisStatus.NOT_STARTED.value
    if analysis_status == AnalysisStatus.COMPLETE.value:
        return AnalyzeAcceptedResponse(track_id=track_id, status=AnalysisStatus.COMPLETE)

    original_path = Path(track["original_path"])
    if not original_path.exists():
        raise HTTPException(status_code=404, detail=f"Audio file not found: {original_path}")

    db.update_status(track_id, AnalysisStatus.UPLOADED.value)
    background_tasks.add_task(_get_run_pipeline(), track_id, str(original_path), request.config)
    return AnalyzeAcceptedResponse(track_id=track_id, status=AnalysisStatus.UPLOADED)


@router.get("/api/tracks/{track_id}/audio/{stem}")
async def get_track_audio(track_id: str, stem: StemType):
    """Stream a full track stem for transport playback."""
    db = Database()
    track = db.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track not found: {track_id}")

    spath = _resolve_stem_source(track, stem.value)
    if not spath.exists():
        raise HTTPException(status_code=404, detail=f"Stem not found: {stem.value}")

    return FileResponse(
        spath,
        media_type="audio/mpeg",
        filename=f"{track_id}_{stem.value}.mp3",
    )
