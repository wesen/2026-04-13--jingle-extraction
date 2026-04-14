"""
SQLite database wrapper for the Jingle Extractor backend.
Uses WAL mode for concurrent reads, sync connections for simplicity.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

from app.config import db_path

SQL_SCHEMA = """
CREATE TABLE IF NOT EXISTS tracks (
    id              TEXT PRIMARY KEY,
    original_path   TEXT NOT NULL,
    inst_path       TEXT,
    vox_path        TEXT,
    duration        REAL NOT NULL DEFAULT 0,
    bpm             REAL NOT NULL DEFAULT 0,
    language        TEXT DEFAULT 'en',
    lang_conf       REAL DEFAULT 0.0,
    sr              INTEGER DEFAULT 44100,
    dr_db           REAL DEFAULT 0.0,
    status          TEXT DEFAULT 'uploaded',
    error_message   TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS timelines (
    track_id        TEXT PRIMARY KEY,
    beats_json      TEXT NOT NULL,
    rms_json        TEXT NOT NULL,
    onsets_json     TEXT,
    hop_length      INTEGER DEFAULT 512,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vocal_segments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id        TEXT NOT NULL,
    segment_idx     INTEGER NOT NULL,
    start_time      REAL NOT NULL,
    end_time        REAL NOT NULL,
    text            TEXT NOT NULL,
    confidence      REAL NOT NULL,
    words_json      TEXT,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidates (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id        TEXT NOT NULL,
    candidate_idx   INTEGER NOT NULL,
    rank            INTEGER NOT NULL,
    start_time      REAL NOT NULL,
    end_time        REAL NOT NULL,
    score           INTEGER NOT NULL,
    attack          INTEGER NOT NULL,
    ending          INTEGER NOT NULL,
    energy          INTEGER NOT NULL,
    vocal_overlap   INTEGER DEFAULT 0,
    is_best         INTEGER DEFAULT 0,
    config_hash     TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidates_track ON candidates(track_id);
CREATE INDEX IF NOT EXISTS idx_vocal_segments_track ON vocal_segments(track_id);
CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);
"""


class Database:
    """Thin wrapper around SQLite for the jingle extractor."""

    def __init__(self, path: Optional[Path] = None):
        self.db_path = str(path or db_path())

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def create_tables(self) -> None:
        with self._conn() as conn:
            conn.executescript(SQL_SCHEMA)

    # ── Tracks ─────────────────────────────────────────────────────────────

    def create_track(self, track_id: str, original_path: str, status: str = "uploaded") -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO tracks (id, original_path, status) VALUES (?, ?, ?)",
                (track_id, original_path, status),
            )

    def get_track(self, track_id: str) -> Optional[dict]:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
            return dict(row) if row else None

    def list_tracks(self) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute("SELECT * FROM tracks ORDER BY created_at DESC").fetchall()
            return [dict(r) for r in rows]

    def update_status(self, track_id: str, status: str, error_message: Optional[str] = None) -> None:
        with self._conn() as conn:
            conn.execute(
                "UPDATE tracks SET status = ?, error_message = ?, updated_at = datetime('now') WHERE id = ?",
                (status, error_message, track_id),
            )

    def update_stems(self, track_id: str, inst_path: str, vox_path: str) -> None:
        with self._conn() as conn:
            conn.execute(
                "UPDATE tracks SET inst_path = ?, vox_path = ?, updated_at = datetime('now') WHERE id = ?",
                (inst_path, vox_path, track_id),
            )

    def update_track_metadata(self, track_id: str, **kwargs) -> None:
        sets = ", ".join(f"{k} = ?" for k in kwargs)
        vals = list(kwargs.values()) + [track_id]
        with self._conn() as conn:
            conn.execute(
                f"UPDATE tracks SET {sets}, updated_at = datetime('now') WHERE id = ?",
                vals,
            )

    # ── Timelines ──────────────────────────────────────────────────────────

    def upsert_timeline(
        self, track_id: str, beats_json: str, rms_json: str,
        onsets_json: Optional[str], hop_length: int = 512,
    ) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO timelines (track_id, beats_json, rms_json, onsets_json, hop_length) VALUES (?, ?, ?, ?, ?)",
                (track_id, beats_json, rms_json, onsets_json, hop_length),
            )

    def get_timeline(self, track_id: str) -> Optional[dict]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM timelines WHERE track_id = ?", (track_id,)
            ).fetchone()
            return dict(row) if row else None

    # ── Vocal Segments ─────────────────────────────────────────────────────

    def insert_vocal_segment(
        self, track_id: str, segment_idx: int, start: float, end: float,
        text: str, confidence: float, words_json: Optional[str],
    ) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO vocal_segments (track_id, segment_idx, start_time, end_time, text, confidence, words_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (track_id, segment_idx, start, end, text, confidence, words_json),
            )

    def get_vocal_segments(self, track_id: str) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM vocal_segments WHERE track_id = ? ORDER BY segment_idx",
                (track_id,),
            ).fetchall()
            return [dict(r) for r in rows]

    def delete_vocal_segments(self, track_id: str) -> None:
        with self._conn() as conn:
            conn.execute("DELETE FROM vocal_segments WHERE track_id = ?", (track_id,))

    # ── Candidates ─────────────────────────────────────────────────────────

    def insert_candidate(
        self, track_id: str, candidate_idx: int, rank: int,
        start: float, end: float, score: int, attack: int,
        ending: int, energy: int, vocal_overlap: bool, is_best: bool,
    ) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO candidates (track_id, candidate_idx, rank, start_time, end_time, score, attack, ending, energy, vocal_overlap, is_best) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (track_id, candidate_idx, rank, start, end, score, attack, ending, energy, int(vocal_overlap), int(is_best)),
            )

    def get_candidates(self, track_id: str) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM candidates WHERE track_id = ? ORDER BY rank",
                (track_id,),
            ).fetchall()
            return [dict(r) for r in rows]

    def delete_candidates(self, track_id: str) -> None:
        with self._conn() as conn:
            conn.execute("DELETE FROM candidates WHERE track_id = ?", (track_id,))
