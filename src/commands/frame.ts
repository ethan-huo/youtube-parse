import { existsSync, mkdirSync, readFileSync } from "fs";

import { exec, output, fail, requireRequirements } from "../lib";
import type { AppHandlers } from "../lib";

function checkFile(filePath: string): void {
  if (!existsSync(filePath)) {
    fail(`File not found: ${filePath}`);
  }
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Convert timestamp to filename-safe format.
 * 00:01:23.456 -> 00_01_23_456
 */
function safeTimestamp(ts: string): string {
  return ts.replace(/:/g, "_").replace(/\./g, "_");
}

async function extractSingleFrame(
  video: string,
  timestamp: string,
  outputPath: string,
): Promise<boolean> {
  const args = [
    "ffmpeg",
    "-ss",
    timestamp,
    "-i",
    video,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    outputPath,
    "-y", // Overwrite without asking
  ];

  const result = await exec(args);
  return result.success;
}

export const frameHandlers: AppHandlers["frame"] = {
  extract: async ({ input }) => {
    await requireRequirements(["ffmpeg"]);
    checkFile(input.video);
    ensureDir(input.output_dir);

    const results: Array<{
      timestamp: string;
      file: string;
      success: boolean;
    }> = [];

    for (let i = 0; i < input.timestamps.length; i++) {
      const ts = input.timestamps[i];
      if (!ts) continue;

      const safeTs = safeTimestamp(ts);
      const outputFile = `${input.output_dir}/frame_${String(i + 1).padStart(3, "0")}_${safeTs}.png`;

      const success = await extractSingleFrame(input.video, ts, outputFile);
      results.push({ timestamp: ts, file: outputFile, success });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    if (successCount === 0) {
      fail("Failed to extract any frames");
    }

    const outputFiles = results.filter((r) => r.success).map((r) => r.file);

    if (failCount > 0) {
      output({
        message: `Extracted ${successCount}/${results.length} frames to ${input.output_dir}/`,
        hints: [
          `${failCount} frames failed. Check timestamps format (HH:MM:SS or HH:MM:SS.mmm)`,
        ],
      });
    } else {
      output({
        message: `Extracted ${successCount} frames to ${input.output_dir}/`,
        hints: [
          `Frame files: ${outputFiles.slice(0, 3).join(", ")}${outputFiles.length > 3 ? "..." : ""}`,
        ],
      });
    }
  },

  batch: async ({ input }) => {
    await requireRequirements(["ffmpeg"]);
    checkFile(input.video);
    checkFile(input.file);
    ensureDir(input.output_dir);

    // Read timestamps from file
    const content = readFileSync(input.file, "utf-8");
    const timestamps = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    if (timestamps.length === 0) {
      fail("No timestamps found in file");
    }

    const results: Array<{
      timestamp: string;
      file: string;
      success: boolean;
    }> = [];

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      if (!ts) continue;

      const safeTs = safeTimestamp(ts);
      const outputFile = `${input.output_dir}/frame_${String(i + 1).padStart(3, "0")}_${safeTs}.png`;

      const success = await extractSingleFrame(input.video, ts, outputFile);
      results.push({ timestamp: ts, file: outputFile, success });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    if (successCount === 0) {
      fail("Failed to extract any frames");
    }

    if (failCount > 0) {
      output({
        message: `Batch extracted ${successCount}/${results.length} frames to ${input.output_dir}/`,
        hints: [`${failCount} frames failed. Check timestamps format.`],
      });
    } else {
      output({
        message: `Batch extracted ${successCount} frames to ${input.output_dir}/`,
      });
    }
  },
};
