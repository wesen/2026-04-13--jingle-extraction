"""GET /api/tracks and GET /api/tracks/{track_id}/audio/{stem}"""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import stem_path
from app.database import Database
from app.models import StemType, Track

router = APIRouter()


def _resolve_stem_source(track: dict, stem: str) -> Path:
    spath = stem_path(track["id"], stem)
    if spath.exists():
        return spath

    if stem == "orig":
        original_path = Path(track["original_path"])
        if original_path.exists():
            return original_path

    return spath


@router.get("/api/tracks", response_model=list[Track])
async def list_tracks():
    """List all analyzed tracks (completed only)."""
    db = Database()
    rows = db.list_tracks()
    return [
        Track(
            id=r["id"],
            duration=r["duration"],
            bpm=r["bpm"],
            language=r["language"],
            lang_conf=r["lang_conf"],
            sr=r["sr"],
            dr_db=r["dr_db"],
        )
        for r in rows
        if r["status"] == "complete"
    ]


@router.get("/api/tracks/{track_id}/audio/{stem}")
async def get_track_audio(track_id: str, stem: StemType):
    """Stream a full track stem for transport playback."""
    db = Database()
    track = db.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track not found: {track_id}")

    spath = _resolve_stem_source(track, stem.value)
    if not spath.exists():
        raise HTTPException(status_code=404, detail=f"Stem not found: {stem.value}")

    return FileResponse(
        spath,
        media_type="audio/mpeg",
        filename=f"{track_id}_{stem.value}.mp3",
    )
