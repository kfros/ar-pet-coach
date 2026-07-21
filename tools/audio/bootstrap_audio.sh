#!/usr/bin/env bash
# tools/audio/bootstrap_audio.sh
# macOS / Linux bootstrap script for ChillPup audio toolchain (.venv-audio)

set -e

echo "=== ChillPup Audio Toolchain Environment Bootstrap ==="

# 1. Locate Python 3.11+
PYTHON_CMD=""
for cmd in python3 python python3.11 python3.12 python3.13; do
    if command -v "$cmd" &>/dev/null; then
        VER=$($cmd -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
        MAJOR=$(echo "$VER" | cut -d. -f1)
        MINOR=$(echo "$VER" | cut -d. -f2)
        if [ "$MAJOR" -eq 3 ] && [ "$MINOR" -ge 11 ]; then
            PYTHON_CMD="$cmd"
            break
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "[ERROR] Python 3.11 or newer is required but was not found." >&2
    echo "Please install Python 3.11+ via homebrew (macOS) or apt (Debian/Ubuntu):" >&2
    echo "  macOS:  brew install python@3.11" >&2
    echo "  Ubuntu: sudo apt update && sudo apt install -y python3.11 python3.11-venv" >&2
    exit 1
fi

echo "[INFO] Using Python command: $PYTHON_CMD ($($PYTHON_CMD --version))"

# 2. Check/Create .venv-audio
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENV_DIR="$REPO_ROOT/.venv-audio"
VENV_PYTHON="$VENV_DIR/bin/python"

if [ ! -f "$VENV_PYTHON" ]; then
    echo "[INFO] Creating virtual environment at $VENV_DIR..."
    "$PYTHON_CMD" -m venv "$VENV_DIR"
    if [ ! -f "$VENV_PYTHON" ]; then
        echo "[ERROR] Failed to create virtual environment." >&2
        exit 1
    fi
fi

echo "[INFO] Virtual environment ready at $VENV_DIR"

# 3. Upgrade pip and install requirements
echo "[INFO] Upgrading pip inside virtual environment..."
"$VENV_PYTHON" -m pip install --upgrade pip --quiet

REQ_PATH="$SCRIPT_DIR/requirements.txt"
echo "[INFO] Installing dependencies from $REQ_PATH..."
"$VENV_PYTHON" -m pip install -r "$REQ_PATH"

# 4. Verify FFmpeg and FFprobe
FFMPEG_OK=1
if ! command -v ffmpeg &>/dev/null; then
    echo "[WARNING] ffmpeg was not found in PATH." >&2
    FFMPEG_OK=0
fi
if ! command -v ffprobe &>/dev/null; then
    echo "[WARNING] ffprobe was not found in PATH." >&2
    FFMPEG_OK=0
fi

if [ "$FFMPEG_OK" -eq 0 ]; then
    echo ""
    echo "[PREREQUISITE ACTION REQUIRED]"
    echo "FFmpeg and FFprobe are required for encoding M4A listening copies and LUFS QA analysis."
    echo "To install FFmpeg:"
    echo "  macOS:  brew install ffmpeg"
    echo "  Ubuntu: sudo apt update && sudo apt install -y ffmpeg"
    echo ""
    echo "After installation, re-run bootstrap:"
    echo "  ./tools/audio/bootstrap_audio.sh"
    exit 1
else
    FFMPEG_VER=$(ffmpeg -version | head -n 1)
    echo "[INFO] FFmpeg verified: $FFMPEG_VER"
fi

echo ""
echo "=== Environment Bootstrap Complete ==="
echo "Virtual Environment Python: $VENV_PYTHON"
echo "To run generation:"
echo "  $VENV_PYTHON tools/audio/generate_candidates.py"
