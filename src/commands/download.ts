import { exec, output, fail, requireRequirements } from "../lib";
import type { AppHandlers } from "../lib";

export const downloadHandlers: AppHandlers["download"] = {
  video: async ({ input }) => {
    await requireRequirements(["yt-dlp"]);

    const args = [
      "yt-dlp",
      input.url,
      "--write-auto-sub",
      "--sub-lang",
      input.lang,
      "--sub-format",
      "vtt",
    ];

    if (input.output) {
      args.push("-o", input.output);
    } else {
      args.push("-o", "%(title)s.%(ext)s");
    }

    const result = await exec(args);

    if (!result.success) {
      fail(result.stderr || "Failed to download video");
    }

    // Parse output to find downloaded files
    const videoMatch = result.stdout.match(
      /Destination: (.+\.(?:mp4|webm|mkv))/i,
    );
    const subMatch = result.stdout.match(/Destination: (.+\.vtt)/i);

    const videoFile = videoMatch?.[1] ?? "video file";
    const hasSubtitle = subMatch !== null;

    if (hasSubtitle) {
      output({
        message: `Downloaded video to ${videoFile} with ${input.lang} subtitles`,
        hints: [
          `Clean subtitles: youtube-parse subtitle clean "${subMatch?.[1]}"`,
          `Extract frames: youtube-parse frame extract "${videoFile}" --timestamps 00:01:00`,
        ],
      });
    } else {
      output({
        message: `Downloaded video to ${videoFile} (no subtitles available)`,
        hints: [
          `Download audio: youtube-parse download audio "${input.url}"`,
          "Then transcribe: youtube-parse transcribe <audio.wav> --lang auto",
        ],
      });
    }
  },

  subtitle: async ({ input }) => {
    await requireRequirements(["yt-dlp"]);

    const args = [
      "yt-dlp",
      input.url,
      "--skip-download",
      "--write-auto-sub",
      "--write-sub",
      "--sub-lang",
      input.lang,
      "--sub-format",
      "vtt",
    ];

    const result = await exec(args);

    if (!result.success) {
      // Check if it's a "no subtitles" error
      if (
        result.stderr.includes("no subtitles") ||
        result.stdout.includes("no subtitles")
      ) {
        output({
          message: "No subtitles available (neither manual nor auto-generated)",
          hints: [
            `Download video: youtube-parse download video "${input.url}"`,
            `Or download audio: youtube-parse download audio "${input.url}"`,
            "Then transcribe: youtube-parse transcribe <audio> --lang auto",
          ],
        });
        return;
      }
      fail(result.stderr || "Failed to download subtitles");
    }

    const subMatch = result.stdout.match(/Destination: (.+\.vtt)/i);
    if (subMatch?.[1]) {
      output({
        message: `Subtitles saved to ${subMatch[1]}`,
        hints: [
          `Clean subtitles: youtube-parse subtitle clean "${subMatch[1]}"`,
          `Extract timestamps: youtube-parse subtitle timestamp "${subMatch[1]}"`,
        ],
      });
    } else {
      output({
        message: "No subtitles available for this video",
        hints: [
          `Download audio: youtube-parse download audio "${input.url}"`,
          "Then transcribe: youtube-parse transcribe <audio> --lang auto",
        ],
      });
    }
  },

  audio: async ({ input }) => {
    await requireRequirements(["yt-dlp"]);

    const outputFile = input.output ?? "audio.m4a";

    const args = [
      "yt-dlp",
      input.url,
      "-f",
      "bestaudio[ext=m4a]/bestaudio",
      "-o",
      outputFile,
    ];

    const result = await exec(args);

    if (!result.success) {
      fail(result.stderr || "Failed to download audio");
    }

    output({
      message: `Audio saved to ${outputFile}`,
      hints: [
        `Convert to WAV: ffmpeg -i "${outputFile}" -vn -acodec pcm_s16le -ar 16000 -ac 1 audio.wav`,
        "Then transcribe: youtube-parse transcribe audio.wav --lang auto",
      ],
    });
  },
};
