"""Tests for GET /api/presets, GET /api/tracks, and analysis status responses."""


def test_get_presets(client):
    resp = client.get("/api/presets")
    assert resp.status_code == 200
    data = resp.json()
    assert "Default" in data
    assert "Short Stings" in data
    assert "Long Beds" in data
    assert "Vocal Hooks" in data
    assert data["Default"]["vocal_mode"] == "inst"
    assert data["Vocal Hooks"]["vocal_mode"] == "vocal"
    assert data["Long Beds"]["br"] is None


def test_list_tracks_empty(client):
    resp = client.get("/api/tracks")
    assert resp.status_code == 200
    assert resp.json() == []


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


def test_analyze_file_not_found(client, default_config):
    resp = client.post(
        "/api/analyze",
        json={"audio_file": "/nonexistent/file.mp3", "config": default_config},
    )
    assert resp.status_code == 404


def test_analysis_not_found(client):
    resp = client.get("/api/analysis/nonexistent_track")
    assert resp.status_code == 404


def test_analysis_returns_202_for_in_progress_track(client, test_db):
    test_db.create_track("pending_track", "/tmp/pending.mp3", status="uploaded")

    resp = client.get("/api/analysis/pending_track")
    assert resp.status_code == 202
    data = resp.json()
    assert data["track_id"] == "pending_track"
    assert data["status"] == "uploaded"
    assert data["error_message"] is None


def test_analysis_returns_202_for_failed_track(client, test_db):
    test_db.create_track("failed_track", "/tmp/failed.mp3", status="uploaded")
    test_db.update_status("failed_track", "failed", error_message="pipeline exploded")

    resp = client.get("/api/analysis/failed_track")
    assert resp.status_code == 202
    data = resp.json()
    assert data["track_id"] == "failed_track"
    assert data["status"] == "failed"
    assert data["error_message"] == "pipeline exploded"
