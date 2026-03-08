import { existsSync, statSync } from "fs";

import {
  cleanSubtitle,
  cleanAndMerge,
  cleanAndJoin,
  extractTimestampedAuto,
} from "../vtt";
import { output, fail } from "../lib";
import type { AppHandlers } from "../lib";

function checkFile(filePath: string): void {
  if (!existsSync(filePath)) {
    fail(`File not found: ${filePath}`);
  }
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

function deriveOutputPath(inputFile: string, suffix: string): string {
  const base = inputFile.replace(/\.(vtt|srt|txt)$/i, "");
  return `${base}${suffix}`;
}

function countLines(filePath: string): number {
  const content = require("fs").readFileSync(filePath, "utf-8");
  return content.split("\n").length;
}

export const subtitleHandlers: AppHandlers["subtitle"] = {
  clean: async ({ input }) => {
    checkFile(input.file);

    const content = await Bun.file(input.file).text();
    const inputLines = content.split("\n").length;
    const inputStats = statSync(input.file);
    const inputSize = formatSize(inputStats.size);

    let lines: string[];
    let suffix: string;
    let mode: string;

    if (input.join) {
      lines = cleanAndJoin(content, input.width);
      suffix = ".joined.txt";
      mode = "joined";
    } else if (input.merge) {
      lines = cleanAndMerge(content);
      suffix = ".merged.txt";
      mode = "merged";
    } else {
      lines = cleanSubtitle(content);
      suffix = ".clean.txt";
      mode = "cleaned";
    }

    const outputText = lines.join("\n");
    const outputPath = input.output ?? deriveOutputPath(input.file, suffix);
    await Bun.write(outputPath, outputText);

    const outputSize = formatSize(outputText.length);
    const outputLines = lines.length;

    output({
      message: `${mode}: ${inputLines} lines (${inputSize}) -> ${outputLines} lines (${outputSize}), saved to ${outputPath}`,
    });
  },

  timestamp: async ({ input }) => {
    checkFile(input.file);

    const content = await Bun.file(input.file).text();
    const entries = extractTimestampedAuto(content);

    if (entries.length === 0) {
      fail(
        "No timestamped entries found. Check if the file format is correct.",
      );
    }

    const outputPath =
      input.output ?? input.file.replace(/\.(vtt|srt)$/i, ".timestamp.txt");
    const outputContent = entries
      .map((e) => `${e.time} | ${e.text}`)
      .join("\n");
    await Bun.write(outputPath, outputContent);

    const inputStats = statSync(input.file);
    const inputSize = formatSize(inputStats.size);
    const outputSize = formatSize(outputContent.length);

    output({
      message: `extracted: ${entries.length} entries (${inputSize} -> ${outputSize}), saved to ${outputPath}`,
    });
  },
};
