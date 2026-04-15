"""GET /api/analysis/{track_id}"""

import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.database import Database
from app.models import (
    AnalysisResponse,
    Candidate,
    StemWaveforms,
    Track,
    TimelineData,
    VocalSegment,
    VocalsData,
)

router = APIRouter()


@router.get("/api/analysis/{track_id}")
async def get_analysis(track_id: str):
    """Get full analysis results for a track."""
    db = Database()

    track_row = db.get_track(track_id)
    if not track_row:
        raise HTTPException(status_code=404, detail=f"Track not found: {track_id}")

    # Still processing — return status
    if track_row["status"] != "complete":
        return JSONResponse(
            status_code=202,
            content={
                "track_id": track_id,
                "status": track_row["status"],
                "error_message": track_row.get("error_message"),
            },
        )

    # Build Track
    track = Track(
        id=track_row["id"],
        duration=track_row["duration"],
        bpm=track_row["bpm"],
        language=track_row["language"],
        lang_conf=track_row["lang_conf"],
        sr=track_row["sr"],
        dr_db=track_row["dr_db"],
    )

    # Build TimelineData
    timeline_row = db.get_timeline(track_id)
    if not timeline_row:
        raise HTTPException(status_code=500, detail="Timeline data missing")
    timeline = TimelineData(
        duration=track.duration,
        beats=json.loads(timeline_row["beats_json"]),
        rms=json.loads(timeline_row["rms_json"]),
        onsets=json.loads(timeline_row["onsets_json"]) if timeline_row["onsets_json"] else None,
        waveforms=StemWaveforms(
            orig=json.loads(timeline_row["orig_rms_json"]) if timeline_row.get("orig_rms_json") else None,
            inst=json.loads(timeline_row["inst_rms_json"]) if timeline_row.get("inst_rms_json") else json.loads(timeline_row["rms_json"]),
            vox=json.loads(timeline_row["vox_rms_json"]) if timeline_row.get("vox_rms_json") else None,
        ),
    )

    # Build VocalsData
    seg_rows = db.get_vocal_segments(track_id)
    segments = []
    for s in seg_rows:
        words = json.loads(s["words_json"]) if s["words_json"] else None
        segments.append(
            VocalSegment(
                id=s["segment_idx"],
                start=s["start_time"],
                end=s["end_time"],
                text=s["text"],
                conf=s["confidence"],
                words=words,
            )
        )
    vocals = VocalsData(segments=segments)

    # Build Candidates
    cand_rows = db.get_candidates(track_id)
    candidates = [
        Candidate(
            id=c["candidate_idx"],
            rank=c["rank"],
            start=c["start_time"],
            end=c["end_time"],
            score=c["score"],
            attack=c["attack"],
            ending=c["ending"],
            energy=c["energy"],
            phrase_score=c.get("phrase_score"),
            vocal_overlap=bool(c["vocal_overlap"]),
            best=bool(c["is_best"]),
            source_kind=c.get("source_kind"),
            source_segment_id=c.get("source_segment_idx"),
            source_text=c.get("source_text"),
            source_start=c.get("source_start"),
            source_end=c.get("source_end"),
        )
        for c in cand_rows
    ]

    return AnalysisResponse(
        track=track,
        timeline=timeline,
        vocals=vocals,
        candidates=candidates,
    )
