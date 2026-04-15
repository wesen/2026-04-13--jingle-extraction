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


def _word_start(word: dict[str, Any], fallback: float) -> float:
    return float(word.get("start", fallback))


def _word_end(word: dict[str, Any], fallback: float) -> float:
    return float(word.get("end", fallback))


def _word_text(word: dict[str, Any]) -> str:
    return str(word.get("word", "")).strip()


def _chunk_span(words: list[dict[str, Any]]) -> float:
    if not words:
        return 0.0
    return _word_end(words[-1], 0.0) - _word_start(words[0], 0.0)


def _split_words_for_lyric_windows(
    words: list[dict[str, Any]],
    *,
    min_chunk_duration: float,
    max_chunk_duration: float,
) -> list[list[dict[str, Any]]]:
    if not words:
        return []

    normalized = sorted(
        [w for w in words if "start" in w and "end" in w],
        key=lambda w: _word_start(w, 0.0),
    )
    if not normalized:
        return []

    chunks: list[list[dict[str, Any]]] = []
    current: list[dict[str, Any]] = [normalized[0]]

    for word in normalized[1:]:
        current.append(word)
        span = _chunk_span(current)
        token = _word_text(word)
        punctuation_break = token.endswith((".", "!", "?", ";", ":", ","))

        if span >= max_chunk_duration or (punctuation_break and span >= min_chunk_duration):
            chunks.append(current)
            current = []

    if current:
        chunks.append(current)

    # Merge tiny trailing chunks to avoid micro windows that rarely score well.
    merged: list[list[dict[str, Any]]] = []
    for chunk in chunks:
        if merged and _chunk_span(chunk) < min_chunk_duration * 0.75:
            merged[-1] = [*merged[-1], *chunk]
        else:
            merged.append(chunk)

    return merged


def _build_lyric_aligned_windows(
    track_duration: float,
    vocal_segments: list[dict[str, Any]],
    config: AnalysisConfig,
) -> list[dict[str, Any]]:
    windows: list[dict[str, Any]] = []
    next_idx = 1

    for idx, segment in enumerate(vocal_segments, start=1):
        seg_id = int(segment.get("id", segment.get("segment_idx", idx)))
        seg_start = float(segment.get("start", segment.get("start_time", 0.0)))
        seg_end = float(segment.get("end", segment.get("end_time", seg_start)))
        seg_text = str(segment.get("text", "")).strip() or f"Segment {seg_id}"
        seg_words = list(segment.get("words", []))

        phrase_max_duration = max(
            0.8,
            config.max_dur - config.lyric_padding_before - config.lyric_padding_after,
        )
        phrase_min_duration = max(0.4, min(config.min_dur, phrase_max_duration) * 0.6)

        chunked_words = _split_words_for_lyric_windows(
            seg_words,
            min_chunk_duration=phrase_min_duration,
            max_chunk_duration=phrase_max_duration,
        )

        sources: list[dict[str, Any]] = []
        if chunked_words:
            for chunk_idx, chunk_words in enumerate(chunked_words, start=1):
                source_start = _word_start(chunk_words[0], seg_start)
                source_end = _word_end(chunk_words[-1], seg_end)
                source_text = " ".join(_word_text(w) for w in chunk_words).strip() or seg_text
                sources.append(
                    {
                        "source_start": source_start,
                        "source_end": source_end,
                        "source_text": source_text,
                        "words": chunk_words,
                        "source_kind": "lyric_segment_chunk" if len(chunked_words) > 1 else "lyric_segment",
                        "chunk_index": chunk_idx,
                    }
                )
        else:
            sources.append(
                {
                    "source_start": seg_start,
                    "source_end": seg_end,
                    "source_text": seg_text,
                    "words": seg_words,
                    "source_kind": "lyric_segment",
                    "chunk_index": None,
                }
            )

        for source in sources:
            source_start = float(source["source_start"])
            source_end = float(source["source_end"])

            start = max(0.0, source_start - config.lyric_padding_before)
            end = min(track_duration, source_end + config.lyric_padding_after)

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
                    "idx": next_idx,
                    "start": start,
                    "end": end,
                    "source_kind": source["source_kind"],
                    "source_segment_id": seg_id,
                    "source_text": source["source_text"],
                    "source_start": source_start,
                    "source_end": source_end,
                    "words": source["words"],
                }
            )
            next_idx += 1

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
