"""
Pydantic models for request/response validation.
These map exactly to the TypeScript interfaces in jingle-extractor-ui/src/api/types.ts.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ─── Enums ──────────────────────────────────────────────────────────────────


class VocalMode(str, Enum):
    ANY = "any"
    INST = "inst"
    VOCAL = "vocal"


class ExportFormat(str, Enum):
    MP3 = "mp3"
    WAV = "wav"


class CandidateMode(str, Enum):
    RHYTHMIC = "rhythmic"
    LYRIC_ALIGNED = "lyric_aligned"


class StemType(str, Enum):
    ORIG = "orig"
    INST = "inst"
    VOX = "vox"


class AnalysisStatus(str, Enum):
    NOT_STARTED = "not_started"
    UPLOADED = "uploaded"
    SEPARATING = "separating_stems"
    TRANSCRIBING = "transcribing"
    ANALYZING = "analyzing_rhythm"
    MINING = "mining_candidates"
    COMPLETE = "complete"
    FAILED = "failed"


class GenerationMode(str, Enum):
    VOCAL = "vocal"
    INSTRUMENTAL = "instrumental"


class GenerationRunStatus(str, Enum):
    QUEUED = "queued"
    GENERATING = "generating"
    COMPLETE = "complete"
    PARTIAL_FAILED = "partial_failed"
    FAILED = "failed"


class TrackSourceType(str, Enum):
    GENERATED = "generated"
    IMPORTED = "imported"


class TrackGenerationStatus(str, Enum):
    QUEUED = "queued"
    GENERATING = "generating"
    GENERATED = "generated"
    FAILED = "failed"


class TrackDecision(str, Enum):
    PENDING = "pending"
    KEEP = "keep"
    REJECT = "reject"


# ─── Track ──────────────────────────────────────────────────────────────────


class Track(BaseModel):
    id: str
    duration: float
    bpm: float
    language: str
    lang_conf: float
    sr: int
    dr_db: float


class TrackLibraryItem(BaseModel):
    id: str
    display_name: str
    duration: Optional[float] = None
    source_type: TrackSourceType
    generation_run_id: Optional[str] = None
    variant_index: Optional[int] = None
    generation_status: Optional[TrackGenerationStatus] = None
    analysis_status: Optional[AnalysisStatus] = None
    prompt_snapshot: Optional[str] = None
    lyrics_snapshot: Optional[str] = None
    instrumental_requested: Optional[bool] = None
    minimax_model: Optional[str] = None
    decision: Optional[TrackDecision] = None


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
    phrase_score: Optional[int] = None
    vocal_overlap: bool
    best: bool
    source_kind: Optional[str] = None
    source_segment_id: Optional[int] = None
    source_text: Optional[str] = None
    source_start: Optional[float] = None
    source_end: Optional[float] = None


# ─── Configuration ──────────────────────────────────────────────────────────


class AnalysisConfig(BaseModel):
    min_dur: float = Field(ge=0.1, le=60.0)
    max_dur: float = Field(ge=0.1, le=60.0)
    min_score: int = Field(ge=0, le=100)
    vocal_mode: VocalMode = VocalMode.INST
    candidate_mode: CandidateMode = CandidateMode.RHYTHMIC
    lyric_padding_before: float = Field(0.5, ge=0.0, le=10.0)
    lyric_padding_after: float = Field(0.5, ge=0.0, le=10.0)
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
                "candidate_mode": "rhythmic",
                "lyric_padding_before": 0.5,
                "lyric_padding_after": 0.5,
                "atk_w": 6,
                "end_w": 4,
                "nrg_w": 3,
                "beat_w": 3,
                "max_cand": 5,
                "fade_in": 20,
                "fade_out": 50,
                "fmt": "mp3",
                "br": 192,
            }
        }
    )


# ─── Studio / Generation ───────────────────────────────────────────────────


class CreateGenerationRequest(BaseModel):
    prompt: str
    lyrics: str = ""
    model: str = "music-2.6"
    count: int = Field(ge=1, le=8)
    mode: GenerationMode = GenerationMode.VOCAL
    namingPrefix: str = Field(min_length=1, max_length=80)


class GenerationRunSummary(BaseModel):
    id: str
    name: str
    prompt: str
    lyrics: Optional[str] = None
    model: str
    mode: GenerationMode
    countRequested: int
    countCompleted: int
    status: GenerationRunStatus
    createdAt: Optional[str] = None


class GenerationAcceptedResponse(BaseModel):
    generation_id: str
    status: GenerationRunStatus
    count_requested: int


class GenerationRunDetailResponse(GenerationRunSummary):
    error_message: Optional[str] = None
    tracks: list[TrackLibraryItem]


class AnalyzeTrackRequest(BaseModel):
    config: AnalysisConfig


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
    fade_in: int = Field(20, ge=0, le=1000)
    fade_out: int = Field(50, ge=0, le=1000)
    br: Optional[int] = Field(None, ge=64, le=320)
    start: Optional[float] = None
    end: Optional[float] = None


class ExportBatchRequest(BaseModel):
    trackId: str
    candidates: list[int]
    stem: StemType
    fmt: ExportFormat
    fade_in: int = Field(20, ge=0, le=1000)
    fade_out: int = Field(50, ge=0, le=1000)
    br: Optional[int] = Field(None, ge=64, le=320)


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
