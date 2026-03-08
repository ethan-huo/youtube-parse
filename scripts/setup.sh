#!/usr/bin/env bash
set -euo pipefail

# YouTube Parse setup script
# Installs yt-dlp, ffmpeg, whisper.cpp, uv, and downloads the Whisper model

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
MODELS_DIR="${SKILL_DIR}/models"
MODEL_NAME="${WHISPER_MODEL:-large-v3-turbo}"
MODEL_FILE="ggml-${MODEL_NAME}-q5_0.bin"
HUGGINGFACE_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_FILE}"

echo "=== YouTube Parse Skill Setup ==="
echo "Skill directory: $SKILL_DIR"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Error: Homebrew is not installed. Install from https://brew.sh"
    exit 1
fi

# 1. Install yt-dlp
echo "[1/4] Installing yt-dlp..."
if command -v yt-dlp &> /dev/null; then
    YT_DLP_VERSION=$(yt-dlp --version 2>/dev/null || echo "unknown")
    echo "✓ yt-dlp already installed (v$YT_DLP_VERSION)"
else
    if brew list yt-dlp &> /dev/null 2>&1; then
        echo "✓ yt-dlp already installed via Homebrew but not in PATH"
        echo "  Try: brew link yt-dlp"
    else
        echo "Installing yt-dlp via Homebrew..."
        if brew install yt-dlp; then
            echo "✓ yt-dlp installed"
        else
            echo "Error: Failed to install yt-dlp"
            exit 1
        fi
    fi
fi

# 2. Install ffmpeg
echo ""
echo "[2/5] Installing ffmpeg..."
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version 2>/dev/null | head -1 | cut -d' ' -f3)
    echo "✓ ffmpeg already installed (v$FFMPEG_VERSION)"
else
    if brew list ffmpeg &> /dev/null 2>&1; then
        echo "✓ ffmpeg already installed via Homebrew but not in PATH"
        echo "  Try: brew link ffmpeg"
    else
        echo "Installing ffmpeg via Homebrew..."
        if brew install ffmpeg; then
            echo "✓ ffmpeg installed"
        else
            echo "Error: Failed to install ffmpeg"
            exit 1
        fi
    fi
fi

# 3. Install uv
echo ""
echo "[3/5] Installing uv..."
if command -v uvx &> /dev/null; then
    UV_VERSION=$(uvx --version 2>/dev/null || echo "unknown")
    echo "✓ uv already installed ($UV_VERSION)"
else
    if brew list uv &> /dev/null 2>&1; then
        echo "✓ uv already installed via Homebrew but not in PATH"
        echo "  Try: brew link uv"
    else
        echo "Installing uv via Homebrew..."
        if brew install uv; then
            echo "✓ uv installed"
        else
            echo "Error: Failed to install uv"
            exit 1
        fi
    fi
fi

# 4. Install whisper.cpp
echo ""
echo "[4/5] Installing whisper.cpp..."
if command -v whisper-cli &> /dev/null; then
    WHISPER_PATH=$(which whisper-cli)
    echo "✓ whisper-cli already installed at $WHISPER_PATH"
elif brew list whisper-cpp &> /dev/null 2>&1; then
    echo "✓ whisper-cpp already installed via Homebrew"
    # Try to link if not in PATH
    if ! command -v whisper-cli &> /dev/null; then
        echo "  Linking whisper-cpp to PATH..."
        brew link whisper-cpp 2>/dev/null || true
    fi
else
    echo "Installing whisper-cpp via Homebrew..."
    if brew install whisper-cpp; then
        echo "✓ whisper-cpp installed"
    else
        echo "Error: Failed to install whisper-cpp via Homebrew"
        echo ""
        echo "If whisper-cpp is not available in your Homebrew, you can:"
        echo "  1. Update Homebrew: brew update"
        echo "  2. Check available taps: brew tap"
        echo "  3. Search for alternative formulae: brew search whisper"
        exit 1
    fi
fi

# Verify whisper-cli is available
if ! command -v whisper-cli &> /dev/null; then
    echo "Error: whisper-cli not found in PATH after installation"
    echo "  Try: brew link whisper-cpp --force"
    exit 1
fi

# 5. Download Whisper model
echo ""
echo "[5/5] Downloading Whisper model..."
mkdir -p "$MODELS_DIR"

MODEL_PATH="$MODELS_DIR/$MODEL_FILE"

# Check if model exists and is complete
if [ -f "$MODEL_PATH" ]; then
    FILE_SIZE=$(stat -f%z "$MODEL_PATH" 2>/dev/null || stat -c%s "$MODEL_PATH" 2>/dev/null || echo "0")

    # Expected sizes (approximate, in bytes)
    # large-v3-turbo: ~1.6GB = 1600000000
    # Allow some variance for different quantizations
    MIN_SIZE=100000000  # 100MB minimum for any valid model

    if [ "$FILE_SIZE" -gt "$MIN_SIZE" ]; then
        echo "✓ Model already exists and appears complete: $MODEL_PATH"
        echo "  Size: $(numfmt --to=iec-i --suffix=B $FILE_SIZE 2>/dev/null || echo "$FILE_SIZE bytes")"
    else
        echo "⚠ Partial download detected (${FILE_SIZE} bytes)"
        echo "  Resuming download..."
        RESUME_DOWNLOAD=true
    fi
else
    echo "Downloading $MODEL_NAME model (~1.6GB)..."
    echo "URL: $HUGGINGFACE_URL"
    RESUME_DOWNLOAD=false
fi

# Download model if needed
if [ ! -f "$MODEL_PATH" ] || [ "$RESUME_DOWNLOAD" = true ]; then
    if command -v curl &> /dev/null; then
        # curl with resume support (-C -)
        echo "Using curl with resume support..."
        curl -L -C - --progress-bar -o "$MODEL_PATH" "$HUGGINGFACE_URL"
    elif command -v wget &> /dev/null; then
        # wget with resume support (-c)
        echo "Using wget with resume support..."
        wget -c --show-progress -O "$MODEL_PATH" "$HUGGINGFACE_URL"
    else
        echo "Error: Neither curl nor wget found. Please install one of them."
        exit 1
    fi

    # Verify download completed
    if [ $? -eq 0 ] && [ -f "$MODEL_PATH" ]; then
        FINAL_SIZE=$(stat -f%z "$MODEL_PATH" 2>/dev/null || stat -c%s "$MODEL_PATH" 2>/dev/null || echo "0")
        echo "✓ Model downloaded: $MODEL_PATH"
        echo "  Size: $(numfmt --to=iec-i --suffix=B $FINAL_SIZE 2>/dev/null || echo "$FINAL_SIZE bytes")"
    else
        echo "Error: Download failed. Run this script again to resume."
        exit 1
    fi
fi

# Summary
echo ""
echo "=== Setup Complete ==="
echo ""
echo "Installed components:"
echo "  - yt-dlp: $(which yt-dlp)"
echo "  - ffmpeg: $(which ffmpeg)"
echo "  - uvx: $(which uvx)"
echo "  - whisper-cli: $(which whisper-cli)"
echo "  - Model: $MODELS_DIR/$MODEL_FILE"
echo ""
echo "Test the installation:"
echo "  whisper-cli -m \"$MODELS_DIR/$MODEL_FILE\" -h"
echo ""
echo "Use in SKILL.md with:"
echo "  whisper-cli -m \"\./models/$MODEL_FILE\" -f audio.wav -l auto -osrt -oj"
echo ""
echo "To use a different model, run:"
echo "  WHISPER_MODEL=large-v3 \"$0\""
echo ""
echo "Available models: tiny, tiny.en, base, base.en, small, small.en,"
echo "                  medium, medium.en, large-v3, large-v3-turbo"
