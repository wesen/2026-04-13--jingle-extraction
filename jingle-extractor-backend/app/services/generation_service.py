"""Generation service for MiniMax-backed track batches."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from app.config import track_dir
from app.database import Database
from app.models import (
    AnalysisStatus,
    CreateGenerationRequest,
    GenerationMode,
    GenerationRunStatus,
    TrackGenerationStatus,
    TrackSourceType,
)


def _run_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")


def safe_stem(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_ " else "_" for ch in value).strip().replace(" ", "_")[:80] or "track"


def call_minimax_generate(**kwargs):
    from jingle_extractor import minimax_generate

    return minimax_generate(**kwargs)


def build_generation_run_id() -> str:
    return f"gen_{_run_timestamp()}"


def create_generation_run_record(db: Database, request: CreateGenerationRequest) -> str:
    run_id = build_generation_run_id()
    db.create_generation_run(
        run_id,
        name=safe_stem(request.namingPrefix),
        prompt=request.prompt,
        lyrics=request.lyrics or None,
        model=request.model,
        mode=request.mode.value,
        count_requested=request.count,
        status=GenerationRunStatus.QUEUED.value,
    )
    return run_id


def run_generation_batch(run_id: str, request: CreateGenerationRequest) -> None:
    db = Database()
    db.update_generation_run(run_id, status=GenerationRunStatus.GENERATING.value)

    failures = 0
    prefix = safe_stem(request.namingPrefix)
    instrumental = request.mode == GenerationMode.INSTRUMENTAL

    for idx in range(1, request.count + 1):
        display_name = f"{prefix}_{idx:02d}"
        track_id = f"{display_name}__{run_id}"
        tdir = track_dir(track_id)
        tdir.mkdir(parents=True, exist_ok=True)
        out_path = tdir / "orig.mp3"

        try:
            db.create_track(
                track_id,
                str(out_path),
                status=AnalysisStatus.NOT_STARTED.value,
                display_name=display_name,
                source_type=TrackSourceType.GENERATED.value,
                generation_status=TrackGenerationStatus.GENERATING.value,
                generation_run_id=run_id,
                variant_index=idx,
                prompt_snapshot=request.prompt,
                lyrics_snapshot=request.lyrics or None,
                minimax_model=request.model,
                instrumental_requested=instrumental,
            )

            call_minimax_generate(
                prompt=request.prompt,
                lyrics=request.lyrics,
                instrumental=instrumental,
                model=request.model,
                out_path=out_path,
            )

            db.update_track_metadata(
                track_id,
                generation_status=TrackGenerationStatus.GENERATED.value,
                display_name=display_name,
            )
            db.increment_generation_run_completed(run_id)
        except Exception as exc:
            failures += 1
            db.update_track_metadata(
                track_id,
                generation_status=TrackGenerationStatus.FAILED.value,
                error_message=str(exc),
            )

    if failures == request.count:
        db.update_generation_run(
            run_id,
            status=GenerationRunStatus.FAILED.value,
            error_message="All track generations failed",
        )
    elif failures > 0:
        db.update_generation_run(
            run_id,
            status=GenerationRunStatus.PARTIAL_FAILED.value,
            error_message=f"{failures} of {request.count} generations failed",
        )
    else:
        db.update_generation_run(run_id, status=GenerationRunStatus.COMPLETE.value)
