"""POST /api/mine"""

import json

from fastapi import APIRouter, HTTPException

from app.database import Database
from app.models import Candidate, MineRequest
from app.services.candidate_mining import mine_candidate_rows

router = APIRouter()


@router.post("/api/mine", response_model=list[Candidate])
async def mine(request: MineRequest):
    """Re-mine candidates with different config. Uses stored data."""
    db = Database()
    track = db.get_track(request.trackId)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track not found: {request.trackId}")
    if track["status"] != "complete":
        raise HTTPException(
            status_code=400, detail=f"Track not yet analyzed (status={track['status']})"
        )

    import numpy as np

    config = request.config
    timeline_row = db.get_timeline(request.trackId)
    seg_rows = db.get_vocal_segments(request.trackId)

    beats = np.array(json.loads(timeline_row["beats_json"]))
    rms = np.array(json.loads(timeline_row["rms_json"]))
    onsets = np.array(json.loads(timeline_row["onsets_json"])) if timeline_row["onsets_json"] else np.array([])
    sr = track["sr"]
    hop = timeline_row["hop_length"]

    vocal_segments = [
        {
            "start": s["start_time"],
            "end": s["end_time"],
            "text": s["text"],
            "words": json.loads(s["words_json"]) if s["words_json"] else [],
        }
        for s in seg_rows
    ]

    candidates = mine_candidate_rows(
        config=config,
        track_duration=track["duration"],
        beats=beats,
        onsets=onsets,
        rms=rms,
        sr=sr,
        hop=hop,
        vocal_segments=vocal_segments,
    )

    result = [
        Candidate(
            id=cand["idx"],
            rank=cand["rank"],
            start=cand["start"],
            end=cand["end"],
            score=cand["score"],
            attack=cand["attack"],
            ending=cand["ending"],
            energy=cand["energy"],
            phrase_score=cand.get("phrase_score"),
            vocal_overlap=cand["vocal_overlap"],
            best=cand["best"],
            source_kind=cand.get("source_kind"),
            source_segment_id=cand.get("source_segment_id"),
            source_text=cand.get("source_text"),
            source_start=cand.get("source_start"),
            source_end=cand.get("source_end"),
        )
        for cand in candidates
    ]

    db.delete_candidates(request.trackId)
    for cand in candidates:
        db.insert_candidate(
            request.trackId,
            candidate_idx=cand["idx"],
            rank=cand["rank"],
            start=cand["start"],
            end=cand["end"],
            score=cand["score"],
            attack=cand["attack"],
            ending=cand["ending"],
            energy=cand["energy"],
            vocal_overlap=cand["vocal_overlap"],
            is_best=cand["best"],
            phrase_score=cand.get("phrase_score"),
            source_kind=cand.get("source_kind"),
            source_segment_idx=cand.get("source_segment_id"),
            source_text=cand.get("source_text"),
            source_start=cand.get("source_start"),
            source_end=cand.get("source_end"),
        )

    return result
