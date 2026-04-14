"""Tests for scoring functions."""

import numpy as np
from app.scoring import (
    compute_attack_score,
    compute_beat_score,
    compute_ending_score,
    compute_energy_score,
    check_vocal_overlap,
    nearest_distance,
    mean_rms,
)


class TestNearestDistance:
    def test_exact_match(self):
        arr = np.array([1.0, 2.0, 3.0])
        assert nearest_distance(arr, 2.0) == 0.0

    def test_between(self):
        arr = np.array([1.0, 2.0, 3.0])
        assert abs(nearest_distance(arr, 1.5) - 0.5) < 1e-10

    def test_before_start(self):
        arr = np.array([1.0, 2.0, 3.0])
        assert abs(nearest_distance(arr, 0.0) - 1.0) < 1e-10

    def test_after_end(self):
        arr = np.array([1.0, 2.0, 3.0])
        assert abs(nearest_distance(arr, 4.0) - 1.0) < 1e-10

    def test_empty_array(self):
        assert nearest_distance(np.array([]), 1.0) == 999.0


class TestAttackScore:
    def test_perfect(self):
        onsets = np.array([1.0, 2.0, 3.0])
        assert compute_attack_score(1.0, onsets) == 100.0

    def test_far(self):
        onsets = np.array([1.0, 2.0, 3.0])
        assert compute_attack_score(1.5, onsets) == 0.0

    def test_close(self):
        onsets = np.array([0.0, 0.2])
        score = compute_attack_score(0.1, onsets)
        assert 40 < score < 60


class TestVocalOverlap:
    def test_overlap(self):
        segs = [{"start": 1.0, "end": 2.0}]
        assert check_vocal_overlap(1.5, 2.5, segs) is True

    def test_no_overlap(self):
        segs = [{"start": 1.0, "end": 2.0}]
        assert check_vocal_overlap(3.0, 4.0, segs) is False

    def test_touching(self):
        segs = [{"start": 1.0, "end": 2.0}]
        assert check_vocal_overlap(2.0, 3.0, segs) is False

    def test_contained(self):
        segs = [{"start": 0.0, "end": 10.0}]
        assert check_vocal_overlap(2.0, 4.0, segs) is True

    def test_empty_segments(self):
        assert check_vocal_overlap(1.0, 2.0, []) is False


class TestBeatScore:
    def test_perfect(self):
        beats = np.array([1.0, 2.0, 3.0])
        assert compute_beat_score(1.0, 2.0, beats) == 100.0

    def test_far(self):
        beats = np.array([1.0, 2.0, 3.0])
        score = compute_beat_score(1.5, 2.5, beats)
        assert score < 50
