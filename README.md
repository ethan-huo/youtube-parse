# youtube-parse

YouTube parsing CLI plus standalone skill package for subtitle cleanup, transcription, scene detection, and frame extraction.

## Install

```bash
# CLI
bun install -g github:ethan-huo/youtube-parse

# Skill
bunx skills add ethan-huo/youtube-parse
```

## Dependencies

The CLI expects `yt-dlp`, `ffmpeg`, `uvx`, and `vox` to be available. Bootstrap them with:

```bash
./scripts/setup.sh
```

For transcription, `vox` must already be authenticated with DashScope:

```bash
vox auth login dashscope --token <your-api-key>
```

## Usage

```bash
youtube-parse download subtitle "https://youtube.com/watch?v=..."
youtube-parse subtitle clean video.en.vtt --merge
youtube-parse transcribe audio.wav --lang auto
youtube-parse frame extract video.mp4 --timestamps 00:01:23
```

`transcribe` now uses `vox hear` under the hood. Generated `.srt` and `.vtt` outputs are single-block wrappers around the plain transcript text.

Skill definition lives at `skills/youtube-parse/SKILL.md`.
