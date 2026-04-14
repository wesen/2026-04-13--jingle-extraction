"""Shared test fixtures."""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path

from app.database import Database


@pytest.fixture(autouse=True)
def test_db(tmp_path, monkeypatch):
    """Use a temporary database and data dir for each test."""
    import app.config as config

    monkeypatch.setattr(config, "DATA_DIR", tmp_path)
    monkeypatch.setattr(config, "db_path", lambda: tmp_path / "test.db")

    db = Database(tmp_path / "test.db")
    db.create_tables()

    # Patch Database default path so routes that do Database() use test DB
    monkeypatch.setattr(
        "app.database.Database.__init__",
        lambda self, path=None: setattr(self, "db_path", str(tmp_path / "test.db")),
    )

    yield db


@pytest.fixture
def client():
    from app.main import app

    return TestClient(app)


@pytest.fixture
def default_config():
    return {
        "min_dur": 2.0,
        "max_dur": 4.5,
        "min_score": 75,
        "vocal_mode": "inst",
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
