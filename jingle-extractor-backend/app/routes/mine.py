"""POST /api/mine"""

import json

from fastapi import APIRouter, HTTPException

from app.database import Database
from app.models import AnalysisConfig, Candidate, MineRequest

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

    from app.scoring import (
        check_vocal_overlap,
        compute_attack_score,
        compute_beat_score,
        compute_ending_score,
        compute_energy_score,
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

    # Build vocal segments for overlap check
    vocal_segments = [
        {"start": s["start_time"], "end": s["end_time"]} for s in seg_rows
    ]

    # Generate candidate windows from beats
    from app.scoring import mean_rms

    candidates = []
    durations = np.arange(config.min_dur, config.max_dur + 0.001, 0.5)
    idx = 0

    for start in beats:
        for dur in durations:
            end = float(start) + float(dur)
            if end > track["duration"]:
                continue

            attack = compute_attack_score(float(start), onsets)
            ending = compute_ending_score(end, onsets, beats, rms, sr, hop)
            energy = compute_energy_score(float(start), end, rms, sr, hop)
            beat = compute_beat_score(float(start), end, beats)

            total_weight = config.atk_w + config.end_w + config.nrg_w + config.beat_w
            overall = (
                (attack * config.atk_w + ending * config.end_w + energy * config.nrg_w + beat * config.beat_w)
                / total_weight
                if total_weight > 0
                else 0
            )

            overlap = check_vocal_overlap(float(start), end, vocal_segments)

            if config.vocal_mode == "inst" and overlap:
                continue
            if config.vocal_mode == "vocal" and not overlap:
                continue

            idx += 1
            candidates.append({
                "idx": idx,
                "start": float(start),
                "end": end,
                "score": int(overall),
                "attack": int(attack),
                "ending": int(ending),
                "energy": int(energy),
                "vocal_overlap": overlap,
            })

    candidates.sort(key=lambda c: c["score"], reverse=True)
    result = []
    for rank, cand in enumerate(candidates[: config.max_cand], start=1):
        cand["rank"] = rank
        cand["best"] = rank == 1
        result.append(
            Candidate(
                id=cand["idx"],
                rank=cand["rank"],
                start=cand["start"],
                end=cand["end"],
                score=cand["score"],
                attack=cand["attack"],
                ending=cand["ending"],
                energy=cand["energy"],
                vocal_overlap=cand["vocal_overlap"],
                best=cand["best"],
            )
        )

    # Store the new candidates
    db.delete_candidates(request.trackId)
    for cand in candidates[: config.max_cand]:
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
        )

    return result
