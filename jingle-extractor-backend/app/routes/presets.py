"""GET /api/presets"""

from fastapi import APIRouter

from app.presets import PRESETS

router = APIRouter()


@router.get("/api/presets")
async def get_presets():
    """Get all preset configurations."""
    return {name: cfg.model_dump() for name, cfg in PRESETS.items()}
