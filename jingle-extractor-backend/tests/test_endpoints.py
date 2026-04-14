"""Tests for GET /api/presets and GET /api/tracks."""


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
