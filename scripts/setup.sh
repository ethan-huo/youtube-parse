#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== YouTube Parse Setup ==="
echo "Repo: $REPO_DIR"
echo ""

if ! command -v brew &> /dev/null; then
    echo "Error: Homebrew is not installed. Install from https://brew.sh"
    exit 1
fi

ensure_brew_pkg() {
    local pkg="$1"
    local cmd="${2:-$1}"

    if command -v "$cmd" &> /dev/null; then
        echo "✓ $pkg already installed"
        return 0
    fi

    if brew list "$pkg" &> /dev/null 2>&1; then
        echo "✓ $pkg already installed via Homebrew but not linked"
        echo "  Try: brew link $pkg"
        return 0
    fi

    echo "Installing $pkg via Homebrew..."
    brew install "$pkg"
}

echo "[1/4] Checking yt-dlp..."
ensure_brew_pkg yt-dlp

echo ""
echo "[2/4] Checking ffmpeg..."
ensure_brew_pkg ffmpeg

echo ""
echo "[3/4] Checking uv..."
ensure_brew_pkg uv uvx

echo ""
echo "[4/4] Checking vox..."
if command -v vox &> /dev/null; then
    VOX_BIN="$(command -v vox)"
    echo "✓ vox available at $VOX_BIN"
elif command -v go &> /dev/null; then
    echo "Installing vox via go install..."
    go install github.com/ontypehq/vox@latest
    if command -v vox &> /dev/null; then
        VOX_BIN="$(command -v vox)"
        echo "✓ vox installed at $VOX_BIN"
    else
        echo "Error: vox installed, but not found in PATH"
        echo "  Add your Go bin directory to PATH"
        exit 1
    fi
else
    echo "Error: vox not found."
    echo "  Install with: go install github.com/ontypehq/vox@latest"
    exit 1
fi

echo ""
echo "=== Setup Complete ==="
echo "yt-dlp: $(command -v yt-dlp)"
echo "ffmpeg: $(command -v ffmpeg)"
echo "uvx: $(command -v uvx)"
echo "vox: $VOX_BIN"
echo ""
echo "Before using transcription, authenticate vox once:"
echo "  vox auth login dashscope --token <your-api-key>"
