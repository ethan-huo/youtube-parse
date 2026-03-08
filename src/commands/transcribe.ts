import { existsSync } from "fs";

import { exec, output, fail, getModelPath, requireRequirements } from "../lib";
import type { AppHandlers } from "../lib";

function checkFile(filePath: string): void {
  if (!existsSync(filePath)) {
    fail(`File not found: ${filePath}`);
  }
}

export const transcribeHandler: AppHandlers["transcribe"] = async ({
  input,
}) => {
  await requireRequirements(["whisper-cli", "whisper-model"]);
  checkFile(input.audio);
  const modelPath = getModelPath();

  const args = [
    "whisper-cli",
    "-m",
    modelPath,
    "-f",
    input.audio,
    "-l",
    input.lang,
    "-of",
    input.output,
  ];

  // Add format flags
  if (input.format === "all") {
    args.push("-osrt", "-oj");
  } else if (input.format === "srt") {
    args.push("-osrt");
  } else if (input.format === "json") {
    args.push("-oj");
  } else if (input.format === "vtt") {
    args.push("-ovtt");
  }

  if (input.background) {
    // Run in background using nohup
    const logFile = `${input.output}.log`;
    const bgCmd = ["nohup", ...args, ">", logFile, "2>&1", "&"];

    // Use shell to handle nohup + background
    const shellCmd = bgCmd.join(" ");
    await exec(["sh", "-c", shellCmd]);

    output({
      message: `Transcription started in background. Log: ${logFile}`,
      hints: [
        `Check progress: tail -f ${logFile}`,
        `Output files: ${input.output}.srt, ${input.output}.json`,
      ],
    });
    return;
  }

  // Run synchronously
  const result = await exec(args);

  if (!result.success) {
    fail(result.stderr || "Transcription failed");
  }

  const outputFiles: string[] = [];
  if (input.format === "all" || input.format === "srt") {
    outputFiles.push(`${input.output}.srt`);
  }
  if (input.format === "all" || input.format === "json") {
    outputFiles.push(`${input.output}.json`);
  }
  if (input.format === "vtt") {
    outputFiles.push(`${input.output}.vtt`);
  }

  output({
    message: `Transcription complete. Files: ${outputFiles.join(", ")}`,
    hints: [
      `Extract timestamps: youtube-parse subtitle timestamp ${input.output}.srt`,
      "For keyframes, search transcript for visual cue keywords",
    ],
  });
};
