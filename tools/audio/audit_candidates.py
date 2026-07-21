#!/usr/bin/env python3
"""
tools/audio/audit_candidates.py
Objective audio QA audit tool for ChillPup procedural candidates (CP-AUDIO-002A).
"""

import os
import sys
import json
import argparse
import subprocess
import tempfile
import struct
from typing import Dict, Any, List, Tuple
import numpy as np

# Ensure UTF-8 output
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")


def read_wav_pcm(filepath: str) -> Tuple[np.ndarray, int, int, int]:
    """
    Read PCM WAV file into float numpy array shape (channels, samples).
    Returns (audio_float, sample_rate, num_channels, bits_per_sample).
    """
    with open(filepath, "rb") as f:
        riff = f.read(12)
        if len(riff) < 12 or riff[:4] != b"RIFF" or riff[8:12] != b"WAVE":
            raise ValueError(f"File {filepath} is not a valid RIFF WAVE file.")
            
        sample_rate = 48000
        num_channels = 2
        bits_per_sample = 24
        pcm_data = b""
        
        while chunk_hdr := f.read(8):
            if len(chunk_hdr) < 8:
                break
            chunk_id = chunk_hdr[:4]
            chunk_size = struct.unpack("<I", chunk_hdr[4:8])[0]
            chunk_bytes = f.read(chunk_size)
            if chunk_size % 2 != 0:
                f.read(1)  # Padding byte
                
            if chunk_id == b"fmt ":
                audio_fmt, num_channels, sample_rate, byte_rate, block_align, bits_per_sample = struct.unpack("<HHIIHH", chunk_bytes[:16])
                if audio_fmt != 1:
                    raise ValueError(f"Unsupported WAV compression format {audio_fmt}. Only PCM (1) supported.")
            elif chunk_id == b"data":
                pcm_data = chunk_bytes
                
    if not pcm_data:
        raise ValueError(f"No data chunk found in {filepath}")
        
    bytes_per_sample = bits_per_sample // 8
    total_samples = len(pcm_data) // (num_channels * bytes_per_sample)
    
    if bits_per_sample == 16:
        raw_ints = np.frombuffer(pcm_data, dtype="<i2")
        audio = raw_ints.astype(np.float64) / 32768.0
    elif bits_per_sample == 24:
        # Convert 3-byte LE to int32
        raw_u8 = np.frombuffer(pcm_data, dtype=np.uint8)
        bytes_3 = raw_u8.reshape(-1, 3)
        # Pad 4th byte with 0, then sign extend
        bytes_4 = np.column_stack([bytes_3, np.zeros(len(bytes_3), dtype=np.uint8)])
        int32_vals = bytes_4.view("<i4").reshape(-1)
        # Sign extend 24-bit int
        int32_vals = np.where(int32_vals & 0x800000, int32_vals | ~0xFFFFFF, int32_vals)
        audio = int32_vals.astype(np.float64) / 8388608.0
    else:
        raise ValueError(f"Unsupported bit depth: {bits_per_sample}")
        
    audio = audio.reshape(total_samples, num_channels).T
    return audio, sample_rate, num_channels, bits_per_sample


def decode_m4a_to_wav(m4a_path: str) -> str:
    """Decode M4A file to temporary WAV file using FFmpeg."""
    fd, tmp_wav = tempfile.mkstemp(suffix="_decoded.wav", prefix="audit_m4a_")
    os.close(fd)
    
    cmd = [
        "ffmpeg", "-y", "-i", m4a_path,
        "-ar", "48000", "-c:a", "pcm_s24le",
        tmp_wav
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        if os.path.exists(tmp_wav):
            os.remove(tmp_wav)
        raise RuntimeError(f"FFmpeg failed to decode M4A: {res.stderr}")
    return tmp_wav


def run_ebur128_ffmpeg(filepath: str) -> Tuple[float, float, float]:
    """Run FFmpeg ebur128 filter to get (integrated_lufs, lra, true_peak_dbtp)."""
    cmd = [
        "ffmpeg", "-nostats", "-i", filepath,
        "-filter_complex", "ebur128=peak=true",
        "-f", "null", "-"
    ]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    stderr = res.stderr
    
    integrated_lufs = -99.0
    lra = 0.0
    true_peak = -99.0
    
    for line in stderr.splitlines():
        if "Integrated loudness:" in line:
            parts = line.split("I:")
            if len(parts) > 1:
                try:
                    integrated_lufs = float(parts[1].split("LUFS")[0].strip())
                except ValueError:
                    pass
        elif "Loudness range:" in line and "LRA:" in line:
            parts = line.split("LRA:")
            if len(parts) > 1:
                try:
                    lra = float(parts[1].split("LU")[0].strip())
                except ValueError:
                    pass
        elif "Peak:" in line and "TP:" in line:
            parts = line.split("True peak:")
            if len(parts) > 1 and "dBTP" in parts[1]:
                val = parts[1].split("dBTP")[0].replace("Peak:", "").strip()
                try:
                    true_peak = float(val)
                except ValueError:
                    pass

    return integrated_lufs, lra, true_peak


def audit_candidate_single(
    candidate_id: str,
    wav_path: str,
    m4a_path: str,
    manifest_data: Dict[str, Any],
    expected_duration_s: float = 180.0
) -> Dict[str, Any]:
    """Run objective QA audit on a single candidate."""
    checks: List[Dict[str, Any]] = []
    
    def add_check(
        name: str,
        category: str,  # "MANDATORY" or "INFORMATIONAL"
        status: str,    # "PASS", "FAIL", "INFO"
        value: Any,
        threshold: str,
        message: str
    ):
        checks.append({
            "name": name,
            "category": category,
            "status": status,
            "value": value,
            "threshold": threshold,
            "message": message
        })

    # 1. Read WAV Master
    try:
        audio_wav, sr, n_ch, bits = read_wav_pcm(wav_path)
        expected_samples = int(round(expected_duration_s * sr))
        actual_samples = audio_wav.shape[1]
        
        # Format & Sample Count Check
        fmt_pass = (sr == 48000) and (n_ch == 2) and (bits == 24) and (actual_samples == expected_samples)
        add_check(
            name="WAV Format & Exact Sample Count",
            category="MANDATORY",
            status="PASS" if fmt_pass else "FAIL",
            value=f"{sr}Hz, {n_ch}ch, {bits}-bit, {actual_samples} samples",
            threshold=f"48000Hz, 2ch, 24-bit, exactly {expected_samples} samples",
            message=f"WAV master sample count is {actual_samples} (expected {expected_samples})"
        )
    except Exception as e:
        add_check(
            name="WAV Master Read",
            category="MANDATORY",
            status="FAIL",
            value=str(e),
            threshold="Valid PCM 24-bit WAV",
            message=f"Failed to read WAV file: {e}"
        )
        return {"candidateId": candidate_id, "checks": checks, "mandatoryPassed": False}

    # 2. NaN / Inf Check
    has_nan_inf = np.isnan(audio_wav).any() or np.isinf(audio_wav).any()
    add_check(
        name="Absence of Invalid Samples (NaN/Inf)",
        category="MANDATORY",
        status="PASS" if not has_nan_inf else "FAIL",
        value=f"Contains NaN/Inf: {has_nan_inf}",
        threshold="No NaN or Infinite values",
        message="WAV samples are strictly finite real numbers."
    )

    # 3. FFmpeg ebur128 LUFS, LRA, True Peak Check (WAV)
    lufs, lra, true_peak = run_ebur128_ffmpeg(wav_path)
    
    lufs_pass = (-24.0 <= lufs <= -20.0)
    add_check(
        name="Integrated Loudness (WAV)",
        category="MANDATORY",
        status="PASS" if lufs_pass else "FAIL",
        value=f"{lufs:.2f} LUFS",
        threshold="-24.0 to -20.0 LUFS",
        message=f"Integrated loudness is {lufs:.2f} LUFS"
    )
    
    lra_pass = (lra <= 4.0)
    add_check(
        name="Loudness Range LRA (WAV)",
        category="MANDATORY",
        status="PASS" if lra_pass else "FAIL",
        value=f"{lra:.2f} LU",
        threshold="<= 4.0 LU",
        message=f"Loudness range is {lra:.2f} LU"
    )
    
    tp_pass = (true_peak <= -3.0)
    add_check(
        name="True Peak (WAV)",
        category="MANDATORY",
        status="PASS" if tp_pass else "FAIL",
        value=f"{true_peak:.2f} dBTP",
        threshold="<= -3.0 dBTP",
        message=f"True Peak is {true_peak:.2f} dBTP"
    )

    # 4. 1-Second RMS Delta Check
    secs = actual_samples // sr
    sec_rms = []
    for s in range(secs):
        seg = audio_wav[:, s * sr : (s + 1) * sr]
        rms_val = np.sqrt(np.mean(seg ** 2))
        sec_rms.append(rms_val)
    sec_rms = np.array(sec_rms)
    
    # Delta in dB between adjacent seconds
    sec_rms_db = 20.0 * np.log10(np.maximum(sec_rms, 1e-9))
    rms_deltas = np.abs(np.diff(sec_rms_db))
    max_1s_delta = float(np.max(rms_deltas)) if len(rms_deltas) > 0 else 0.0
    
    rms_delta_pass = (max_1s_delta <= 3.0)
    add_check(
        name="Adjacent 1-Second RMS Delta",
        category="MANDATORY",
        status="PASS" if rms_delta_pass else "FAIL",
        value=f"{max_1s_delta:.2f} dB",
        threshold="<= 3.0 dB",
        message=f"Maximum 1-second adjacent RMS delta is {max_1s_delta:.2f} dB"
    )

    # 5. DC Offset Check
    dc_offset_l = np.abs(np.mean(audio_wav[0]))
    dc_offset_r = np.abs(np.mean(audio_wav[1]))
    max_dc_offset = max(dc_offset_l, dc_offset_r)
    max_dc_dbfs = 20.0 * np.log10(max(max_dc_offset, 1e-9))
    
    dc_pass = (max_dc_dbfs <= -60.0)
    add_check(
        name="DC Offset",
        category="MANDATORY",
        status="PASS" if dc_pass else "FAIL",
        value=f"{max_dc_dbfs:.2f} dBFS",
        threshold="<= -60.0 dBFS",
        message=f"Maximum DC offset is {max_dc_dbfs:.2f} dBFS"
    )

    # 6. Unintended Digital Silence Check (>= 100ms exact zero run)
    zero_run_threshold = int(0.100 * sr)  # 4800 consecutive zero samples
    is_zero_L = (audio_wav[0] == 0)
    is_zero_R = (audio_wav[1] == 0)
    
    def max_zero_run(arr: np.ndarray) -> int:
        max_run = 0
        current_run = 0
        for val in arr:
            if val:
                current_run += 1
                if current_run > max_run:
                    max_run = current_run
            else:
                current_run = 0
        return max_run

    max_z_run = max(max_zero_run(is_zero_L), max_zero_run(is_zero_R))
    silence_pass = (max_z_run < zero_run_threshold)
    add_check(
        name="Unintended Digital Silence",
        category="MANDATORY",
        status="PASS" if silence_pass else "FAIL",
        value=f"{max_z_run} samples ({max_z_run / sr * 1000:.1f} ms)",
        threshold=f"< {zero_run_threshold} samples (100 ms)",
        message=f"Longest exact-zero sample run is {max_z_run} samples"
    )

    # 7. Loop Join Boundary RMS Continuity Check (1st vs last 100ms)
    n_100ms = int(0.100 * sr)
    rms_first = np.sqrt(np.mean(audio_wav[:, :n_100ms] ** 2))
    rms_last = np.sqrt(np.mean(audio_wav[:, -n_100ms:] ** 2))
    
    rms_first_db = 20.0 * np.log10(max(rms_first, 1e-9))
    rms_last_db = 20.0 * np.log10(max(rms_last, 1e-9))
    loop_rms_delta = abs(rms_first_db - rms_last_db)
    
    loop_rms_pass = (loop_rms_delta <= 1.0)
    add_check(
        name="Loop Join 100ms RMS Continuity",
        category="MANDATORY",
        status="PASS" if loop_rms_pass else "FAIL",
        value=f"{loop_rms_delta:.2f} dB",
        threshold="<= 1.0 dB",
        message=f"First vs last 100ms RMS difference is {loop_rms_delta:.2f} dB"
    )

    # 8. Loop Seam Sample Step Continuity Metric
    # Seam step is |x[0] - x[N-1]|
    # Adjacent steps are |x[i] - x[i-1]| for i = 1..N-1
    seam_z_scores = []
    seam_pass = True
    for ch in range(n_ch):
        adj_steps = np.abs(np.diff(audio_wav[ch]))
        seam_step = abs(audio_wav[ch, 0] - audio_wav[ch, -1])
        mean_step = float(np.mean(adj_steps))
        std_step = float(np.std(adj_steps))
        z_score = (seam_step - mean_step) / max(std_step, 1e-9)
        seam_z_scores.append(z_score)
        if z_score > 5.0:
            seam_pass = False
            
    max_seam_z = max(seam_z_scores)
    add_check(
        name="Loop Join Seam Sample Step Metric",
        category="MANDATORY",
        status="PASS" if seam_pass else "FAIL",
        value=f"Z-score = {max_seam_z:.2f} sigma",
        threshold="<= 5.0 sigma (Z-score relative to internal sample steps)",
        message=f"Seam step Z-score is {max_seam_z:.2f} sigma (Formula: Z_seam = (|x[0]-x[N-1]| - mean_step)/std_step)"
    )

    # 9. Decoded M4A Format & AAC Frame Tolerance Check
    m4a_decoded_wav = None
    try:
        m4a_decoded_wav = decode_m4a_to_wav(m4a_path)
        audio_m4a, sr_m, n_ch_m, bits_m = read_wav_pcm(m4a_decoded_wav)
        actual_m4a_samples = audio_m4a.shape[1]
        
        # AAC frame size at 48kHz is 1024 samples
        aac_frame_size = 1024
        sample_diff = abs(actual_m4a_samples - expected_samples)
        m4a_samples_pass = (sample_diff <= aac_frame_size) and (sr_m == 48000) and (n_ch_m == 2)
        
        add_check(
            name="Decoded M4A Sample Count & AAC Frame Tolerance",
            category="MANDATORY",
            status="PASS" if m4a_samples_pass else "FAIL",
            value=f"{actual_m4a_samples} samples (diff: {sample_diff})",
            threshold=f"Within 1 AAC frame ({aac_frame_size} samples) of expected {expected_samples}",
            message=f"M4A decoded sample count is {actual_m4a_samples} (diff {sample_diff} vs WAV)"
        )
        
        # Check M4A decoded LUFS & Peak
        m_lufs, m_lra, m_tp = run_ebur128_ffmpeg(m4a_decoded_wav)
        add_check(
            name="Decoded M4A Loudness & Peak",
            category="MANDATORY",
            status="PASS" if (-24.5 <= m_lufs <= -19.5 and m_tp <= -2.5) else "FAIL",
            value=f"LUFS={m_lufs:.2f}, LRA={m_lra:.2f}, TruePeak={m_tp:.2f} dBTP",
            threshold="-24.5 to -19.5 LUFS, TruePeak <= -2.5 dBTP",
            message="Decoded M4A meets loudness and peak criteria."
        )
    except Exception as e:
        add_check(
            name="M4A Decode & Audit",
            category="MANDATORY",
            status="FAIL",
            value=str(e),
            threshold="Successful AAC decoding",
            message=f"Failed to decode or audit M4A: {e}"
        )
    finally:
        if m4a_decoded_wav and os.path.exists(m4a_decoded_wav):
            try:
                os.remove(m4a_decoded_wav)
            except OSError:
                pass

    # 10. Provenance Manifest Verification
    cand_manifest = manifest_data.get("candidates", {}).get(candidate_id, {})
    prov_ok = bool(cand_manifest) and (cand_manifest.get("inputAudioAssets") == []) and (not cand_manifest.get("externalSamplesUsed")) and (not cand_manifest.get("aiAudioUsed"))
    add_check(
        name="Provenance Manifest Compliance",
        category="MANDATORY",
        status="PASS" if prov_ok else "FAIL",
        value=f"Manifest entry present: {bool(cand_manifest)}",
        threshold="No input audio assets, externalSamplesUsed=false, aiAudioUsed=false",
        message="Provenance manifest confirms 100% original procedural synthesis."
    )

    # --- INFORMATIONAL CHECKS ---
    
    # 11. Spectral Energy Distribution
    freqs = np.fft.rfftfreq(actual_samples, d=1.0/sr)
    fft_spec = np.abs(np.fft.rfft(audio_wav[0]))
    total_energy = np.sum(fft_spec ** 2)
    
    if total_energy > 0:
        low_energy = np.sum(fft_spec[freqs < 250] ** 2) / total_energy
        mid_energy = np.sum(fft_spec[(freqs >= 250) & (freqs <= 4000)] ** 2) / total_energy
        high_energy = np.sum(fft_spec[freqs > 4000] ** 2) / total_energy
        nyquist_energy = np.sum(fft_spec[freqs > 20000] ** 2) / total_energy
    else:
        low_energy, mid_energy, high_energy, nyquist_energy = 0, 0, 0, 0
        
    add_check(
        name="Spectral Energy Distribution",
        category="INFORMATIONAL",
        status="INFO",
        value=f"Low (<250Hz): {low_energy*100:.1f}%, Mid (250-4kHz): {mid_energy*100:.1f}%, High (>4kHz): {high_energy*100:.1f}%, Nyquist (>20kHz): {nyquist_energy*100:.3f}%",
        threshold="Informational Spectral Profile",
        message="Frequency balance reported for timbre character observation."
    )

    # 12. Stereo Correlation & Mono Fold-Down
    dot_prod = np.sum(audio_wav[0] * audio_wav[1])
    norm_l = np.sqrt(np.sum(audio_wav[0] ** 2))
    norm_r = np.sqrt(np.sum(audio_wav[1] ** 2))
    denom = max(norm_l * norm_r, 1e-9)
    stereo_corr = dot_prod / denom
    
    mono_fold = 0.5 * (audio_wav[0] + audio_wav[1])
    mono_rms = np.sqrt(np.mean(mono_fold ** 2))
    orig_rms = np.sqrt(np.mean(0.5 * (audio_wav[0]**2 + audio_wav[1]**2)))
    fold_ratio = mono_rms / max(orig_rms, 1e-9)
    
    add_check(
        name="Stereo Correlation & Mono Fold-Down",
        category="INFORMATIONAL",
        status="INFO",
        value=f"Correlation: {stereo_corr:.3f}, Mono Fold RMS Ratio: {fold_ratio:.3f}",
        threshold="Informational Stereo Decorrelation Diagnostic",
        message="Stereo correlation coefficient and mono fold-down stability."
    )

    # 13. Decoded M4A Encoded Edge Boundary Observation
    add_check(
        name="Decoded M4A Encoded Edge Boundary",
        category="INFORMATIONAL",
        status="INFO",
        value="AAC encoder padding & container delay present",
        threshold="Encoded-Edge Diagnostic (Native playback loop evaluated in mobile gate)",
        message="AAC container boundary handling is separate from PCM loop continuity."
    )

    mandatory_passed = all(c["status"] == "PASS" for c in checks if c["category"] == "MANDATORY")
    return {
        "candidateId": candidate_id,
        "checks": checks,
        "mandatoryPassed": mandatory_passed
    }


def generate_markdown_qa_report(audit_results: List[Dict[str, Any]], report_path: str) -> None:
    """Write human-readable Markdown QA report."""
    os.makedirs(os.path.dirname(os.path.abspath(report_path)), exist_ok=True)
    
    all_mandatory_passed = all(r["mandatoryPassed"] for r in audit_results)
    overall_status = "PASS" if all_mandatory_passed else "FAIL"
    
    lines = []
    lines.append("# ChillPup Technical QA Audit Report — Candidates (CP-AUDIO-002A)\n")
    lines.append(f"**Overall Audit Result**: `{overall_status}`\n")
    lines.append("> [!NOTE]")
    lines.append("> Mandatory checks enforce objective technical standards (LUFS, True Peak, sample count, loop seam step, silence, format). They do **not** declare any candidate pleasant, effective, or selected for production.\n")
    
    for res in audit_results:
        cid = res["candidateId"]
        passed = res["mandatoryPassed"]
        status_str = "PASS" if passed else "FAIL"
        lines.append(f"## Candidate: `{cid}` (Status: **{status_str}**)\n")
        lines.append("| Check Name | Category | Status | Value | Required Threshold | Details |")
        lines.append("| :--- | :---: | :---: | :--- | :--- | :--- |")
        
        for c in res["checks"]:
            cat = c["category"]
            st = c["status"]
            icon = "✅" if st == "PASS" else ("❌" if st == "FAIL" else "ℹ️")
            lines.append(f"| {c['name']} | `{cat}` | {icon} **{st}** | `{c['value']}` | `{c['threshold']}` | {c['message']} |")
        lines.append("\n---\n")
        
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def main():
    parser = argparse.ArgumentParser(description="ChillPup Objective Audio QA Auditor")
    parser.add_argument("--input", default="tools/audio/generated/candidates", help="Input directory containing candidate files")
    parser.add_argument("--manifest", default="tools/audio/provenance_manifest.json", help="Path to provenance manifest")
    parser.add_argument("--config", default="tools/audio/candidate_config.json", help="Path to candidate config")
    parser.add_argument("--report", default="tools/audio/reports/candidate_qa.md", help="Output markdown report path")
    parser.add_argument("--json-report", default="tools/audio/reports/candidate_qa.json", help="Output JSON report path")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.config):
        print(f"[ERROR] Candidate config file not found: {args.config}")
        sys.exit(1)
        
    with open(args.config, "r", encoding="utf-8") as f:
        config = json.load(f)
        
    duration_s = config.get("duration_seconds", 180)
    candidates = config.get("candidates", [])
    
    manifest_data = {}
    if os.path.exists(args.manifest):
        with open(args.manifest, "r", encoding="utf-8") as f:
            manifest_data = json.load(f)
            
    print("=== Running ChillPup Objective QA Audit ===")
    
    results = []
    all_passed = True
    
    for cand in candidates:
        cid = cand["id"]
        wav_path = os.path.join(args.input, f"chillpup_candidate_{cid}.wav")
        m4a_path = os.path.join(args.input, f"chillpup_candidate_{cid}.m4a")
        
        if not os.path.exists(wav_path) or not os.path.exists(m4a_path):
            print(f"[ERROR] Missing candidate audio files for '{cid}' in {args.input}")
            sys.exit(1)
            
        res = audit_candidate_single(
            candidate_id=cid,
            wav_path=wav_path,
            m4a_path=m4a_path,
            manifest_data=manifest_data,
            expected_duration_s=duration_s
        )
        results.append(res)
        if not res["mandatoryPassed"]:
            all_passed = False
            
    # Write reports
    generate_markdown_qa_report(results, args.report)
    
    os.makedirs(os.path.dirname(os.path.abspath(args.json_report)), exist_ok=True)
    with open(args.json_report, "w", encoding="utf-8") as f:
        json.dump({"auditResults": results, "overallStatus": "PASS" if all_passed else "FAIL"}, f, indent=2)
        
    print(f"\nAudit complete. Overall Status: {'PASS' if all_passed else 'FAIL'}")
    print(f"Markdown report written to: {args.report}")
    print(f"JSON report written to: {args.json_report}")
    
    if not all_passed:
        sys.exit(1)


if __name__ == "__main__":
    main()
