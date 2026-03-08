import { toStandardJsonSchema } from "@valibot/to-json-schema";
import { c, group } from "argc";
import * as v from "valibot";

const s = toStandardJsonSchema;

// ============================================================================
// Download Commands
// ============================================================================

const downloadGroup = group(
  { description: "Download video, audio, or subtitles from YouTube" },
  {
    video: c
      .meta({
        description: "Download video with subtitles",
        examples: [
          'youtube-parse download video "https://youtube.com/watch?v=..."',
        ],
      })
      .args("url")
      .input(
        s(
          v.object({
            url: v.pipe(v.string(), v.description("YouTube URL")),
            lang: v.optional(
              v.pipe(v.string(), v.description("Subtitle language code")),
              "en",
            ),
            output: v.optional(
              v.pipe(v.string(), v.description("Output filename template")),
            ),
          }),
        ),
      ),

    subtitle: c
      .meta({
        description: "Download subtitles only (skip video)",
        examples: ['youtube-parse download subtitle "https://..." --lang zh'],
      })
      .args("url")
      .input(
        s(
          v.object({
            url: v.string(),
            lang: v.optional(v.string(), "en"),
          }),
        ),
      ),

    audio: c
      .meta({
        description: "Download audio only (for transcription)",
        examples: ['youtube-parse download audio "https://..."'],
      })
      .args("url")
      .input(
        s(
          v.object({
            url: v.string(),
            output: v.optional(v.string()),
          }),
        ),
      ),
  },
);

// ============================================================================
// Subtitle Commands
// ============================================================================

const subtitleGroup = group(
  { description: "Process subtitle files" },
  {
    clean: c
      .meta({
        description: "Clean VTT/SRT to plain text (remove timestamps, dedupe)",
        examples: [
          "youtube-parse subtitle clean video.en.vtt",
          "youtube-parse subtitle clean video.srt --merge",
          "youtube-parse subtitle clean video.srt --join --width 120",
        ],
      })
      .args("file")
      .input(
        s(
          v.object({
            file: v.pipe(v.string(), v.description("VTT or SRT file path")),
            output: v.optional(
              v.pipe(v.string(), v.description("Output file path")),
            ),
            merge: v.optional(
              v.pipe(
                v.boolean(),
                v.description(
                  "Merge short lines into paragraphs by punctuation",
                ),
              ),
              false,
            ),
            join: v.optional(
              v.pipe(
                v.boolean(),
                v.description(
                  "Join all lines into continuous text with line width",
                ),
              ),
              false,
            ),
            width: v.optional(
              v.pipe(
                v.number(),
                v.description("Line width for join mode (default: 80)"),
              ),
              80,
            ),
          }),
        ),
      ),

    timestamp: c
      .meta({
        description: "Extract text with timestamps",
        examples: ["youtube-parse subtitle timestamp video.en.vtt"],
      })
      .args("file")
      .input(
        s(
          v.object({
            file: v.string(),
            output: v.optional(v.string()),
          }),
        ),
      ),
  },
);

// ============================================================================
// Transcribe Command
// ============================================================================

const transcribeCmd = c
  .meta({
    description: "Transcribe audio using Whisper",
    examples: [
      "youtube-parse transcribe audio.wav --lang zh",
      "youtube-parse transcribe audio.wav --lang auto --background",
    ],
  })
  .args("audio")
  .input(
    s(
      v.object({
        audio: v.pipe(
          v.string(),
          v.description("Audio file path (WAV recommended)"),
        ),
        lang: v.optional(
          v.pipe(
            v.string(),
            v.description("Language code: en, zh, ja, auto, etc."),
          ),
          "auto",
        ),
        output: v.optional(
          v.pipe(
            v.string(),
            v.description("Output basename (without extension)"),
          ),
          "transcript",
        ),
        format: v.optional(
          v.pipe(
            v.picklist(["srt", "json", "vtt", "all"]),
            v.description("Output format"),
          ),
          "all",
        ),
        background: v.optional(
          v.pipe(
            v.boolean(),
            v.description("Run in background (for long videos)"),
          ),
          false,
        ),
      }),
    ),
  );

// ============================================================================
// Scene Commands
// ============================================================================

const sceneGroup = group(
  { description: "Scene detection" },
  {
    detect: c
      .meta({
        description: "Detect scene changes in video",
        examples: ["youtube-parse scene detect video.mp4"],
      })
      .args("video")
      .input(
        s(
          v.object({
            video: v.pipe(v.string(), v.description("Video file path")),
            threshold: v.optional(
              v.pipe(v.number(), v.description("Detection threshold")),
            ),
          }),
        ),
      ),
  },
);

// ============================================================================
// Frame Commands
// ============================================================================

const frameGroup = group(
  { description: "Extract frames from video" },
  {
    extract: c
      .meta({
        description: "Extract frames at specific timestamps",
        examples: [
          "youtube-parse frame extract video.mp4 --timestamps 00:01:23 --timestamps 00:05:42",
        ],
      })
      .args("video")
      .input(
        s(
          v.object({
            video: v.string(),
            timestamps: v.pipe(
              v.array(v.string()),
              v.description("Timestamps to extract (HH:MM:SS or HH:MM:SS.mmm)"),
            ),
            output_dir: v.optional(v.string(), "frames"),
          }),
        ),
      ),

    batch: c
      .meta({
        description: "Batch extract frames from timestamp file",
        examples: ["youtube-parse frame batch video.mp4 --file timestamps.txt"],
      })
      .args("video")
      .input(
        s(
          v.object({
            video: v.string(),
            file: v.pipe(
              v.string(),
              v.description("File containing timestamps (one per line)"),
            ),
            output_dir: v.optional(v.string(), "frames"),
          }),
        ),
      ),
  },
);

// ============================================================================
// Export Schema
// ============================================================================

export const schema = {
  download: downloadGroup,
  subtitle: subtitleGroup,
  transcribe: transcribeCmd,
  scene: sceneGroup,
  frame: frameGroup,
};
