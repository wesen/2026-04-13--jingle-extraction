"""Tests for presets, tracks, generation runs, and analysis status responses."""

from pathlib import Path


def test_get_presets(client):
    resp = client.get("/api/presets")
    assert resp.status_code == 200
    data = resp.json()
    assert "Default" in data
    assert "Short Stings" in data
    assert "Long Beds" in data
    assert "Vocal Hooks" in data
    assert data["Default"]["vocal_mode"] == "inst"
    assert data["Default"]["candidate_mode"] == "rhythmic"
    assert data["Vocal Hooks"]["vocal_mode"] == "vocal"
    assert data["Vocal Hooks"]["candidate_mode"] == "lyric_aligned"
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


def test_get_track_audio_returns_stem_file(client, test_db, tmp_path):
    track_id = "audio_track"
    test_db.create_track(track_id, "/tmp/audio_track.mp3", status="complete")
    track_dir = tmp_path / "tracks" / track_id
    track_dir.mkdir(parents=True, exist_ok=True)
    stem_file = track_dir / "inst.mp3"
    stem_file.write_bytes(b"fake mp3 data")

    resp = client.get(f"/api/tracks/{track_id}/audio/inst")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "audio/mpeg"
    assert resp.content == b"fake mp3 data"


def test_get_track_audio_returns_404_for_missing_stem(client, test_db):
    track_id = "missing_stem_track"
    test_db.create_track(track_id, "/tmp/missing.mp3", status="complete")

    resp = client.get(f"/api/tracks/{track_id}/audio/orig")
    assert resp.status_code == 404


def test_create_generation_run_and_detail(client, test_db, monkeypatch, tmp_path):
    def fake_minimax_generate(*, out_path: Path, **_kwargs):
        out_path.write_bytes(b"fake generated mp3")
        return out_path

    monkeypatch.setattr(
        "app.services.generation_service.call_minimax_generate",
        fake_minimax_generate,
    )

    resp = client.post(
        "/api/generations",
        json={
            "prompt": "Death/thrash metal stings with a chantable hook",
            "lyrics": "[Hook] spinning power / burning fast",
            "model": "music-2.6",
            "count": 2,
            "mode": "vocal",
            "namingPrefix": "thrash_hook",
        },
    )

    assert resp.status_code == 202
    accepted = resp.json()
    run_id = accepted["generation_id"]
    assert accepted["status"] == "queued"
    assert accepted["count_requested"] == 2

    detail = client.get(f"/api/generations/{run_id}")
    assert detail.status_code == 200
    data = detail.json()
    assert data["id"] == run_id
    assert data["status"] == "complete"
    assert data["countRequested"] == 2
    assert data["countCompleted"] == 2
    assert len(data["tracks"]) == 2
    assert all(track["source_type"] == "generated" for track in data["tracks"])
    assert all(track["generation_status"] == "generated" for track in data["tracks"])
    assert all(track["analysis_status"] == "not_started" for track in data["tracks"])

    runs = client.get("/api/generations")
    assert runs.status_code == 200
    listed = runs.json()
    assert listed[0]["id"] == run_id


def test_library_tracks_returns_generated_and_imported_rows(client, test_db, tmp_path):
    imported_path = tmp_path / "imports" / "upload_take_03.mp3"
    imported_path.parent.mkdir(parents=True, exist_ok=True)
    imported_path.write_bytes(b"imported")
    test_db.create_track(
        "upload_take_03",
        str(imported_path),
        status="complete",
        display_name="upload_take_03",
        source_type="imported",
    )

    generated_path = tmp_path / "tracks" / "thrash_hook_01" / "orig.mp3"
    generated_path.parent.mkdir(parents=True, exist_ok=True)
    generated_path.write_bytes(b"generated")
    test_db.create_track(
        "thrash_hook_01",
        str(generated_path),
        status="not_started",
        display_name="thrash_hook_01",
        source_type="generated",
        generation_status="generated",
        generation_run_id="gen_001",
        variant_index=1,
        prompt_snapshot="thrash prompt",
        lyrics_snapshot="[Hook] Yow",
        minimax_model="music-2.6",
        instrumental_requested=False,
    )

    resp = client.get("/api/library/tracks?source=generated")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == "thrash_hook_01"
    assert data[0]["source_type"] == "generated"
    assert data[0]["generation_status"] == "generated"
    assert data[0]["analysis_status"] == "not_started"


def test_track_centric_analyze_uses_track_id(client, test_db, monkeypatch, tmp_path, default_config):
    audio_path = tmp_path / "tracks" / "generated_track" / "orig.mp3"
    audio_path.parent.mkdir(parents=True, exist_ok=True)
    audio_path.write_bytes(b"audio")

    test_db.create_track(
        "generated_track",
        str(audio_path),
        status="not_started",
        display_name="generated_track",
        source_type="generated",
        generation_status="generated",
    )

    calls = []

    async def fake_run_pipeline(track_id, audio_file, config):
        calls.append((track_id, audio_file, config))

    monkeypatch.setattr("app.routes.tracks._get_run_pipeline", lambda: fake_run_pipeline)

    resp = client.post(
        "/api/library/tracks/generated_track/analyze",
        json={"config": default_config},
    )

    assert resp.status_code == 202
    data = resp.json()
    assert data["track_id"] == "generated_track"
    assert data["status"] == "uploaded"
    assert calls[0][0] == "generated_track"
    assert calls[0][1] == str(audio_path)

    track = test_db.get_track("generated_track")
    assert track["analysis_status"] == "uploaded"


def test_mine_returns_lyric_aligned_candidates_without_rerunning_pipeline(client, test_db):
    track_id = "lyric_track"
    test_db.create_track(track_id, "/tmp/lyric_track.mp3", status="complete")
    test_db.update_track_metadata(
        track_id,
        duration=30.0,
        bpm=120.0,
        language="en",
        lang_conf=0.9,
        sr=100,
        dr_db=12.0,
    )
    test_db.upsert_timeline(
        track_id,
        beats_json="[0.0, 1.0, 2.0, 3.0]",
        rms_json="[3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0]",
        onsets_json="[10.0, 20.0]",
        hop_length=100,
    )
    test_db.insert_vocal_segment(
        track_id,
        segment_idx=1,
        start=10.0,
        end=10.3,
        text="Yow!",
        confidence=0.9,
        words_json='[{"word": "Yow!", "start": 10.0, "end": 10.3}]',
    )
    test_db.insert_vocal_segment(
        track_id,
        segment_idx=2,
        start=20.0,
        end=20.8,
        text="Burning fast!",
        confidence=0.9,
        words_json='[{"word": "Burning", "start": 20.0, "end": 20.4}, {"word": "fast!", "start": 20.45, "end": 20.8}]',
    )

    resp = client.post(
        "/api/mine",
        json={
            "trackId": track_id,
            "config": {
                "min_dur": 2.0,
                "max_dur": 4.5,
                "min_score": 0,
                "vocal_mode": "vocal",
                "candidate_mode": "lyric_aligned",
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
            },
        },
    )

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert all(cand["vocal_overlap"] for cand in data)
    assert all(cand["source_kind"] == "lyric_segment" for cand in data)
    assert all(cand["source_segment_id"] is not None for cand in data)
    assert all(cand["source_text"] for cand in data)
    assert all(cand["phrase_score"] is not None for cand in data)

    short_phrase_candidate = next(
        cand for cand in data if cand["start"] <= 10.0 and cand["end"] >= 10.3
    )
    assert short_phrase_candidate["end"] - short_phrase_candidate["start"] >= 2.0
    assert short_phrase_candidate["source_text"] == "Yow!"
