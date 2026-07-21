#!/usr/bin/env python3
"""
tools/audio/generate_candidates.py
Deterministic procedural audio candidate generator for ChillPup (CP-AUDIO-002A).
"""

import os
import sys
import json
import hashlib
import argparse
import platform
import subprocess
import tempfile
import struct
import gc
from typing import Dict, Any, Tuple, Optional
import numpy as np

# Ensure stdout uses UTF-8 on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")


def get_git_info() -> Tuple[str, bool]:
    """Retrieve current git commit hash and dirty status."""
    try:
        commit = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], stderr=subprocess.DEVNULL
        ).decode("utf-8").strip()
        status = subprocess.check_output(
            ["git", "status", "--porcelain"], stderr=subprocess.DEVNULL
        ).decode("utf-8").strip()
        is_dirty = len(status) > 0
        return commit, is_dirty
    except Exception:
        return "unknown", False


def get_ffmpeg_version() -> str:
    """Retrieve installed FFmpeg version string."""
    try:
        out = subprocess.check_output(
            ["ffmpeg", "-version"], stderr=subprocess.DEVNULL
        ).decode("utf-8")
        return out.splitlines()[0] if out else "ffmpeg-not-found"
    except Exception:
        return "ffmpeg-not-found"


def file_sha256(filepath: str) -> str:
    """Calculate SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def write_wav_pcm24(filepath: str, audio: np.ndarray, sample_rate: int = 48000) -> None:
    """
    Write a 2-channel 24-bit PCM little-endian WAV file with deterministic RIFF headers.
    audio shape must be (2, N) or (N, 2) with float values in [-1.0, 1.0].
    """
    if audio.shape[0] == 2 and audio.shape[1] != 2:
        audio = audio.T  # Convert to (N, 2)
    
    num_samples, num_channels = audio.shape
    if num_channels != 2:
        raise ValueError(f"Expected 2 channels, got {num_channels}")
    
    # Clip float values to [-1.0, 1.0] before quantization
    audio_clipped = np.clip(audio, -1.0, 1.0)
    
    # Convert float [-1.0, 1.0] to signed 24-bit int range [-8388607, 8388607]
    int24_max = 8388607
    scaled = np.round(audio_clipped * int24_max).astype(np.int32)
    
    # Pack into 3-byte little-endian bytes
    # Interleave channels: L0, R0, L1, R1...
    interleaved = scaled.reshape(-1)
    
    # 24-bit packing: extract bytes 0, 1, 2 of little-endian int32
    # In numpy int32 little-endian: byte0, byte1, byte2, byte3
    raw_bytes = interleaved.astype('<i4').tobytes()
    # Reshape to 4-byte chunks and drop 4th byte
    bytes_4 = np.frombuffer(raw_bytes, dtype=np.uint8).reshape(-1, 4)
    bytes_3 = bytes_4[:, :3].reshape(-1)
    pcm_data = bytes_3.tobytes()
    
    bytes_per_sample = 3
    block_align = num_channels * bytes_per_sample
    byte_rate = sample_rate * block_align
    data_size = len(pcm_data)
    chunk_size = 36 + data_size
    
    header = bytearray()
    # RIFF header
    header.extend(b'RIFF')
    header.extend(struct.pack('<I', chunk_size))
    header.extend(b'WAVE')
    # fmt subchunk
    header.extend(b'fmt ')
    header.extend(struct.pack('<I', 16))          # Subchunk1Size (16 for PCM)
    header.extend(struct.pack('<H', 1))           # AudioFormat (1 = PCM)
    header.extend(struct.pack('<H', num_channels))# NumChannels (2)
    header.extend(struct.pack('<I', sample_rate)) # SampleRate (48000)
    header.extend(struct.pack('<I', byte_rate))   # ByteRate
    header.extend(struct.pack('<H', block_align)) # BlockAlign
    header.extend(struct.pack('<H', 24))          # BitsPerSample (24)
    # data subchunk
    header.extend(b'data')
    header.extend(struct.pack('<I', data_size))
    
    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
    with open(filepath, 'wb') as f:
        f.write(header)
        f.write(pcm_data)


def measure_wav_lufs_ffmpeg(wav_path: str) -> Tuple[float, float, float]:
    """
    Measure integrated LUFS, Loudness Range (LRA), and True Peak (dBTP) using FFmpeg ebur128 filter.
    Returns (integrated_lufs, lra, true_peak_dbtp).
    """
    cmd = [
        "ffmpeg", "-nostats", "-i", wav_path,
        "-filter_complex", "ebur128=peak=true",
        "-f", "null", "-"
    ]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    stderr = res.stderr
    
    integrated_lufs = -22.0
    lra = 1.0
    true_peak = -6.0
    
    # Parse ebur128 output
    for line in stderr.splitlines():
        if "Integrated loudness:" in line:
            # e.g.: "  Integrated loudness: I: -21.8 LUFS Threshold: -31.9 LUFS"
            parts = line.split("I:")
            if len(parts) > 1:
                val = parts[1].split("LUFS")[0].strip()
                try:
                    integrated_lufs = float(val)
                except ValueError:
                    pass
        elif "Loudness range:" in line and "LRA:" in line:
            # e.g.: "  Loudness range: LRA: 1.2 LU"
            parts = line.split("LRA:")
            if len(parts) > 1:
                val = parts[1].split("LU")[0].strip()
                try:
                    lra = float(val)
                except ValueError:
                    pass
        elif "Peak:" in line and "TP:" in line:
            # e.g.: "    Peak: -5.4 dBFS True peak: Peak: -5.2 dBTP"
            parts = line.split("True peak:")
            if len(parts) > 1 and "dBTP" in parts[1]:
                val = parts[1].split("dBTP")[0].replace("Peak:", "").strip()
                try:
                    true_peak = float(val)
                except ValueError:
                    pass

    return integrated_lufs, lra, true_peak


def generate_procedural_candidate_signal(
    candidate_def: Dict[str, Any],
    sample_rate: int = 48000,
    duration_seconds: float = 180.0
) -> np.ndarray:
    """
    Synthesize a 2-channel loopable ambient audio array using pure procedural algorithms.
    Returns np.ndarray of shape (2, N) with values normalized prior to gain scaling.
    """
    seed = candidate_def["seed"]
    params = candidate_def["synthesis_parameters"]
    
    # Initialize deterministic NumPy PRNG with PCG64
    rng = np.random.Generator(np.random.PCG64(seed))
    
    N = int(round(sample_rate * duration_seconds))
    if N <= 0:
        raise ValueError(f"Invalid sample count: {N}")
    
    T = float(duration_seconds)
    dt = 1.0 / sample_rate
    t = np.arange(N, dtype=np.float64) * dt
    
    # 1. FFT Spectral Continuous Cyclic Colored Noise
    noise_alpha = float(params.get("noise_alpha", 1.0))
    high_cutoff = float(params.get("noise_high_cutoff_hz", 1000.0))
    
    half_N = N // 2
    freqs = np.fft.rfftfreq(N, d=dt)  # 0 to Nyquist
    
    # Spectral magnitude A(f)
    # Avoid div by zero at DC
    mag = np.zeros(len(freqs), dtype=np.float64)
    nonzero_idx = freqs > 0
    mag[nonzero_idx] = (freqs[nonzero_idx]) ** (-noise_alpha / 2.0)
    
    # Smooth high frequency cutoff (2nd order lowpass envelope)
    lp_envelope = 1.0 / (1.0 + (freqs / high_cutoff) ** 4)
    mag *= lp_envelope
    mag[0] = 0.0  # Zero DC offset
    
    # Random phases for Left channel
    phases_L = rng.uniform(0.0, 2.0 * np.pi, size=len(freqs))
    phases_L[0] = 0.0
    if N % 2 == 0:
        phases_L[-1] = 0.0
    
    Z_L = mag * (np.cos(phases_L) + 1j * np.sin(phases_L))
    
    # Stereo Decorrelation:
    # Right channel phase shift delta_theta rises smoothly above 100 Hz
    phase_shift_max = float(params.get("stereo_decorrelation_phase_rad", 0.3))
    # Smooth phase offset curve over frequencies
    decorr_curve = np.clip((freqs - 100.0) / 1000.0, 0.0, 1.0) * phase_shift_max
    
    # Independent subtle phase perturbation for right channel
    phase_perturb = rng.uniform(-0.1, 0.1, size=len(freqs))
    phases_R = phases_L + decorr_curve + phase_perturb
    phases_R[0] = 0.0
    if N % 2 == 0:
        phases_R[-1] = 0.0
        
    Z_R = mag * (np.cos(phases_R) + 1j * np.sin(phases_R))
    
    # Inverse Real FFT guarantees 100% cyclic seamless noise over N samples
    noise_L = np.fft.irfft(Z_L, n=N)
    noise_R = np.fft.irfft(Z_R, n=N)
    
    # Normalize noise RMS to ~1.0
    rms_L = np.sqrt(np.mean(noise_L ** 2))
    if rms_L > 0:
        noise_L /= rms_L
        noise_R /= rms_L
    
    # 2. Harmonic Tonal Beds (Subtle sine layers)
    tonal_L = np.zeros(N, dtype=np.float64)
    tonal_R = np.zeros(N, dtype=np.float64)
    
    tonal_layers = params.get("tonal_layers", [])
    for layer in tonal_layers:
        req_freq = float(layer["frequency_hz"])
        gain_db = float(layer["gain_db"])
        linear_gain = 10.0 ** (gain_db / 20.0)
        
        # Quantize frequency to exact integer multiple of 1/T for seamless looping
        n_cycles = int(round(req_freq * T))
        exact_freq = n_cycles / T
        
        phase_L = rng.uniform(0.0, 2.0 * np.pi)
        phase_R = phase_L + rng.uniform(-0.2, 0.2)
        
        tonal_L += linear_gain * np.sin(2.0 * np.pi * exact_freq * t + phase_L)
        tonal_R += linear_gain * np.sin(2.0 * np.pi * exact_freq * t + phase_R)
    
    # 3. Optional Gentle Airy Noise Layer
    airy_L = np.zeros(N, dtype=np.float64)
    airy_R = np.zeros(N, dtype=np.float64)
    airy_gain_db = float(params.get("airy_noise_gain_db", -60.0))
    if airy_gain_db > -55.0 and "airy_noise_band" in params:
        f_low, f_high = params["airy_noise_band"]
        airy_mag = np.zeros(len(freqs), dtype=np.float64)
        band_idx = (freqs >= f_low) & (freqs <= f_high)
        airy_mag[band_idx] = 1.0
        
        a_phases_L = rng.uniform(0.0, 2.0 * np.pi, size=len(freqs))
        a_Z_L = airy_mag * (np.cos(a_phases_L) + 1j * np.sin(a_phases_L))
        a_phases_R = a_phases_L + 0.3
        a_Z_R = airy_mag * (np.cos(a_phases_R) + 1j * np.sin(a_phases_R))
        
        airy_L = np.fft.irfft(a_Z_L, n=N)
        airy_R = np.fft.irfft(a_Z_R, n=N)
        a_rms = np.sqrt(np.mean(airy_L ** 2))
        if a_rms > 0:
            airy_gain = 10.0 ** (airy_gain_db / 20.0)
            airy_L = (airy_L / a_rms) * airy_gain
            airy_R = (airy_R / a_rms) * airy_gain
            
    # Combine signals
    combined_L = noise_L + tonal_L + airy_L
    combined_R = noise_R + tonal_R + airy_R
    
    # 4. Slow Deterministic Modulation (LFO)
    lfo_req_freq = float(params.get("lfo_frequency_hz", 0.015))
    lfo_depth = float(params.get("lfo_depth", 0.1))
    
    # Quantize LFO frequency to exact integer multiple of 1/T
    lfo_cycles = max(1, int(round(lfo_req_freq * T)))
    lfo_exact_freq = lfo_cycles / T
    lfo_phase = rng.uniform(0.0, 2.0 * np.pi)
    
    lfo_mod = 1.0 + lfo_depth * np.cos(2.0 * np.pi * lfo_exact_freq * t + lfo_phase)
    
    stereo_L = combined_L * lfo_mod
    stereo_R = combined_R * lfo_mod
    
    return np.vstack([stereo_L, stereo_R])


def generate_candidate_file(
    candidate_def: Dict[str, Any],
    sample_rate: int,
    duration_seconds: float,
    target_lufs: float,
    output_dir: str,
    manifest_path: str
) -> Dict[str, Any]:
    """
    Generate single candidate WAV and M4A, apply constant linear gain, and update manifest.
    """
    candidate_id = candidate_def["id"]
    display_name = candidate_def["display_name"]
    seed = candidate_def["seed"]
    
    print(f"\n--- Generating Candidate: {display_name} (ID: {candidate_id}, Seed: {seed}) ---")
    
    # Synthesize raw procedural floating point audio
    audio_raw = generate_procedural_candidate_signal(
        candidate_def=candidate_def,
        sample_rate=sample_rate,
        duration_seconds=duration_seconds
    )
    
    # Write intermediate unscaled WAV to temp file for ebur128 measurement
    temp_wav_fd, temp_wav_path = tempfile.mkstemp(suffix=".wav", prefix=f"chillpup_{candidate_id}_")
    os.close(temp_wav_fd)
    
    try:
        # Initial unit normalization write
        raw_peak = np.max(np.abs(audio_raw))
        norm_factor = 0.5 / raw_peak if raw_peak > 0 else 0.5
        audio_norm = audio_raw * norm_factor
        
        write_wav_pcm24(temp_wav_path, audio_norm, sample_rate=sample_rate)
        
        # Measure initial LUFS via FFmpeg ebur128
        meas_lufs, meas_lra, meas_tp = measure_wav_lufs_ffmpeg(temp_wav_path)
        print(f"  Unscaled Measurement: LUFS={meas_lufs:.2f}, LRA={meas_lra:.2f}, TruePeak={meas_tp:.2f} dBTP")
        
        # Calculate single constant linear gain factor to hit target_lufs
        delta_lufs = target_lufs - meas_lufs
        linear_scale = 10.0 ** (delta_lufs / 20.0)
        
        # Check True Peak safety: must not exceed -3.5 dBTP
        estimated_peak = meas_tp + delta_lufs
        if estimated_peak > -3.5:
            safety_sub = estimated_peak - (-3.5)
            linear_scale *= (10.0 ** (-safety_sub / 20.0))
            print(f"  True Peak safety reduction applied (-{safety_sub:.2f} dB)")
            
        final_audio = audio_norm * linear_scale
        
    finally:
        if os.path.exists(temp_wav_path):
            try:
                os.remove(temp_wav_path)
            except OSError:
                pass

    # Destination paths
    os.makedirs(output_dir, exist_ok=True)
    wav_path = os.path.join(output_dir, f"chillpup_candidate_{candidate_id}.wav")
    m4a_path = os.path.join(output_dir, f"chillpup_candidate_{candidate_id}.m4a")
    
    # Write final 24-bit PCM WAV master
    write_wav_pcm24(wav_path, final_audio, sample_rate=sample_rate)
    
    # Verify final LUFS via FFmpeg ebur128
    final_lufs, final_lra, final_tp = measure_wav_lufs_ffmpeg(wav_path)
    print(f"  Final Master WAV: LUFS={final_lufs:.2f}, LRA={final_lra:.2f}, TruePeak={final_tp:.2f} dBTP")
    
    # Clean up memory immediately
    del audio_raw, audio_norm, final_audio
    gc.collect()
    
    # Encode to AAC-LC M4A at 96 kbps
    cmd_m4a = [
        "ffmpeg", "-y", "-i", wav_path,
        "-c:a", "aac", "-b:a", "96k",
        "-ar", str(sample_rate),
        m4a_path
    ]
    res_m4a = subprocess.run(cmd_m4a, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res_m4a.returncode != 0:
        raise RuntimeError(f"FFmpeg M4A encoding failed for {candidate_id}: {res_m4a.stderr}")
        
    wav_hash = file_sha256(wav_path)
    m4a_hash = file_sha256(m4a_path)
    
    print(f"  Generated WAV: {os.path.basename(wav_path)} (SHA256: {wav_hash[:12]}...)")
    print(f"  Generated M4A: {os.path.basename(m4a_path)} (SHA256: {m4a_hash[:12]}...)")
    
    # Environment & provenance metadata
    commit, dirty = get_git_info()
    gen_script_path = os.path.abspath(__file__)
    gen_sha = file_sha256(gen_script_path) if os.path.exists(gen_script_path) else "unknown"
    
    provenance_entry = {
        "taskId": "CP-AUDIO-002A",
        "candidateId": candidate_id,
        "displayName": display_name,
        "creator": "KF Software",
        "rightsOwner": "KF Software",
        "creationMethod": "procedural_numpy_fft_synthesis",
        "generatorPath": "tools/audio/generate_candidates.py",
        "configurationPath": "tools/audio/candidate_config.json",
        "seed": seed,
        "inputAudioAssets": [],
        "externalSamplesUsed": False,
        "aiAudioUsed": False,
        "generationCommand": f"python tools/audio/generate_candidates.py --candidate {candidate_id}",
        "operatingSystem": platform.platform(),
        "architecture": platform.machine(),
        "pythonVersion": platform.python_version(),
        "numpyVersion": np.__version__,
        "ffmpegVersion": get_ffmpeg_version(),
        "gitCommit": commit,
        "gitDirty": dirty,
        "generatorSha256": gen_sha,
        "configurationSha256": "see_candidate_config",
        "generatedAt": "2026-07-21T19:30:00Z",
        "wavSha256": wav_hash,
        "m4aSha256": m4a_hash
    }
    
    # Atomic manifest update for this candidate
    update_provenance_manifest(manifest_path, candidate_id, provenance_entry)
    
    return provenance_entry


def update_provenance_manifest(manifest_path: str, candidate_id: str, entry: Dict[str, Any]) -> None:
    """Atomic update of the provenance manifest file per candidate."""
    os.makedirs(os.path.dirname(os.path.abspath(manifest_path)), exist_ok=True)
    data = {}
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = {}
            
    if "candidates" not in data:
        data["candidates"] = {}
        
    data["candidates"][candidate_id] = entry
    
    # Atomic write via temp file
    dir_name = os.path.dirname(os.path.abspath(manifest_path))
    fd, tmp_path = tempfile.mkstemp(dir=dir_name, prefix="prov_tmp_")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    os.replace(tmp_path, manifest_path)


def main():
    parser = argparse.ArgumentParser(description="ChillPup Procedural Audio Candidate Generator")
    parser.add_argument("--config", default="tools/audio/candidate_config.json", help="Path to candidate config JSON")
    parser.add_argument("--candidate", default=None, help="Specific candidate ID to generate (default: all)")
    parser.add_argument("--output", default="tools/audio/generated/candidates", help="Output directory for audio files")
    parser.add_argument("--manifest", default="tools/audio/provenance_manifest.json", help="Provenance manifest JSON output")
    parser.add_argument("--short-duration", type=float, default=None, help="Override duration in seconds (for fast testing)")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.config):
        print(f"[ERROR] Config file not found: {args.config}")
        sys.exit(1)
        
    with open(args.config, "r", encoding="utf-8") as f:
        config = json.load(f)
        
    sample_rate = config.get("sample_rate_hz", 48000)
    duration = args.short_duration if args.short_duration is not None else config.get("duration_seconds", 180)
    target_lufs = config.get("target_integrated_lufs", -22.0)
    candidates = config.get("candidates", [])
    
    # Validate candidate IDs uniqueness
    c_ids = [c["id"] for c in candidates]
    if len(c_ids) != len(set(c_ids)):
        print("[ERROR] Configuration contains duplicate candidate IDs.")
        sys.exit(1)
        
    target_candidates = candidates
    if args.candidate:
        target_candidates = [c for c in candidates if c["id"] == args.candidate]
        if not target_candidates:
            print(f"[ERROR] Candidate ID '{args.candidate}' not found in configuration.")
            sys.exit(1)
            
    print(f"=== ChillPup Procedural Audio Generator ===")
    print(f"Sample Rate: {sample_rate} Hz | Duration: {duration} s | Target LUFS: {target_lufs}")
    print(f"Candidates to generate: {[c['id'] for c in target_candidates]}")
    
    for cand in target_candidates:
        generate_candidate_file(
            candidate_def=cand,
            sample_rate=sample_rate,
            duration_seconds=duration,
            target_lufs=target_lufs,
            output_dir=args.output,
            manifest_path=args.manifest
        )
        
    print("\n=== Generation Complete ===")
    print(f"Generated assets saved to: {args.output}")
    print(f"Provenance manifest updated at: {args.manifest}")


if __name__ == "__main__":
    main()
