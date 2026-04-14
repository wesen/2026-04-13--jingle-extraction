"""
Pydantic models for request/response validation.
These map exactly to the TypeScript interfaces in jingle-extractor-ui/src/api/types.ts.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


# ─── Enums ──────────────────────────────────────────────────────────────────


class VocalMode(str, Enum):
    ANY = "any"
    INST = "inst"
    VOCAL = "vocal"


class ExportFormat(str, Enum):
    MP3 = "mp3"
    WAV = "wav"


class StemType(str, Enum):
    ORIG = "orig"
    INST = "inst"
    VOX = "vox"


class AnalysisStatus(str, Enum):
    UPLOADED = "uploaded"
    SEPARATING = "separating_stems"
    TRANSCRIBING = "transcribing"
    ANALYZING = "analyzing_rhythm"
    MINING = "mining_candidates"
    COMPLETE = "complete"
    FAILED = "failed"


# ─── Track ──────────────────────────────────────────────────────────────────


class Track(BaseModel):
    id: str
    duration: float
    bpm: float
    language: str
    lang_conf: float
    sr: int
    dr_db: float


# ─── Timeline ───────────────────────────────────────────────────────────────


class TimelineData(BaseModel):
    duration: float
    beats: list[float]
    rms: list[float]
    onsets: Optional[list[float]] = None


# ─── Vocals ─────────────────────────────────────────────────────────────────


class VocalWord(BaseModel):
    word: str
    start: float
    end: float
    score: float = 0.0  # optional — WhisperX alignment doesn't always provide this


class VocalSegment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    conf: float
    words: Optional[list[VocalWord]] = None


class VocalsData(BaseModel):
    segments: list[VocalSegment]


# ─── Candidates ─────────────────────────────────────────────────────────────


class Candidate(BaseModel):
    id: int
    rank: int
    start: float
    end: float
    score: int
    attack: int
    ending: int
    energy: int
    vocal_overlap: bool
    best: bool


# ─── Configuration ──────────────────────────────────────────────────────────


class AnalysisConfig(BaseModel):
    min_dur: float = Field(ge=0.1, le=60.0)
    max_dur: float = Field(ge=0.1, le=60.0)
    min_score: int = Field(ge=0, le=100)
    vocal_mode: VocalMode = VocalMode.INST
    atk_w: int = Field(ge=0, le=20)
    end_w: int = Field(ge=0, le=20)
    nrg_w: int = Field(ge=0, le=20)
    beat_w: int = Field(ge=0, le=20)
    max_cand: int = Field(ge=1, le=50)
    fade_in: int = Field(ge=0, le=1000)
    fade_out: int = Field(ge=0, le=1000)
    fmt: ExportFormat = ExportFormat.MP3
    br: Optional[int] = Field(None, ge=64, le=320)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "min_dur": 2.0,
                "max_dur": 4.5,
                "min_score": 75,
                "vocal_mode": "inst",
                "atk_w": 6,
                "end_w": 4,
                "nrg_w": 3,
                "beat_w": 3,
                "max_cand": 5,
                "fade_in": 8,
                "fade_out": 18,
                "fmt": "mp3",
                "br": 192,
            }
        }
    )


# ─── Request Models ─────────────────────────────────────────────────────────


class AnalyzeRequest(BaseModel):
    audio_file: str = Field(description="Path to audio file on server")
    config: AnalysisConfig


class MineRequest(BaseModel):
    trackId: str = Field(description="Track identifier")
    config: AnalysisConfig


class ExportRequest(BaseModel):
    trackId: str
    candidateId: int
    stem: StemType
    fmt: ExportFormat


class ExportBatchRequest(BaseModel):
    trackId: str
    candidates: list[int]
    stem: StemType
    fmt: ExportFormat


# ─── Response Models ────────────────────────────────────────────────────────


class AnalysisResponse(BaseModel):
    track: Track
    timeline: TimelineData
    vocals: VocalsData
    candidates: list[Candidate]


class AnalyzeAcceptedResponse(BaseModel):
    track_id: str
    status: AnalysisStatus


# ─── Preset Type ────────────────────────────────────────────────────────────

PresetName = str
Presets = dict[PresetName, AnalysisConfig]
