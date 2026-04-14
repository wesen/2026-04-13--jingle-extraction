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


RawCandidate = dict[str, Any]
LYRIC_PHRASE_WEIGHT = 4


def _build_rhythmic_windows(
    track_duration: float,
    beats: np.ndarray,
    min_dur: float,
    max_dur: float,
) -> list[dict[str, Any]]:
    durations = np.arange(min_dur, max_dur + 0.001, 0.5)
    windows: list[dict[str, Any]] = []
    idx = 0

    for start in beats:
        for dur in durations:
            end = float(start) + float(dur)
            if end > track_duration:
                continue
            idx += 1
            windows.append(
                {
                    "idx": idx,
                    "start": float(start),
                    "end": end,
                    "source_kind": "rhythmic_window",
                    "source_segment_id": None,
                    "source_text": None,
                    "source_start": None,
                    "source_end": None,
                    "words": [],
                }
            )

    return windows


def _build_lyric_aligned_windows(
    track_duration: float,
    vocal_segments: list[dict[str, Any]],
    config: AnalysisConfig,
) -> list[dict[str, Any]]:
    windows: list[dict[str, Any]] = []

    for idx, segment in enumerate(vocal_segments, start=1):
        seg_id = int(segment.get("id", segment.get("segment_idx", idx)))
        seg_start = float(segment.get("start", segment.get("start_time", 0.0)))
        seg_end = float(segment.get("end", segment.get("end_time", seg_start)))
        seg_text = str(segment.get("text", "")).strip() or f"Segment {seg_id}"
        seg_words = list(segment.get("words", []))

        start = max(0.0, seg_start - config.lyric_padding_before)
        end = min(track_duration, seg_end + config.lyric_padding_after)

        current_duration = end - start
        if current_duration < config.min_dur:
            deficit = config.min_dur - current_duration
            start = max(0.0, start - deficit / 2.0)
            end = min(track_duration, end + deficit / 2.0)

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

        windows.append(
            {
                "idx": idx,
                "start": start,
                "end": end,
                "source_kind": "lyric_segment",
                "source_segment_id": seg_id,
                "source_text": seg_text,
                "source_start": seg_start,
                "source_end": seg_end,
                "words": seg_words,
            }
        )

    return windows


def _compute_phrase_score(window: dict[str, Any], config: AnalysisConfig) -> int | None:
    source_start = window.get("source_start")
    source_end = window.get("source_end")
    if source_start is None or source_end is None:
        return None

    start = float(window["start"])
    end = float(window["end"])
    source_start = float(source_start)
    source_end = float(source_end)
    words = list(window.get("words", []))

    source_duration = max(0.001, source_end - source_start)
    window_duration = max(0.001, end - start)
    ideal_start = source_start - config.lyric_padding_before
    ideal_end = source_end + config.lyric_padding_after
    ideal_duration = max(0.001, ideal_end - ideal_start)

    overlap = max(0.0, min(end, source_end) - max(start, source_start))
    coverage = min(1.0, overlap / source_duration)

    boundary_error = abs(start - ideal_start) + abs(end - ideal_end)
    boundary_score = max(0.0, 1.0 - boundary_error / 1.5)

    compactness = min(1.0, ideal_duration / window_duration)
    word_score = 0.4 + 0.6 * min(len(words), 3) / 3.0 if words else 0.4
    release = max(0.0, end - source_end)
    release_target = max(config.lyric_padding_after, 0.25)
    release_score = min(1.0, release / release_target)

    phrase_score = 100.0 * (
        0.35 * coverage
        + 0.20 * boundary_score
        + 0.20 * compactness
        + 0.15 * word_score
        + 0.10 * release_score
    )
    return int(max(0.0, min(100.0, phrase_score)))


def _score_window(
    window: dict[str, Any],
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
    phrase_score = _compute_phrase_score(window, config)

    total_weight = config.atk_w + config.end_w + config.nrg_w + config.beat_w
    weighted_total = (
        attack * config.atk_w
        + ending * config.end_w
        + energy * config.nrg_w
        + beat * config.beat_w
    )
    if config.candidate_mode == CandidateMode.LYRIC_ALIGNED and phrase_score is not None:
        total_weight += LYRIC_PHRASE_WEIGHT
        weighted_total += phrase_score * LYRIC_PHRASE_WEIGHT

    overall = weighted_total / total_weight if total_weight > 0 else 0

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
        "phrase_score": phrase_score,
        "vocal_overlap": overlap,
        "source_kind": window.get("source_kind"),
        "source_segment_id": window.get("source_segment_id"),
        "source_text": window.get("source_text"),
        "source_start": window.get("source_start"),
        "source_end": window.get("source_end"),
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
