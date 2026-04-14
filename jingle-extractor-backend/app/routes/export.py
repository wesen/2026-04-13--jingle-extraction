"""POST /api/export and POST /api/export/batch"""

import io
import zipfile

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.config import stem_path
from app.database import Database
from app.models import ExportBatchRequest, ExportRequest

router = APIRouter()


def _render_clip(audio, start_time: float, end_time: float, fmt: str) -> bytes:
    """Slice audio, apply fades, encode to bytes."""
    from pydub import AudioSegment

    start_ms = int(start_time * 1000)
    end_ms = int(end_time * 1000)
    clip = audio[start_ms:end_ms]
    clip = clip.fade_in(20).fade_out(50)

    buf = io.BytesIO()
    if fmt == "mp3":
        clip.export(buf, format="mp3", bitrate="192k")
    else:
        clip.export(buf, format="wav")
    return buf.getvalue()


@router.post("/api/export")
async def export_clip(request: ExportRequest):
    """Export a single candidate clip as audio."""
    db = Database()
    candidates = db.get_candidates(request.trackId)
    cand = next(
        (c for c in candidates if c["candidate_idx"] == request.candidateId), None
    )
    if not cand:
        raise HTTPException(
            status_code=404, detail=f"Candidate {request.candidateId} not found"
        )

    spath = stem_path(request.trackId, request.stem.value)
    if not spath.exists():
        raise HTTPException(status_code=404, detail=f"Stem not found: {request.stem}")

    from pydub import AudioSegment

    audio = AudioSegment.from_file(str(spath))
    fmt = request.fmt.value
    clip_bytes = _render_clip(audio, cand["start_time"], cand["end_time"], fmt)

    mime = "audio/mpeg" if fmt == "mp3" else "audio/wav"
    ext = fmt
    filename = f"clip_{request.candidateId}.{ext}"

    return StreamingResponse(
        io.BytesIO(clip_bytes),
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/api/export/batch")
async def export_batch(request: ExportBatchRequest):
    """Export multiple candidate clips as a ZIP archive."""
    db = Database()
    candidates = db.get_candidates(request.trackId)
    spath = stem_path(request.trackId, request.stem.value)

    if not spath.exists():
        raise HTTPException(status_code=404, detail=f"Stem not found: {request.stem}")

    from pydub import AudioSegment

    audio = AudioSegment.from_file(str(spath))
    fmt = request.fmt.value
    ext = fmt

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for cand_id in request.candidates:
            cand = next(
                (c for c in candidates if c["candidate_idx"] == cand_id), None
            )
            if not cand:
                continue

            clip_bytes = _render_clip(audio, cand["start_time"], cand["end_time"], fmt)
            zf.writestr(f"clip_{cand_id:02d}.{ext}", clip_bytes)

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{request.trackId}_clips.zip"',
        },
    )
