#!/usr/bin/env python3
"""
Jingle Extractor Pipeline

A tool for generating and extracting jingles/short audio clips using:
- MiniMax API for AI music generation
- Demucs for stem separation
- WhisperX for lyric transcription with timestamps
- librosa for beat/onset detection
- pydub for audio slicing/export

Usage:
    python jingle_extractor.py generate --prompt "..." --name "..."
    python jingle_extractor.py analyze --input-audio path/to/song.mp3
    python jingle_extractor.py full --prompt "..." --name "..."
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

import librosa
import numpy as np
import requests
from pydub import AudioSegment


MINIMAX_API_URL = "https://api.minimax.io/v1/music_generation"


@dataclass
class Candidate:
    """Represents a candidate clip with timing and quality score."""
    start: float
    end: float
    duration: float
    score: float
    source: str


def ensure_dir(path: Path) -> Path:
    """Ensure directory exists, creating if necessary."""
    path.mkdir(parents=True, exist_ok=True)
    return path


def safe_stem(s: str) -> str:
    """Convert string to safe filename stem."""
    out = "".join(ch if ch.isalnum() or ch in "-_ " else "_" for ch in s).strip()
    return out.replace(" ", "_")[:80] or "audio"


def run(cmd: list[str]) -> None:
    """Run a shell command with error checking."""
    print(">", " ".join(cmd))
    subprocess.run(cmd, check=True)


def minimax_generate(
    prompt: str,
    out_path: Path,
    lyrics: str = "",
    instrumental: bool = True,
    model: str = "music-2.6",
    sample_rate: int = 44100,
    bitrate: int = 256000,
    fmt: str = "mp3",
) -> Path:
    """
    Generate music using MiniMax API.
    
    Args:
        prompt: Text description of desired music
        out_path: Where to save the generated audio
        lyrics: Optional lyrics with tags like [Hook], [Verse]
        instrumental: Whether to generate instrumental-only
        model: MiniMax model version
        sample_rate: Output sample rate
        bitrate: Output bitrate
        fmt: Output format (mp3, wav, etc.)
    
    Returns:
        Path to the saved audio file
    """
    api_key = os.environ.get("MINIMAX_API_KEY")
    if not api_key:
        raise RuntimeError("Set MINIMAX_API_KEY in your environment.")

    payload: dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "lyrics": lyrics,
        "is_instrumental": instrumental,
        "output_format": "hex",  # documented, avoids URL expiry handling
        "audio_setting": {
            "sample_rate": sample_rate,
            "bitrate": bitrate,
            "format": fmt,
        },
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    print(f"Generating music with MiniMax (model={model}, instrumental={instrumental})...")
    resp = requests.post(MINIMAX_API_URL, json=payload, headers=headers, timeout=600)
    resp.raise_for_status()
    data = resp.json()

    base = data.get("base_resp", {})
    if base.get("status_code", 0) != 0:
        raise RuntimeError(f"MiniMax error: {base}")

    audio_hex = data["data"]["audio"]
    audio_bytes = bytes.fromhex(audio_hex)
    out_path.write_bytes(audio_bytes)
    print(f"Saved: {out_path} ({len(audio_bytes)} bytes)")
    return out_path


def demucs_split(input_audio: Path, out_dir: Path, model: str = "htdemucs") -> dict[str, Path]:
    """
    Separate audio into stems using Demucs.
    
    Args:
        input_audio: Path to input audio file
        out_dir: Directory for output stems
        model: Demucs model to use
    
    Returns:
        Dictionary with 'vocals' and 'no_vocals' paths
    """
    ensure_dir(out_dir)
    print(f"Running Demucs on {input_audio}...")
    
    cmd = [
        sys.executable, "-m", "demucs",
        "-n", model,
        "--two-stems", "vocals",
        "--mp3",
        "-o", str(out_dir),
        str(input_audio),
    ]
    run(cmd)

    # Demucs writes: out_dir / model / song_stem / vocals.mp3 + no_vocals.mp3
    song_dir = out_dir / model / input_audio.stem
    vocals = next(song_dir.glob("vocals.*"), None)
    no_vocals = next(song_dir.glob("no_vocals.*"), None)
    
    if not vocals or not no_vocals:
        raise FileNotFoundError(f"Could not find Demucs outputs in {song_dir}")

    print(f"  Vocals: {vocals}")
    print(f"  No vocals: {no_vocals}")
    return {"vocals": vocals, "no_vocals": no_vocals}


def whisperx_transcribe(vocals_audio: Path, out_json: Path) -> Path:
    """
    Transcribe vocals with word-level timestamps using WhisperX.
    
    Args:
        vocals_audio: Path to vocals stem
        out_json: Where to save the alignment JSON
    
    Returns:
        Path to the saved JSON file
    """
    import torch
    import whisperx

    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"
    
    print(f"Running WhisperX on {vocals_audio} (device={device})...")

    audio = whisperx.load_audio(str(vocals_audio))
    model = whisperx.load_model("large-v2", device, compute_type=compute_type)
    result = model.transcribe(audio, batch_size=16 if device == "cuda" else 4)

    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"],
        device=device,
    )
    aligned = whisperx.align(
        result["segments"],
        model_a,
        metadata,
        audio,
        device,
        return_char_alignments=False,
    )

    with out_json.open("w", encoding="utf-8") as f:
        json.dump(aligned, f, ensure_ascii=False, indent=2)

    print(f"Saved: {out_json}")
    return out_json


def nearest_distance(times: np.ndarray, t: float) -> float:
    """Find distance from t to nearest time in array."""
    if times.size == 0:
        return 999.0
    idx = np.searchsorted(times, t)
    best = []
    if idx < len(times):
        best.append(abs(float(times[idx]) - t))
    if idx > 0:
        best.append(abs(float(times[idx - 1]) - t))
    return min(best) if best else 999.0


def mean_rms(rms: np.ndarray, sr: int, hop: int, start: float, end: float) -> float:
    """Calculate mean RMS energy in a time range."""
    a = max(0, int(start * sr / hop))
    b = max(a + 1, int(end * sr / hop))
    b = min(b, len(rms))
    return float(np.mean(rms[a:b])) if b > a else 0.0


def analyze_rhythm(audio_path: Path) -> dict[str, Any]:
    """
    Analyze rhythm features from audio.
    
    Returns dict with:
        - sr: sample rate
        - hop: hop length
        - tempo: estimated tempo (BPM)
        - duration: audio duration in seconds
        - beat_times: array of beat timestamps
        - onset_times: array of onset timestamps
        - rms: RMS energy envelope
    """
    print(f"Analyzing rhythm: {audio_path}")
    
    y, sr = librosa.load(str(audio_path), sr=None, mono=True)
    hop = 512
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    tempo, beat_frames = librosa.beat.beat_track(
        onset_envelope=onset_env, sr=sr, hop_length=hop, trim=True
    )
    onset_frames = librosa.onset.onset_detect(
        onset_envelope=onset_env,
        sr=sr,
        hop_length=hop,
        backtrack=True,
    )
    beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=hop)
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    duration = librosa.get_duration(y=y, sr=sr)
    
    tempo_val = float(np.asarray(tempo).reshape(-1)[0]) if hasattr(tempo, 'reshape') else float(tempo)
    
    print(f"  Duration: {duration:.2f}s, Tempo: {tempo_val:.1f} BPM, Beats: {len(beat_times)}, Onsets: {len(onset_times)}")

    return {
        "sr": sr,
        "hop": hop,
        "tempo": tempo_val,
        "duration": float(duration),
        "beat_times": beat_times,
        "onset_times": onset_times,
        "rms": rms,
    }


def mine_candidates(
    audio_path: Path,
    min_len: float = 2.0,
    max_len: float = 5.0,
    top_n: int = 12,
) -> list[Candidate]:
    """
    Mine candidate clips from audio based on beat alignment and energy.
    
    Scoring considers:
    - RMS energy in the clip
    - Proximity to onset at start (clean attack)
    - Proximity to onset at end (clean ending)
    - Proximity to beat at end (ends on beat)
    - Energy drop at tail (helps clean stop)
    
    Args:
        audio_path: Path to audio file
        min_len: Minimum clip duration in seconds
        max_len: Maximum clip duration in seconds
        top_n: Number of top candidates to return
    
    Returns:
        List of Candidate objects sorted by score
    """
    info = analyze_rhythm(audio_path)
    beat_times: np.ndarray = info["beat_times"]
    onset_times: np.ndarray = info["onset_times"]
    rms: np.ndarray = info["rms"]
    sr: int = info["sr"]
    hop: int = info["hop"]
    duration: float = info["duration"]

    durations = np.arange(min_len, max_len + 0.001, 0.5)
    raw: list[Candidate] = []

    print(f"Mining candidates from {audio_path} (min={min_len}s, max={max_len}s)...")

    for start in beat_times:
        for d in durations:
            end = start + float(d)
            if end > duration:
                continue

            avg = mean_rms(rms, sr, hop, start, end)
            tail = mean_rms(rms, sr, hop, max(start, end - 0.18), end)
            start_onset = nearest_distance(onset_times, float(start))
            end_onset = nearest_distance(onset_times, float(end))
            end_beat = nearest_distance(beat_times, float(end))

            score = 0.0
            score += avg * 3.0
            score += max(0.0, 0.12 - start_onset) * 6.0   # clean attack
            score += max(0.0, 0.10 - end_onset) * 4.0     # clean ending transient
            score += max(0.0, 0.08 - end_beat) * 3.0      # ends on beat
            score += max(0.0, avg - tail) * 1.5           # slight tail drop helps stop cleanly

            raw.append(
                Candidate(
                    start=float(start),
                    end=float(end),
                    duration=float(d),
                    score=float(score),
                    source=str(audio_path),
                )
            )

    raw.sort(key=lambda c: c.score, reverse=True)
    
    # Select non-overlapping candidates
    chosen: list[Candidate] = []
    for cand in raw:
        overlap = False
        for prev in chosen:
            intersection = max(0.0, min(cand.end, prev.end) - max(cand.start, prev.start))
            shorter = min(cand.duration, prev.duration)
            if shorter > 0 and intersection / shorter > 0.5:
                overlap = True
                break
        if not overlap:
            chosen.append(cand)
        if len(chosen) >= top_n:
            break

    print(f"  Found {len(chosen)} non-overlapping candidates")
    return chosen


def export_candidates(
    source_audio: Path,
    candidates: list[Candidate],
    out_dir: Path,
    prefix: str,
) -> list[Path]:
    """
    Export candidate clips as individual audio files.
    
    Args:
        source_audio: Path to source audio
        candidates: List of Candidate objects
        out_dir: Directory for output clips
        prefix: Filename prefix for clips
    
    Returns:
        List of paths to exported clips
    """
    ensure_dir(out_dir)
    audio = AudioSegment.from_file(source_audio)
    out_files: list[Path] = []

    print(f"Exporting {len(candidates)} clips to {out_dir}...")

    for i, cand in enumerate(candidates, start=1):
        clip = audio[int(cand.start * 1000): int(cand.end * 1000)]
        # tiny fades to avoid clicks
        clip = clip.fade_in(8).fade_out(18)
        out_path = out_dir / f"{prefix}_{i:02d}_{cand.duration:.1f}s.mp3"
        clip.export(out_path, format="mp3", bitrate="192k")
        out_files.append(out_path)
        print(f"  {out_path.name} ({cand.start:.2f}s - {cand.end:.2f}s, score={cand.score:.2f})")

    return out_files


def extract_words(aligned_json: Path) -> list[dict[str, Any]]:
    """Extract word-level timing from WhisperX output."""
    data = json.loads(aligned_json.read_text(encoding="utf-8"))
    words: list[dict[str, Any]] = []
    for seg in data.get("segments", []):
        for w in seg.get("words", []):
            if "word" in w and "start" in w and "end" in w:
                words.append({
                    "word": w["word"],
                    "start": w["start"],
                    "end": w["end"],
                })
    return words


# ============================================================================
# Command Handlers
# ============================================================================

def cmd_generate(args: argparse.Namespace) -> None:
    """Generate music tracks with MiniMax."""
    out_dir = ensure_dir(Path(args.out_dir))
    
    for i in range(args.count):
        out_path = out_dir / f"{safe_stem(args.name)}_{i+1:02d}.mp3"
        minimax_generate(
            prompt=args.prompt,
            lyrics=args.lyrics,
            instrumental=args.instrumental,
            model=args.model,
            out_path=out_path,
        )


def cmd_analyze(args: argparse.Namespace) -> None:
    """Analyze existing audio: separate stems, transcribe, mine clips."""
    input_audio = Path(args.input_audio)
    root = ensure_dir(Path(args.out_dir))

    print(f"\n=== Analyzing {input_audio} ===\n")

    # Step 1: Separate stems
    stems = demucs_split(input_audio, root / "stems")
    
    # Step 2: Transcribe vocals (if not skipped)
    words: list[dict[str, Any]] = []
    if not args.skip_transcribe:
        try:
            lyrics_json = whisperx_transcribe(stems["vocals"], root / "lyrics_aligned.json")
            words = extract_words(lyrics_json)
        except Exception as e:
            print(f"Warning: Transcription failed (likely instrumental): {e}")
            print("Continuing without lyrics...")
    else:
        print("Skipping transcription (--skip-transcribe)")

    # Step 3: Mine candidates from no_vocals
    candidates = mine_candidates(
        stems["no_vocals"],
        min_len=args.min_len,
        max_len=args.max_len,
        top_n=args.top_n,
    )
    
    # Step 4: Export clips
    clips = export_candidates(
        stems["no_vocals"],
        candidates,
        root / "clips",
        prefix=input_audio.stem,
    )

    # Step 5: Save manifest
    manifest = {
        "input_audio": str(input_audio),
        "stems": {k: str(v) for k, v in stems.items()},
        "lyrics_words": words[:2000] if words else [],  # avoid huge manifests
        "candidates": [asdict(c) for c in candidates],
        "clips": [str(p) for p in clips],
    }
    manifest_path = root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\nSaved manifest: {manifest_path}")


def cmd_full(args: argparse.Namespace) -> None:
    """Full pipeline: generate tracks, then mine clips."""
    root = ensure_dir(Path(args.out_dir))
    generated = root / "generated"
    clips_dir = root / "clips"
    ensure_dir(generated)
    ensure_dir(clips_dir)

    print(f"\n=== Full Pipeline: {args.count} tracks, mining {args.top_n_per_track} clips each ===\n")

    for i in range(args.count):
        track_path = generated / f"{safe_stem(args.name)}_{i+1:02d}.mp3"
        
        # Generate
        minimax_generate(
            prompt=args.prompt,
            lyrics=args.lyrics,
            instrumental=args.instrumental,
            model=args.model,
            out_path=track_path,
        )
        
        # Mine clips from this track
        candidates = mine_candidates(
            track_path,
            args.min_len,
            args.max_len,
            args.top_n_per_track,
        )
        export_candidates(track_path, candidates, clips_dir, prefix=track_path.stem)

    print(f"\nDone! Output: {root}")
    print(f"  Generated tracks: {generated}")
    print(f"  Extracted clips: {clips_dir}")


# ============================================================================
# CLI
# ============================================================================

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Jingle Extractor: Generate and extract short audio clips",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate instrumental underlines
  python jingle_extractor.py generate \\
      --prompt "Instrumental YouTube underscore, sparse plucky synth, 108 BPM" \\
      --name "tech_underline" --count 4

  # Analyze existing song
  python jingle_extractor.py analyze --input-audio song.mp3 --out-dir out/analysis

  # Full pipeline: generate and extract
  python jingle_extractor.py full \\
      --prompt "Short ad bumper, upbeat guitar and claps, hook on beat 1" \\
      --name "ad_bumper" --count 3
        """
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    # generate
    gen = sub.add_parser("generate", help="Generate music with MiniMax")
    gen.add_argument("--prompt", required=True, help="Music description prompt")
    gen.add_argument("--name", default="minimax_track", help="Base filename")
    gen.add_argument("--lyrics", default="", help="Optional lyrics with [Hook], [Verse] tags")
    gen.add_argument("--instrumental", action="store_true", default=True, help="Generate instrumental")
    gen.add_argument("--model", default="music-2.6", help="MiniMax model version")
    gen.add_argument("--count", type=int, default=3, help="Number of tracks to generate")
    gen.add_argument("--out-dir", default="out/generated", help="Output directory")
    gen.set_defaults(func=cmd_generate)

    # analyze
    ana = sub.add_parser("analyze", help="Analyze existing audio file")
    ana.add_argument("--input-audio", required=True, help="Path to input audio")
    ana.add_argument("--out-dir", default="out/analysis", help="Output directory")
    ana.add_argument("--min-len", type=float, default=2.0, help="Minimum clip duration (seconds)")
    ana.add_argument("--max-len", type=float, default=5.0, help="Maximum clip duration (seconds)")
    ana.add_argument("--top-n", type=int, default=12, help="Number of clips to extract")
    ana.add_argument("--skip-transcribe", action="store_true", help="Skip WhisperX transcription (for instrumental tracks)")
    ana.set_defaults(func=cmd_analyze)

    # full
    full = sub.add_parser("full", help="Generate tracks and extract clips")
    full.add_argument("--prompt", required=True, help="Music description prompt")
    full.add_argument("--name", default="youtube_underscore", help="Base filename")
    full.add_argument("--lyrics", default="", help="Optional lyrics")
    full.add_argument("--instrumental", action="store_true", default=True, help="Instrumental only")
    full.add_argument("--model", default="music-2.6", help="MiniMax model version")
    full.add_argument("--count", type=int, default=4, help="Number of tracks to generate")
    full.add_argument("--min-len", type=float, default=2.0, help="Minimum clip duration")
    full.add_argument("--max-len", type=float, default=5.0, help="Maximum clip duration")
    full.add_argument("--top-n-per-track", type=int, default=5, help="Clips per track")
    full.add_argument("--out-dir", default="out/full", help="Output directory")
    full.set_defaults(func=cmd_full)

    return p


if __name__ == "__main__":
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)
