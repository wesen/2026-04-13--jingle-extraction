"""Track catalog, library, audio, and analyze-by-id routes."""

import json
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import FileResponse

from app.config import stem_path
from app.database import Database
from app.models import (
    AddManualCandidateRequest,
    AnalysisStatus,
    AnalyzeAcceptedResponse,
    AnalyzeTrackRequest,
    Candidate,
    DeleteCandidateResponse,
    StemType,
    Track,
    TrackLibraryItem,
    TrackSourceType,
)
from app.scoring import (
    check_vocal_overlap,
    compute_attack_score,
    compute_beat_score,
    compute_ending_score,
    compute_energy_score,
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


def _to_candidate(row: dict) -> Candidate:
    return Candidate(
        id=row["candidate_idx"],
        rank=row["rank"],
        start=row["start_time"],
        end=row["end_time"],
        score=row["score"],
        attack=row["attack"],
        ending=row["ending"],
        energy=row["energy"],
        phrase_score=row.get("phrase_score"),
        vocal_overlap=bool(row["vocal_overlap"]),
        best=bool(row["is_best"]),
        source_kind=row.get("source_kind"),
        source_segment_id=row.get("source_segment_idx"),
        source_text=row.get("source_text"),
        source_start=row.get("source_start"),
        source_end=row.get("source_end"),
    )


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


@router.post("/api/tracks/{track_id}/candidates/manual", response_model=Candidate)
async def add_manual_candidate(track_id: str, request: AddManualCandidateRequest):
    db = Database()
    track = db.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track not found: {track_id}")

    timeline_row = db.get_timeline(track_id)
    if not timeline_row:
        raise HTTPException(status_code=400, detail="Timeline not available for this track")

    start = min(request.start, request.end)
    end = max(request.start, request.end)
    start = max(0.0, start)
    end = min(float(track.get("duration") or end), end)
    if end - start < 0.3:
        raise HTTPException(status_code=400, detail="Manual candidate must be at least 0.3s long")

    beats = np.array(json.loads(timeline_row["beats_json"]), dtype=float)
    rms = np.array(json.loads(timeline_row["rms_json"]), dtype=float)
    onsets = np.array(json.loads(timeline_row["onsets_json"]), dtype=float) if timeline_row.get("onsets_json") else np.array([])
    sr = int(track.get("sr") or 44100)
    hop = int(timeline_row.get("hop_length") or 512)

    vocal_segments = [
        {
            "start": s["start_time"],
            "end": s["end_time"],
        }
        for s in db.get_vocal_segments(track_id)
    ]

    attack = int(compute_attack_score(start, onsets))
    ending = int(compute_ending_score(end, onsets, beats, rms, sr, hop))
    energy = int(compute_energy_score(start, end, rms, sr, hop))
    beat = int(compute_beat_score(start, end, beats))
    score = int((attack + ending + energy + beat) / 4.0)
    overlap = check_vocal_overlap(start, end, vocal_segments)

    candidate_idx = db.next_candidate_idx(track_id)
    source_text = request.source_text or f"Manual {start:.1f}s → {end:.1f}s"
    db.insert_candidate(
        track_id,
        candidate_idx=candidate_idx,
        rank=999,
        start=start,
        end=end,
        score=score,
        attack=attack,
        ending=ending,
        energy=energy,
        vocal_overlap=overlap,
        is_best=False,
        phrase_score=None,
        source_kind="manual",
        source_segment_idx=None,
        source_text=source_text,
        source_start=start,
        source_end=end,
    )
    db.recompute_candidate_ranks(track_id)

    row = db.get_candidate(track_id, candidate_idx)
    if not row:
        raise HTTPException(status_code=500, detail="Failed to load inserted candidate")

    return _to_candidate(row)


@router.delete("/api/tracks/{track_id}/candidates/{candidate_id}", response_model=DeleteCandidateResponse)
async def delete_manual_candidate(track_id: str, candidate_id: int):
    db = Database()
    track = db.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track not found: {track_id}")

    existing = db.get_candidate(track_id, candidate_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Candidate not found: {candidate_id}")

    db.delete_candidate(track_id, candidate_id)
    db.recompute_candidate_ranks(track_id)

    return DeleteCandidateResponse(ok=True, deleted_candidate_id=candidate_id)


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
