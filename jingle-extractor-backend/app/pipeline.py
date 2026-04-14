"""
Pipeline wrapper — runs the jingle_extractor.py functions as background tasks.
"""

from __future__ import annotations

import asyncio
import json
import logging
import shutil
import sys
from pathlib import Path
from typing import Optional

import numpy as np

# Add project root so we can import jingle_extractor
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from jingle_extractor import (
    analyze_rhythm,
    demucs_split,
    extract_words,
    whisperx_transcribe,
)

from app.config import track_dir
from app.database import Database
from app.models import AnalysisConfig, AnalysisStatus
from app.services.candidate_mining import mine_candidate_rows

logger = logging.getLogger(__name__)

# Serialize pipeline runs — only one at a time (GPU/CPU memory)
pipeline_lock = asyncio.Lock()


def _group_words_into_segments(
    words: list[dict], gap_threshold: float = 0.5
) -> list[dict]:
    """Group words into segments where gap between consecutive words < threshold."""
    if not words:
        return []
    segments = []
    current = [words[0]]
    for w in words[1:]:
        prev_end = current[-1].get("end", 0)
        curr_start = w.get("start", 0)
        if curr_start - prev_end > gap_threshold:
            segments.append(_finalize_segment(current, len(segments) + 1))
            current = [w]
        else:
            current.append(w)
    if current:
        segments.append(_finalize_segment(current, len(segments) + 1))
    return segments


def _finalize_segment(words: list[dict], idx: int) -> dict:
    """Build a segment dict from a list of words."""
    text = " ".join(w.get("word", "") for w in words)
    start = words[0].get("start", 0)
    end = words[-1].get("end", 0)
    scores = [w.get("score", 0) for w in words if "score" in w]
    conf = sum(scores) / len(scores) if scores else 0.0
    return {
        "idx": idx,
        "start": start,
        "end": end,
        "text": text,
        "conf": conf,
        "words": words,
    }


def _compute_dynamic_range(rms: np.ndarray) -> float:
    """Dynamic range in dB: ratio of peak to RMS floor."""
    if rms.size == 0:
        return 0.0
    peak = float(np.max(rms))
    floor = float(np.percentile(rms, 10))
    if floor <= 0:
        return 50.0  # default
    return float(20 * np.log10(peak / floor))


def _materialize_original_audio(source: Path, destination: Path) -> None:
    """Ensure the original track is available as an MP3 for transport playback."""
    if destination.exists():
        return

    if source.suffix.lower() == ".mp3":
        shutil.copy2(source, destination)
        return

    from pydub import AudioSegment

    audio = AudioSegment.from_file(str(source))
    audio.export(destination, format="mp3", bitrate="192k")


async def run_pipeline(
    track_id: str, audio_path: str, config: AnalysisConfig
) -> None:
    """Full analysis pipeline — runs as background task with lock."""
    async with pipeline_lock:
        await _run_pipeline_inner(track_id, audio_path, config)


async def _run_pipeline_inner(
    track_id: str, audio_path: str, config: AnalysisConfig
) -> None:
    db = Database()
    tdir = track_dir(track_id)
    tdir.mkdir(parents=True, exist_ok=True)

    try:
        orig_dest = tdir / "orig.mp3"
        await asyncio.to_thread(_materialize_original_audio, Path(audio_path), orig_dest)

        # ── Step 1: Stem Separation ──────────────────────────────────
        db.update_status(track_id, AnalysisStatus.SEPARATING.value)
        logger.info("[%s] Starting Demucs stem separation...", track_id)

        stems = await asyncio.to_thread(
            demucs_split, Path(audio_path), tdir
        )

        # Move to canonical paths
        inst_dest = tdir / "inst.mp3"
        vox_dest = tdir / "vox.mp3"
        if not inst_dest.exists():
            stems["no_vocals"].rename(inst_dest)
        if not vox_dest.exists():
            stems["vocals"].rename(vox_dest)

        db.update_stems(track_id, str(inst_dest), str(vox_dest))

        # ── Step 2: Transcription ────────────────────────────────────
        db.update_status(track_id, AnalysisStatus.TRANSCRIBING.value)
        logger.info("[%s] Starting WhisperX transcription...", track_id)

        vocal_segments: list[dict] = []
        language = "en"
        lang_conf = 0.0

        try:
            lyrics_json = tdir / "lyrics_aligned.json"
            await asyncio.to_thread(
                whisperx_transcribe, vox_dest, lyrics_json
            )
            words = extract_words(lyrics_json)
            vocal_segments = _group_words_into_segments(words)
        except Exception as e:
            logger.warning("[%s] Transcription failed (instrumental?): %s", track_id, e)

        # ── Step 3: Rhythm Analysis ──────────────────────────────────
        db.update_status(track_id, AnalysisStatus.ANALYZING.value)
        logger.info("[%s] Starting rhythm analysis...", track_id)

        rhythm = await asyncio.to_thread(analyze_rhythm, inst_dest)

        # ── Step 4: Store metadata ───────────────────────────────────
        db.update_track_metadata(
            track_id,
            duration=rhythm["duration"],
            bpm=rhythm["tempo"],
            language=language,
            lang_conf=lang_conf,
            sr=rhythm["sr"],
            dr_db=_compute_dynamic_range(rhythm["rms"]),
        )

        # ── Step 5: Store timeline ──────────────────────────────────
        db.upsert_timeline(
            track_id,
            beats_json=json.dumps([float(x) for x in np.asarray(rhythm["beat_times"])]),
            rms_json=json.dumps([float(x) for x in np.asarray(rhythm["rms"])]),
            onsets_json=json.dumps([float(x) for x in np.asarray(rhythm["onset_times"])]) if rhythm["onset_times"] is not None else None,
            hop_length=rhythm["hop"],
        )

        # ── Step 6: Store vocal segments ────────────────────────────
        db.delete_vocal_segments(track_id)
        for seg in vocal_segments:
            db.insert_vocal_segment(
                track_id,
                segment_idx=seg["idx"],
                start=seg["start"],
                end=seg["end"],
                text=seg["text"],
                confidence=seg["conf"],
                words_json=json.dumps(seg.get("words", [])),
            )

        # ── Step 7: Mine candidates ──────────────────────────────────
        db.update_status(track_id, AnalysisStatus.MINING.value)
        logger.info("[%s] Mining candidates...", track_id)

        # ── Step 8: Score and rank ───────────────────────────────────
        beat_arr = rhythm["beat_times"]
        onset_arr = rhythm["onset_times"]
        rms_arr = rhythm["rms"]
        sr = rhythm["sr"]
        hop = rhythm["hop"]

        candidates = mine_candidate_rows(
            config=config,
            track_duration=rhythm["duration"],
            beats=beat_arr,
            onsets=onset_arr,
            rms=rms_arr,
            sr=sr,
            hop=hop,
            vocal_segments=vocal_segments,
        )

        # ── Step 9: Store candidates ─────────────────────────────────
        db.delete_candidates(track_id)
        for cand in candidates:
            db.insert_candidate(
                track_id,
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

        db.update_status(track_id, AnalysisStatus.COMPLETE.value)
        logger.info("[%s] Pipeline complete. %d candidates.", track_id, len(candidates[: config.max_cand]))

    except Exception as e:
        logger.exception("[%s] Pipeline failed", track_id)
        db.update_status(track_id, AnalysisStatus.FAILED.value, error_message=str(e))
