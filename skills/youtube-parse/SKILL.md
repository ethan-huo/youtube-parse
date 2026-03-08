---
name: youtube-parse
description: YouTube parse toolkit
---

# YouTube Video Parser

## CLI

`youtube-parse --schema` -- show all typed commands

## Quick Reference

```bash
# Download video with subtitles
youtube-parse download video "https://youtube.com/watch?v=..."

# Download subtitles only (fast preview)
youtube-parse download subtitle "https://..." --lang en

# Download audio for transcription
youtube-parse download audio "https://..."

# Clean VTT/SRT to plain text
youtube-parse subtitle clean video.en.vtt

# Clean and merge into paragraphs (for large files)
youtube-parse subtitle clean video.srt --merge

# Extract timestamped text
youtube-parse subtitle timestamp video.en.vtt

# Transcribe audio (when no subtitles available)
youtube-parse transcribe audio.wav --lang zh

# Transcribe long video in background
youtube-parse transcribe audio.wav --lang auto --background

# Detect scene changes
youtube-parse scene detect video.mp4

# Extract frames at specific timestamps
youtube-parse frame extract video.mp4 --timestamps 00:01:23 --timestamps 00:05:42

# Batch extract from timestamp file
youtube-parse frame batch video.mp4 --file timestamps.txt
```

## References

- `references/visual-cues.md` - Frame selection principles
- `references/python-processing.md` - When you need Python-based follow-up processing
