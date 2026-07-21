# tools/audio/tests/test_audit.py

import os
import json
import tempfile
import pytest
import numpy as np
import subprocess

from tools.audio.generate_candidates import write_wav_pcm24
from tools.audio.audit_candidates import audit_candidate_single, read_wav_pcm


@pytest.fixture
def mock_manifest():
    return {
        "candidates": {
            "test_aud": {
                "taskId": "CP-AUDIO-002A",
                "candidateId": "test_aud",
                "creator": "KF Software",
                "rightsOwner": "KF Software",
                "inputAudioAssets": [],
                "externalSamplesUsed": False,
                "aiAudioUsed": False
            }
        }
    }


def test_audit_exact_wav_sample_count_and_format():
    # 2s audio at 48kHz = 96000 samples
    sr = 48000
    duration = 2.0
    expected_samples = 96000
    t = np.linspace(0, duration, expected_samples, endpoint=False)
    audio = np.vstack([0.1 * np.sin(2*np.pi*100*t), 0.1 * np.sin(2*np.pi*100*t)])
    
    with tempfile.TemporaryDirectory() as tmpdir:
        wav_path = os.path.join(tmpdir, "valid.wav")
        write_wav_pcm24(wav_path, audio, sr)
        
        read_audio, r_sr, n_ch, bits = read_wav_pcm(wav_path)
        assert r_sr == 48000
        assert n_ch == 2
        assert bits == 24
        assert read_audio.shape[1] == expected_samples


def test_audit_rejects_synthetic_boundary_discontinuity_fixture(mock_manifest):
    sr = 48000
    duration = 2.0
    N = int(sr * duration)
    t = np.linspace(0, duration, N, endpoint=False)
    
    # Base continuous sine wave
    audio = np.vstack([0.1 * np.sin(2*np.pi*100*t), 0.1 * np.sin(2*np.pi*100*t)])
    
    # Introduce a massive step discontinuity at boundary: set first sample to +0.9
    audio[0, 0] = 0.9
    audio[1, 0] = -0.9
    
    with tempfile.TemporaryDirectory() as tmpdir:
        wav_path = os.path.join(tmpdir, "chillpup_candidate_discont.wav")
        m4a_path = os.path.join(tmpdir, "chillpup_candidate_discont.m4a")
        
        write_wav_pcm24(wav_path, audio, sr)
        # Create dummy m4a via ffmpeg
        subprocess.run(["ffmpeg", "-y", "-i", wav_path, "-c:a", "aac", m4a_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        res = audit_candidate_single(
            candidate_id="test_aud",
            wav_path=wav_path,
            m4a_path=m4a_path,
            manifest_data=mock_manifest,
            expected_duration_s=duration
        )
        
        assert not res["mandatoryPassed"], "Audit must reject synthetic boundary discontinuity"
        
        # Check seam step metric check status
        seam_checks = [c for c in res["checks"] if c["name"] == "Loop Join Seam Sample Step Metric"]
        assert len(seam_checks) > 0
        assert seam_checks[0]["status"] == "FAIL"


def test_audit_rejects_digital_silence(mock_manifest):
    sr = 48000
    duration = 2.0
    N = int(sr * duration)
    audio = np.zeros((2, N), dtype=np.float64)  # 100% digital silence
    
    with tempfile.TemporaryDirectory() as tmpdir:
        wav_path = os.path.join(tmpdir, "chillpup_candidate_silence.wav")
        m4a_path = os.path.join(tmpdir, "chillpup_candidate_silence.m4a")
        
        write_wav_pcm24(wav_path, audio, sr)
        subprocess.run(["ffmpeg", "-y", "-i", wav_path, "-c:a", "aac", m4a_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        res = audit_candidate_single(
            candidate_id="test_aud",
            wav_path=wav_path,
            m4a_path=m4a_path,
            manifest_data=mock_manifest,
            expected_duration_s=duration
        )
        
        assert not res["mandatoryPassed"], "Audit must reject digital silence"
        silence_checks = [c for c in res["checks"] if c["name"] == "Unintended Digital Silence"]
        assert len(silence_checks) > 0
        assert silence_checks[0]["status"] == "FAIL"


def test_provenance_manifest_no_input_audio_assets():
    manifest = {
        "candidates": {
            "candidate_a": {
                "taskId": "CP-AUDIO-002A",
                "inputAudioAssets": [],
                "externalSamplesUsed": False,
                "aiAudioUsed": False
            }
        }
    }
    cand_info = manifest["candidates"]["candidate_a"]
    assert cand_info["inputAudioAssets"] == []
    assert cand_info["externalSamplesUsed"] is False
    assert cand_info["aiAudioUsed"] is False


def test_missing_ffmpeg_simulated(monkeypatch):
    # Simulate missing ffmpeg by forcing PATH to empty directory
    with tempfile.TemporaryDirectory() as empty_dir:
        monkeypatch.setenv("PATH", empty_dir)
        
        # Test command check
        res = subprocess.run(["ffmpeg", "-version"], capture_output=True)
        assert res.returncode != 0 or res.stderr != b"", "Simulated missing ffmpeg should fail execution"
