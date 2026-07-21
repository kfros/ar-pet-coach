# ChillPup Offline Procedural Audio Toolchain (`CP-AUDIO-002A`)

This directory contains the reproducible, offline procedural audio toolchain for **ChillPup**. It generates 180-second ambient-audio evaluation candidates (`neutral`, `warm`, `soft`) using pure mathematical synthesis.

> [!IMPORTANT]
> **Candidate Evaluation Gate**: This toolchain produces short evaluation candidates only. Long-form production tracks (30-, 60-, or 90-minute renders) will not be generated until the owner explicitly reviews candidates using the listening scorecard and selects a direction.

---

## Directory Structure

```
tools/audio/
├── README.md                   # This documentation
├── requirements.txt            # Pinned Python dependencies (numpy, pytest)
├── bootstrap_audio.ps1         # Windows PowerShell setup script
├── bootstrap_audio.sh          # macOS / Linux Bash setup script
├── candidate_config.json       # Versioned synthesis parameters, seeds, & candidate definitions
├── generate_candidates.py      # Deterministic procedural generator CLI
├── audit_candidates.py         # Objective audio QA validation CLI
├── provenance_manifest.json    # Original-source and generation provenance tracking
├── listening_scorecard.md      # Human listening evaluation scorecard
├── generated/                  # Local candidate outputs (WAV masters & M4A listening copies)
│   └── candidates/
└── reports/                    # QA audit reports (candidate_qa.md & candidate_qa.json)
```

---

## Environment Setup & Prerequisites

### Required System Tools
- **Python 3.11+**
- **pip** and `venv` support
- **FFmpeg** and **FFprobe** (for M4A encoding and `ebur128` LUFS QA analysis)

### 1. Windows Setup (PowerShell)

Run the bootstrap script:
```powershell
.\tools\audio\bootstrap_audio.ps1
```

If FFmpeg is missing, install it via `winget`:
```powershell
winget install Gyan.FFmpeg
```
Then restart PowerShell and re-run `.\tools\audio\bootstrap_audio.ps1`.

### 2. macOS Setup (Terminal / Zsh)

Run the bootstrap script:
```bash
chmod +x tools/audio/bootstrap_audio.sh
./tools/audio/bootstrap_audio.sh
```

If dependencies are missing, install via Homebrew:
```bash
brew install python@3.11 ffmpeg
```

### 3. Ubuntu / Debian Setup (Bash)

Run the bootstrap script:
```bash
chmod +x tools/audio/bootstrap_audio.sh
./tools/audio/bootstrap_audio.sh
```

If prerequisites are missing, install via `apt`:
```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv ffmpeg
```

---

## Tool Verification Commands

Verify system prerequisites prior to generation:

```bash
# Check Python Version (>= 3.11)
python --version   # or py -3.11 --version / python3 --version

# Check FFmpeg & FFprobe
ffmpeg -version
ffprobe -version
```

---

## Generating Candidates

### Regenerate All Candidates (3 x 180s)

**Windows PowerShell:**
```powershell
.\.venv-audio\Scripts\python.exe tools/audio/generate_candidates.py
```

**macOS / Linux:**
```bash
./.venv-audio/bin/python tools/audio/generate_candidates.py
```

### Generate Single Candidate (e.g. `warm`)

**Windows PowerShell:**
```powershell
.\.venv-audio\Scripts\python.exe tools/audio/generate_candidates.py --candidate warm
```

**macOS / Linux:**
```bash
./.venv-audio/bin/python tools/audio/generate_candidates.py --candidate warm
```

### Output Files Created
- WAV Masters: `tools/audio/generated/candidates/chillpup_candidate_<id>.wav` (24-bit PCM, 48 kHz, Stereo)
- M4A Listening Copies: `tools/audio/generated/candidates/chillpup_candidate_<id>.m4a` (AAC-LC, 96 kbps, 48 kHz, Stereo)
- Provenance Manifest: `tools/audio/provenance_manifest.json`

---

## Running Objective Technical QA Audit

Run the automated objective QA suite to audit LUFS loudness (-24 to -20 LUFS), True Peak ($\le -3$ dBTP), LRA ($\le 4$ LU), loop join seam step metrics, DC offset, digital silence, and provenance compliance:

**Windows PowerShell:**
```powershell
.\.venv-audio\Scripts\python.exe tools/audio/audit_candidates.py
```

**macOS / Linux:**
```bash
./.venv-audio/bin/python tools/audio/audit_candidates.py
```

### QA Reports Generated
- Human-readable report: `tools/audio/reports/candidate_qa.md`
- Machine-readable report: `tools/audio/reports/candidate_qa.json`

---

## Running Automated Unit Tests

Execute the Pytest unit test suite:

**Windows PowerShell:**
```powershell
.\.venv-audio\Scripts\python.exe -m pytest tools/audio/tests
```

**macOS / Linux:**
```bash
./.venv-audio/bin/python -m pytest tools/audio/tests
```

---

## Determinism Scope & Provenance

Bit-identical WAV hash reproducibility is guaranteed for the recorded operating environment captured in `tools/audio/provenance_manifest.json` (Python version, NumPy version, OS architecture, generator script SHA-256, configuration SHA-256, and seed). WAV headers are written deterministically without volatile timestamp tags.

---

## Troubleshooting

1. **Python 3.11 Not Found**:
   - Ensure Python 3.11 or newer is installed and added to your system `PATH`.
2. **Missing `venv` Module (Linux)**:
   - Run `sudo apt install python3.11-venv`.
3. **FFmpeg Not Recognized**:
   - Verify FFmpeg is installed and `ffmpeg` / `ffprobe` executables are in your system `PATH`.
4. **Permission Denied on Bootstrap Script (macOS/Linux)**:
   - Run `chmod +x tools/audio/bootstrap_audio.sh`.
