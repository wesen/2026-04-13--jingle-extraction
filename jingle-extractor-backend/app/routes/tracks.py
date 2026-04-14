"""GET /api/tracks"""

from fastapi import APIRouter

from app.database import Database
from app.models import Track

router = APIRouter()


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
