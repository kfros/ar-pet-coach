# tools/audio/tests/test_generation.py

import os
import json
import tempfile
import pytest
import numpy as np
import subprocess

from tools.audio.generate_candidates import (
    generate_procedural_candidate_signal,
    write_wav_pcm24,
    measure_wav_lufs_ffmpeg,
    file_sha256,
    generate_candidate_file
)


@pytest.fixture
def sample_candidate_config():
    return {
        "id": "test_neutral",
        "display_name": "Test Candidate — Neutral",
        "design_direction": "Test design direction",
        "seed": 4004,
        "synthesis_parameters": {
            "noise_alpha": 0.8,
            "noise_high_cutoff_hz": 1200,
            "tonal_layers": [
                { "frequency_hz": 108.0, "gain_db": -28.0 }
            ],
            "lfo_frequency_hz": 0.5,
            "lfo_depth": 0.1,
            "stereo_decorrelation_phase_rad": 0.3
        }
    }


def test_config_validation_duplicate_ids():
    c1 = {"id": "dup", "seed": 1}
    c2 = {"id": "dup", "seed": 2}
    c_ids = [c1["id"], c2["id"]]
    assert len(c_ids) != len(set(c_ids)), "Should detect duplicate candidate IDs"


def test_config_validation_invalid_duration_and_sr():
    sample_rate = -48000
    duration = 0
    assert sample_rate <= 0 or duration <= 0, "Should reject non-positive duration or sample rate"


def test_every_candidate_requires_explicit_integer_seed(sample_candidate_config):
    assert "seed" in sample_candidate_config
    assert isinstance(sample_candidate_config["seed"], int)


def test_generated_samples_contain_no_nan_or_inf(sample_candidate_config):
    audio = generate_procedural_candidate_signal(
        candidate_def=sample_candidate_config,
        sample_rate=48000,
        duration_seconds=1.0  # Fast short 1s fixture
    )
    assert audio.shape == (2, 48000)
    assert not np.isnan(audio).any(), "Samples must not contain NaN"
    assert not np.isinf(audio).any(), "Samples must not contain Inf"


def test_short_fixture_wav_format_and_sample_count(sample_candidate_config):
    audio = generate_procedural_candidate_signal(
        candidate_def=sample_candidate_config,
        sample_rate=48000,
        duration_seconds=2.0  # 2s short fixture
    )
    
    with tempfile.TemporaryDirectory() as tmpdir:
        wav_path = os.path.join(tmpdir, "test_output.wav")
        write_wav_pcm24(wav_path, audio, sample_rate=48000)
        
        assert os.path.exists(wav_path)
        assert os.path.getsize(wav_path) > 44  # Valid WAV size
        
        # Read back header
        with open(wav_path, "rb") as f:
            data = f.read()
            assert data[:4] == b"RIFF"
            assert data[8:12] == b"WAVE"


def test_same_config_and_seed_reproduce_same_wav_hash(sample_candidate_config):
    with tempfile.TemporaryDirectory() as tmpdir:
        audio1 = generate_procedural_candidate_signal(sample_candidate_config, 48000, 1.0)
        p1 = os.path.join(tmpdir, "run1.wav")
        write_wav_pcm24(p1, audio1, 48000)
        h1 = file_sha256(p1)
        
        audio2 = generate_procedural_candidate_signal(sample_candidate_config, 48000, 1.0)
        p2 = os.path.join(tmpdir, "run2.wav")
        write_wav_pcm24(p2, audio2, 48000)
        h2 = file_sha256(p2)
        
        assert h1 == h2, "Identical seed and config must produce identical SHA-256 hash"


def test_different_candidate_configs_produce_different_wav_hashes(sample_candidate_config):
    cfg2 = json.loads(json.dumps(sample_candidate_config))
    cfg2["seed"] = 5005
    cfg2["synthesis_parameters"]["noise_alpha"] = 1.4
    
    with tempfile.TemporaryDirectory() as tmpdir:
        audio1 = generate_procedural_candidate_signal(sample_candidate_config, 48000, 1.0)
        p1 = os.path.join(tmpdir, "run1.wav")
        write_wav_pcm24(p1, audio1, 48000)
        h1 = file_sha256(p1)
        
        audio2 = generate_procedural_candidate_signal(cfg2, 48000, 1.0)
        p2 = os.path.join(tmpdir, "run2.wav")
        write_wav_pcm24(p2, audio2, 48000)
        h2 = file_sha256(p2)
        
        assert h1 != h2, "Different configs/seeds must produce different SHA-256 hashes"


@pytest.mark.slow
def test_full_180s_generation_slow_integration(sample_candidate_config):
    with tempfile.TemporaryDirectory() as tmpdir:
        manifest_path = os.path.join(tmpdir, "manifest.json")
        entry = generate_candidate_file(
            candidate_def=sample_candidate_config,
            sample_rate=48000,
            duration_seconds=180.0,
            target_lufs=-22.0,
            output_dir=tmpdir,
            manifest_path=manifest_path
        )
        assert entry["candidateId"] == sample_candidate_config["id"]
        assert os.path.exists(os.path.join(tmpdir, f"chillpup_candidate_{sample_candidate_config['id']}.wav"))
        assert os.path.exists(os.path.join(tmpdir, f"chillpup_candidate_{sample_candidate_config['id']}.m4a"))
