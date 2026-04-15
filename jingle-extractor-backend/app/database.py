"""
SQLite database wrapper for the Jingle Extractor backend.
Uses WAL mode for concurrent reads, sync connections for simplicity.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Optional

from app.config import db_path

SQL_SCHEMA = """
CREATE TABLE IF NOT EXISTS generation_runs (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    prompt          TEXT NOT NULL,
    lyrics          TEXT,
    model           TEXT NOT NULL,
    mode            TEXT NOT NULL,
    count_requested INTEGER NOT NULL,
    count_completed INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL,
    error_message   TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tracks (
    id              TEXT PRIMARY KEY,
    display_name    TEXT,
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
    analysis_status TEXT DEFAULT 'uploaded',
    generation_status TEXT,
    source_type     TEXT DEFAULT 'imported',
    generation_run_id TEXT,
    variant_index   INTEGER,
    prompt_snapshot TEXT,
    lyrics_snapshot TEXT,
    minimax_model   TEXT,
    instrumental_requested INTEGER,
    decision        TEXT DEFAULT 'pending',
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
    phrase_score    INTEGER,
    vocal_overlap   INTEGER DEFAULT 0,
    is_best         INTEGER DEFAULT 0,
    source_kind     TEXT,
    source_segment_idx INTEGER,
    source_text     TEXT,
    source_start    REAL,
    source_end      REAL,
    config_hash     TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

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
            self._ensure_track_columns(conn)
            self._ensure_candidate_columns(conn)
            self._ensure_indexes(conn)

    def _ensure_track_columns(self, conn: sqlite3.Connection) -> None:
        existing = {row["name"] for row in conn.execute("PRAGMA table_info(tracks)").fetchall()}
        additions = {
            "display_name": "TEXT",
            "analysis_status": "TEXT DEFAULT 'uploaded'",
            "generation_status": "TEXT",
            "source_type": "TEXT DEFAULT 'imported'",
            "generation_run_id": "TEXT",
            "variant_index": "INTEGER",
            "prompt_snapshot": "TEXT",
            "lyrics_snapshot": "TEXT",
            "minimax_model": "TEXT",
            "instrumental_requested": "INTEGER",
            "decision": "TEXT DEFAULT 'pending'",
        }
        for column, col_type in additions.items():
            if column not in existing:
                conn.execute(f"ALTER TABLE tracks ADD COLUMN {column} {col_type}")

        if "analysis_status" in existing:
            conn.execute(
                "UPDATE tracks SET analysis_status = COALESCE(analysis_status, status, 'uploaded')"
            )
        else:
            conn.execute("UPDATE tracks SET analysis_status = status")

    def _ensure_candidate_columns(self, conn: sqlite3.Connection) -> None:
        existing = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(candidates)").fetchall()
        }
        additions = {
            "phrase_score": "INTEGER",
            "source_kind": "TEXT",
            "source_segment_idx": "INTEGER",
            "source_text": "TEXT",
            "source_start": "REAL",
            "source_end": "REAL",
        }
        for column, col_type in additions.items():
            if column not in existing:
                conn.execute(f"ALTER TABLE candidates ADD COLUMN {column} {col_type}")

    def _ensure_indexes(self, conn: sqlite3.Connection) -> None:
        conn.execute("CREATE INDEX IF NOT EXISTS idx_candidates_track ON candidates(track_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_vocal_segments_track ON vocal_segments(track_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tracks_analysis_status ON tracks(analysis_status)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tracks_generation_run ON tracks(generation_run_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_generation_runs_status ON generation_runs(status)")

    # ── Generation runs ───────────────────────────────────────────────────

    def create_generation_run(
        self,
        run_id: str,
        *,
        name: str,
        prompt: str,
        lyrics: Optional[str],
        model: str,
        mode: str,
        count_requested: int,
        status: str,
        error_message: Optional[str] = None,
    ) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO generation_runs
                    (id, name, prompt, lyrics, model, mode, count_requested, count_completed, status, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
                """,
                (run_id, name, prompt, lyrics, model, mode, count_requested, status, error_message),
            )

    def get_generation_run(self, run_id: str) -> Optional[dict[str, Any]]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM generation_runs WHERE id = ?", (run_id,)
            ).fetchone()
            return dict(row) if row else None

    def list_generation_runs(self) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM generation_runs ORDER BY created_at DESC"
            ).fetchall()
            return [dict(r) for r in rows]

    def update_generation_run(self, run_id: str, **kwargs: Any) -> None:
        if not kwargs:
            return
        sets = ", ".join(f"{k} = ?" for k in kwargs)
        vals = list(kwargs.values()) + [run_id]
        with self._conn() as conn:
            conn.execute(
                f"UPDATE generation_runs SET {sets}, updated_at = datetime('now') WHERE id = ?",
                vals,
            )

    def increment_generation_run_completed(self, run_id: str) -> None:
        with self._conn() as conn:
            conn.execute(
                "UPDATE generation_runs SET count_completed = count_completed + 1, updated_at = datetime('now') WHERE id = ?",
                (run_id,),
            )

    # ── Tracks ─────────────────────────────────────────────────────────────

    def create_track(
        self,
        track_id: str,
        original_path: str,
        status: str = "uploaded",
        *,
        display_name: Optional[str] = None,
        source_type: str = "imported",
        generation_status: Optional[str] = None,
        generation_run_id: Optional[str] = None,
        variant_index: Optional[int] = None,
        prompt_snapshot: Optional[str] = None,
        lyrics_snapshot: Optional[str] = None,
        minimax_model: Optional[str] = None,
        instrumental_requested: Optional[bool] = None,
        decision: str = "pending",
    ) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO tracks
                    (id, display_name, original_path, status, analysis_status, source_type, generation_status,
                     generation_run_id, variant_index, prompt_snapshot, lyrics_snapshot, minimax_model,
                     instrumental_requested, decision)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    track_id,
                    display_name or track_id,
                    original_path,
                    status,
                    status,
                    source_type,
                    generation_status,
                    generation_run_id,
                    variant_index,
                    prompt_snapshot,
                    lyrics_snapshot,
                    minimax_model,
                    int(instrumental_requested) if instrumental_requested is not None else None,
                    decision,
                ),
            )

    def get_track(self, track_id: str) -> Optional[dict[str, Any]]:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
            return dict(row) if row else None

    def list_tracks(self) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute("SELECT * FROM tracks ORDER BY created_at DESC").fetchall()
            return [dict(r) for r in rows]

    def list_tracks_for_generation_run(self, run_id: str) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM tracks WHERE generation_run_id = ? ORDER BY variant_index ASC, created_at ASC",
                (run_id,),
            ).fetchall()
            return [dict(r) for r in rows]

    def list_library_tracks(self) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM tracks ORDER BY created_at DESC"
            ).fetchall()
            return [dict(r) for r in rows]

    def update_status(self, track_id: str, status: str, error_message: Optional[str] = None) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                UPDATE tracks
                SET status = ?, analysis_status = ?, error_message = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (status, status, error_message, track_id),
            )

    def update_stems(self, track_id: str, inst_path: str, vox_path: str) -> None:
        with self._conn() as conn:
            conn.execute(
                "UPDATE tracks SET inst_path = ?, vox_path = ?, updated_at = datetime('now') WHERE id = ?",
                (inst_path, vox_path, track_id),
            )

    def update_track_metadata(self, track_id: str, **kwargs: Any) -> None:
        if not kwargs:
            return
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

    def get_timeline(self, track_id: str) -> Optional[dict[str, Any]]:
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

    def get_vocal_segments(self, track_id: str) -> list[dict[str, Any]]:
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
        phrase_score: Optional[int] = None,
        source_kind: Optional[str] = None,
        source_segment_idx: Optional[int] = None,
        source_text: Optional[str] = None,
        source_start: Optional[float] = None,
        source_end: Optional[float] = None,
    ) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO candidates (track_id, candidate_idx, rank, start_time, end_time, score, attack, ending, energy, phrase_score, vocal_overlap, is_best, source_kind, source_segment_idx, source_text, source_start, source_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    track_id,
                    candidate_idx,
                    rank,
                    start,
                    end,
                    score,
                    attack,
                    ending,
                    energy,
                    phrase_score,
                    int(vocal_overlap),
                    int(is_best),
                    source_kind,
                    source_segment_idx,
                    source_text,
                    source_start,
                    source_end,
                ),
            )

    def get_candidates(self, track_id: str) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM candidates WHERE track_id = ? ORDER BY rank",
                (track_id,),
            ).fetchall()
            return [dict(r) for r in rows]

    def delete_candidates(self, track_id: str) -> None:
        with self._conn() as conn:
            conn.execute("DELETE FROM candidates WHERE track_id = ?", (track_id,))
