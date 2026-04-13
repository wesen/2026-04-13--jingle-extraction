Yes. The cleanest mostly-open-source setup is:

**MiniMax only for generation**, then **Demucs** for stem separation, **WhisperX** for lyric timestamps, **librosa** for beat/onset detection, and **pydub + FFmpeg** for slicing/export. MiniMax Music 2.6 supports instrumental-only generation via `is_instrumental`, accepts structured lyric tags like `[Hook]` and `[Verse]`, and can return audio as hex or URL. Demucs installs with `pip` and separates stems; WhisperX installs with `pip` and adds word-level timestamps via wav2vec2 alignment; librosa’s beat tracker is built around onset strength, tempo estimation, and beat picking; pydub handles slicing/export and uses FFmpeg for non-WAV formats. ([MiniMax API Docs][1])

For YouTube, keep one caution in mind: if you slice copyrighted music, uploads can still be matched by Content ID, and the rights holder can monetize, track, or block the video. ([Google Help][2])

## Recommended pipeline

1. **Generate 10–20 second instrumental cues** with MiniMax.
2. **Mine 2–5 second beat-aligned windows** from those cues for transitions, emphasis hits, and end buttons.
3. For **existing songs**, run **Demucs** first.
4. Run **WhisperX** on the **vocals stem** to get lyric timings.
5. Run **librosa** on **no_vocals** or **drums** to get beats/onsets.
6. Export the best short clips with tiny fades to avoid clicks.

For spoken YouTube underlines, use prompts like:

* `Instrumental YouTube underscore, sparse plucky synth, 108 BPM, 2-bar sting, hard stop, no vocals`
* `Minimal electronic transition cue, tight kick, bright transient, clean ending, no long tail`
* `Short ad bumper, upbeat guitar and claps, hook on beat 1, button ending, instrumental`

## Install

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install requests numpy scipy librosa soundfile pydub demucs whisperx
# system dependency for mp3/aac/io:
# macOS:   brew install ffmpeg
# Ubuntu:  sudo apt-get install ffmpeg
```

Those package choices follow the official install docs for Demucs and WhisperX, and pydub relies on FFmpeg/libav for non-WAV formats. ([GitHub][3])

## One-file Python sketch

```python
#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
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
    start: float
    end: float
    duration: float
    score: float
    source: str


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def safe_stem(s: str) -> str:
    out = "".join(ch if ch.isalnum() or ch in "-_ " else "_" for ch in s).strip()
    return out.replace(" ", "_")[:80] or "audio"


def run(cmd: list[str]) -> None:
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
    api_key = os.environ.get("MINIMAX_API_KEY")
    if not api_key:
        raise RuntimeError("Set MINIMAX_API_KEY in your environment.")

    payload: dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "lyrics": lyrics,
        "is_instrumental": instrumental,
        "output_format": "hex",   # documented, avoids URL expiry handling
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

    resp = requests.post(MINIMAX_API_URL, json=payload, headers=headers, timeout=600)
    resp.raise_for_status()
    data = resp.json()

    base = data.get("base_resp", {})
    if base.get("status_code", 0) != 0:
        raise RuntimeError(f"MiniMax error: {base}")

    audio_hex = data["data"]["audio"]
    audio_bytes = bytes.fromhex(audio_hex)
    out_path.write_bytes(audio_bytes)
    print(f"saved: {out_path}")
    return out_path


def demucs_split(input_audio: Path, out_dir: Path, model: str = "htdemucs") -> dict[str, Path]:
    ensure_dir(out_dir)
    cmd = [
        "python", "-m", "demucs",
        "-n", model,
        "--two-stems", "vocals",
        "--mp3",
        "-o", str(out_dir),
        str(input_audio),
    ]
    run(cmd)

    # Demucs typically writes: out_dir / model / song_stem / vocals.mp3 + no_vocals.mp3
    song_dir = out_dir / model / input_audio.stem
    vocals = next(song_dir.glob("vocals.*"), None)
    no_vocals = next(song_dir.glob("no_vocals.*"), None)
    if not vocals or not no_vocals:
        raise FileNotFoundError(f"Could not find Demucs outputs in {song_dir}")

    return {"vocals": vocals, "no_vocals": no_vocals}


def whisperx_transcribe(vocals_audio: Path, out_json: Path) -> Path:
    import torch
    import whisperx

    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"

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

    print(f"saved: {out_json}")
    return out_json


def nearest_distance(times: np.ndarray, t: float) -> float:
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
    a = max(0, int(start * sr / hop))
    b = max(a + 1, int(end * sr / hop))
    b = min(b, len(rms))
    return float(np.mean(rms[a:b])) if b > a else 0.0


def analyze_rhythm(audio_path: Path) -> dict[str, Any]:
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

    return {
        "sr": sr,
        "hop": hop,
        "tempo": float(np.asarray(tempo).reshape(-1)[0]),
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
    info = analyze_rhythm(audio_path)
    beat_times: np.ndarray = info["beat_times"]
    onset_times: np.ndarray = info["onset_times"]
    rms: np.ndarray = info["rms"]
    sr: int = info["sr"]
    hop: int = info["hop"]
    duration: float = info["duration"]

    durations = np.arange(min_len, max_len + 0.001, 0.5)
    raw: list[Candidate] = []

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

    return chosen


def export_candidates(
    source_audio: Path,
    candidates: list[Candidate],
    out_dir: Path,
    prefix: str,
) -> list[Path]:
    ensure_dir(out_dir)
    audio = AudioSegment.from_file(source_audio)
    out_files: list[Path] = []

    for i, cand in enumerate(candidates, start=1):
        clip = audio[int(cand.start * 1000): int(cand.end * 1000)]
        # tiny fades to avoid clicks
        clip = clip.fade_in(8).fade_out(18)
        out_path = out_dir / f"{prefix}_{i:02d}_{cand.duration:.1f}s.mp3"
        clip.export(out_path, format="mp3", bitrate="192k")
        out_files.append(out_path)

    return out_files


def extract_words(aligned_json: Path) -> list[dict[str, Any]]:
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


def cmd_generate(args: argparse.Namespace) -> None:
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
    input_audio = Path(args.input_audio)
    root = ensure_dir(Path(args.out_dir))

    stems = demucs_split(input_audio, root / "stems")
    lyrics_json = whisperx_transcribe(stems["vocals"], root / "lyrics_aligned.json")
    words = extract_words(lyrics_json)

    candidates = mine_candidates(
        stems["no_vocals"],
        min_len=args.min_len,
        max_len=args.max_len,
        top_n=args.top_n,
    )
    clips = export_candidates(
        stems["no_vocals"],
        candidates,
        root / "clips",
        prefix=input_audio.stem,
    )

    manifest = {
        "input_audio": str(input_audio),
        "stems": {k: str(v) for k, v in stems.items()},
        "lyrics_words": words[:2000],  # avoid huge manifests
        "candidates": [asdict(c) for c in candidates],
        "clips": [str(p) for p in clips],
    }
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"saved: {root / 'manifest.json'}")


def cmd_full(args: argparse.Namespace) -> None:
    root = ensure_dir(Path(args.out_dir))
    generated = root / "generated"
    clips_dir = root / "clips"
    ensure_dir(generated)
    ensure_dir(clips_dir)

    for i in range(args.count):
        track_path = generated / f"{safe_stem(args.name)}_{i+1:02d}.mp3"
        minimax_generate(
            prompt=args.prompt,
            lyrics=args.lyrics,
            instrumental=args.instrumental,
            model=args.model,
            out_path=track_path,
        )
        candidates = mine_candidates(track_path, args.min_len, args.max_len, args.top_n_per_track)
        export_candidates(track_path, candidates, clips_dir, prefix=track_path.stem)

    print(f"done: {root}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)

    gen = sub.add_parser("generate")
    gen.add_argument("--prompt", required=True)
    gen.add_argument("--name", default="minimax_track")
    gen.add_argument("--lyrics", default="")
    gen.add_argument("--instrumental", action="store_true", default=True)
    gen.add_argument("--model", default="music-2.6")
    gen.add_argument("--count", type=int, default=3)
    gen.add_argument("--out-dir", default="out/generated")
    gen.set_defaults(func=cmd_generate)

    ana = sub.add_parser("analyze")
    ana.add_argument("--input-audio", required=True)
    ana.add_argument("--out-dir", default="out/analysis")
    ana.add_argument("--min-len", type=float, default=2.0)
    ana.add_argument("--max-len", type=float, default=5.0)
    ana.add_argument("--top-n", type=int, default=12)
    ana.set_defaults(func=cmd_analyze)

    full = sub.add_parser("full")
    full.add_argument("--prompt", required=True)
    full.add_argument("--name", default="youtube_underscore")
    full.add_argument("--lyrics", default="")
    full.add_argument("--instrumental", action="store_true", default=True)
    full.add_argument("--model", default="music-2.6")
    full.add_argument("--count", type=int, default=4)
    full.add_argument("--min-len", type=float, default=2.0)
    full.add_argument("--max-len", type=float, default=5.0)
    full.add_argument("--top-n-per-track", type=int, default=5)
    full.add_argument("--out-dir", default="out/full")
    full.set_defaults(func=cmd_full)

    return p


if __name__ == "__main__":
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)
```

This script uses the documented MiniMax fields `model`, `prompt`, `lyrics`, `is_instrumental`, `output_format`, and `audio_setting`; it follows the Demucs CLI pattern from the official repo; the WhisperX alignment flow follows the README’s Python example; and the beat analysis follows librosa’s documented beat-tracking flow. ([MiniMax API Docs][1])

## Example runs

Generate a pack of instrumental underlines and auto-cut them into 2–5 second clips:

```bash
export MINIMAX_API_KEY=your_key_here

python pipeline.py full \
  --prompt "Instrumental YouTube underscore, sparse plucky synth, bright but not cheesy, 108 BPM feel, clear hook on beat 1, hard stop, no vocals, short intro, short ending" \
  --name "tech_explainer" \
  --count 4 \
  --min-len 2.0 \
  --max-len 5.0 \
  --out-dir out/tech_explainer
```

Analyze an existing song locally, get lyric timings, and cut beat-aligned no-vocal snippets:

```bash
python pipeline.py analyze \
  --input-audio path/to/song.mp3 \
  --out-dir out/song_analysis
```

Generate a sung mini-jingle instead of an instrumental cue:

```bash
python pipeline.py generate \
  --prompt "Commercial pop jingle, bright, catchy, short phrase, hard stop" \
  --lyrics "[Hook]\nAcme makes it easy\nAcme every day" \
  --name "acme_hook" \
  --count 2 \
  --out-dir out/acme
```

MiniMax documents that lyric tags such as `[Intro]`, `[Verse]`, `[Chorus]`, `[Hook]`, `[Break]`, and `[Outro]` are supported, and instrumental generation does not require lyrics when `is_instrumental` is true. ([MiniMax API Docs][1])

## Practical tuning

Use this rule set:

* For **voice-under-video**, cut from **instrumental-only** generations whenever possible.
* For **existing songs**, cut from **`no_vocals`** rather than the full mix.
* Prefer clips that **start on a transient** and **end on a beat**.
* Export a few versions at **2.0s, 3.0s, 4.0s, 5.0s**.
* Keep a folder of reusable categories: `hit`, `button`, `riser`, `transition`, `comedy`, `reveal`.

If Demucs hits memory limits, the official repo recommends using `--segment` to reduce split length, and CPU mode is available with `-d cpu`. ([GitHub][3])

If you later want **reference-audio style transfer** instead of fully fresh generation, MiniMax also exposes a **music-cover** model, and its docs say omitted lyrics can be extracted automatically from the reference audio via ASR. ([MiniMax API Docs][4])

The next useful step is turning this sketch into a **proper repo layout** with `requirements.txt`, `Makefile`, and JSON manifests for each clip pack.

[1]: https://platform.minimax.io/docs/api-reference/music-generation "Music Generation - MiniMax API Docs"
[2]: https://support.google.com/youtube/answer/2797370?hl=en&utm_source=chatgpt.com "How Content ID works - YouTube Help"
[3]: https://github.com/facebookresearch/demucs "GitHub - facebookresearch/demucs: Code for the paper Hybrid Spectrogram and Waveform Source Separation · GitHub"
[4]: https://platform.minimax.io/docs/api-reference/music-intro "Music Generation - MiniMax API Docs"

