"""Candidate mining helpers shared by the pipeline and re-mine route.

This module keeps candidate construction policy in one place so we can support
both the legacy rhythmic miner and the new lyric-aligned miner without
duplicating logic across `app/pipeline.py` and `app/routes/mine.py`.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from app.models import AnalysisConfig, CandidateMode
from app.scoring import (
    check_vocal_overlap,
    compute_attack_score,
    compute_beat_score,
    compute_ending_score,
    compute_energy_score,
)


RawCandidate = dict[str, float | int | bool]


def _build_rhythmic_windows(
    track_duration: float,
    beats: np.ndarray,
    min_dur: float,
    max_dur: float,
) -> list[dict[str, float | int]]:
    durations = np.arange(min_dur, max_dur + 0.001, 0.5)
    windows: list[dict[str, float | int]] = []
    idx = 0

    for start in beats:
        for dur in durations:
            end = float(start) + float(dur)
            if end > track_duration:
                continue
            idx += 1
            windows.append({
                "idx": idx,
                "start": float(start),
                "end": end,
            })

    return windows


def _build_lyric_aligned_windows(
    track_duration: float,
    vocal_segments: list[dict[str, Any]],
    config: AnalysisConfig,
) -> list[dict[str, float | int]]:
    windows: list[dict[str, float | int]] = []

    for idx, segment in enumerate(vocal_segments, start=1):
        seg_start = float(segment.get("start", segment.get("start_time", 0.0)))
        seg_end = float(segment.get("end", segment.get("end_time", seg_start)))

        start = max(0.0, seg_start - config.lyric_padding_before)
        end = min(track_duration, seg_end + config.lyric_padding_after)

        current_duration = end - start
        if current_duration < config.min_dur:
            deficit = config.min_dur - current_duration
            start = max(0.0, start - deficit / 2.0)
            end = min(track_duration, end + deficit / 2.0)

            # If we hit one boundary, extend from the other side as much as possible.
            current_duration = end - start
            if current_duration < config.min_dur:
                remaining = config.min_dur - current_duration
                if start <= 0.0:
                    end = min(track_duration, end + remaining)
                elif end >= track_duration:
                    start = max(0.0, start - remaining)

        duration = end - start
        if duration < config.min_dur or duration > config.max_dur:
            continue

        windows.append({
            "idx": idx,
            "start": start,
            "end": end,
        })

    return windows


def _score_window(
    window: dict[str, float | int],
    config: AnalysisConfig,
    beats: np.ndarray,
    onsets: np.ndarray,
    rms: np.ndarray,
    sr: int,
    hop: int,
    vocal_segments: list[dict[str, Any]],
) -> RawCandidate | None:
    start = float(window["start"])
    end = float(window["end"])

    attack = compute_attack_score(start, onsets)
    ending = compute_ending_score(end, onsets, beats, rms, sr, hop)
    energy = compute_energy_score(start, end, rms, sr, hop)
    beat = compute_beat_score(start, end, beats)

    total_weight = config.atk_w + config.end_w + config.nrg_w + config.beat_w
    overall = (
        (attack * config.atk_w + ending * config.end_w + energy * config.nrg_w + beat * config.beat_w)
        / total_weight
        if total_weight > 0
        else 0
    )

    overlap = check_vocal_overlap(start, end, vocal_segments)

    if overall < config.min_score:
        return None
    if config.vocal_mode == "inst" and overlap:
        return None
    if config.vocal_mode == "vocal" and not overlap:
        return None

    return {
        "idx": int(window["idx"]),
        "start": start,
        "end": end,
        "score": int(overall),
        "attack": int(attack),
        "ending": int(ending),
        "energy": int(energy),
        "vocal_overlap": overlap,
    }


def mine_candidate_rows(
    *,
    config: AnalysisConfig,
    track_duration: float,
    beats: np.ndarray,
    onsets: np.ndarray,
    rms: np.ndarray,
    sr: int,
    hop: int,
    vocal_segments: list[dict[str, Any]],
) -> list[RawCandidate]:
    if config.candidate_mode == CandidateMode.LYRIC_ALIGNED:
        windows = _build_lyric_aligned_windows(track_duration, vocal_segments, config)
    else:
        windows = _build_rhythmic_windows(track_duration, beats, config.min_dur, config.max_dur)

    candidates: list[RawCandidate] = []
    for window in windows:
        scored = _score_window(window, config, beats, onsets, rms, sr, hop, vocal_segments)
        if scored is not None:
            candidates.append(scored)

    candidates.sort(key=lambda c: c["score"], reverse=True)
    for rank, cand in enumerate(candidates[: config.max_cand], start=1):
        cand["rank"] = rank
        cand["best"] = rank == 1

    return candidates[: config.max_cand]
