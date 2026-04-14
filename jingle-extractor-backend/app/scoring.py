"""
Score computation for candidate quality assessment.
"""

from __future__ import annotations

import numpy as np


def nearest_distance(times: np.ndarray, t: float) -> float:
    """Distance from t to nearest time in sorted array."""
    if times.size == 0:
        return 999.0
    idx = int(np.searchsorted(times, t))
    candidates = []
    if idx < len(times):
        candidates.append(abs(float(times[idx]) - t))
    if idx > 0:
        candidates.append(abs(float(times[idx - 1]) - t))
    return min(candidates) if candidates else 999.0


def mean_rms(rms: np.ndarray, sr: int, hop: int, start: float, end: float) -> float:
    """Mean RMS energy in a time range."""
    a = max(0, int(start * sr / hop))
    b = max(a + 1, int(end * sr / hop))
    b = min(b, len(rms))
    return float(np.mean(rms[a:b])) if b > a else 0.0


def compute_attack_score(start: float, onsets: np.ndarray) -> float:
    """How close is the clip start to an onset? 100=perfect, 0=far."""
    dist = nearest_distance(onsets, start)
    if dist < 0.01:
        return 100.0
    if dist > 0.2:
        return 0.0
    return 100.0 * (1.0 - dist / 0.2)


def compute_ending_score(
    end: float,
    onsets: np.ndarray,
    beats: np.ndarray,
    rms: np.ndarray,
    sr: int,
    hop: int,
) -> float:
    """How clean is the ending? Considers onset proximity, beat alignment, energy taper."""
    onset_dist = nearest_distance(onsets, end)
    beat_dist = nearest_distance(beats, end)

    tail_energy = mean_rms(rms, sr, hop, max(0, end - 0.2), end)
    body_energy = mean_rms(rms, sr, hop, max(0, end - 1.0), end)

    taper_score = 0.0
    if body_energy > 0:
        ratio = tail_energy / body_energy
        taper_score = max(0, min(100, 100 * (1.0 - abs(ratio - 0.8) / 0.5)))

    onset_score = 100.0 * max(0, 1.0 - onset_dist / 0.15)
    beat_score = 100.0 * max(0, 1.0 - beat_dist / 0.1)

    return onset_score * 0.3 + beat_score * 0.3 + taper_score * 0.4


def compute_energy_score(
    start: float, end: float, rms: np.ndarray, sr: int, hop: int
) -> float:
    """How much energy in the clip? Normalized to 0-100."""
    avg = mean_rms(rms, sr, hop, start, end)
    return min(100.0, max(0.0, avg / 3.0 * 100.0))


def compute_beat_score(start: float, end: float, beats: np.ndarray) -> float:
    """How well do clip boundaries align with beats?"""
    start_dist = nearest_distance(beats, start)
    end_dist = nearest_distance(beats, end)
    avg_dist = (start_dist + end_dist) / 2.0
    return 100.0 * max(0.0, 1.0 - avg_dist / 0.1)


def check_vocal_overlap(start: float, end: float, vocal_segments: list[dict]) -> bool:
    """Check if a time range overlaps with any vocal segment."""
    for seg in vocal_segments:
        seg_start = seg.get("start", seg.get("start_time", 0))
        seg_end = seg.get("end", seg.get("end_time", 0))
        if start < seg_end and end > seg_start:
            return True
    return False
