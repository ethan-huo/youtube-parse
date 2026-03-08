import { existsSync } from "fs";
import { join } from "path";

import { exec, output, fail, requireRequirements, resolveVoxBinary } from "../lib";
import type { AppHandlers } from "../lib";

function checkFile(filePath: string): void {
  if (!existsSync(filePath)) {
    fail(`File not found: ${filePath}`);
  }
}

function wrapAsSrt(text: string): string {
  return `1\n00:00:00,000 --> 99:59:59,000\n${text.trim()}\n`;
}

function wrapAsVtt(text: string): string {
  return `WEBVTT\n\n00:00:00.000 --> 99:59:59.000\n${text.trim()}\n`;
}

function shellEscape(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function buildContext(lang: string): string | null {
  if (lang === "auto") return null;
  return `Language hint: the audio is primarily in ${lang}.`;
}

export const transcribeHandler: AppHandlers["transcribe"] = async ({
  input,
}) => {
  checkFile(input.audio);
  await requireRequirements(["vox"]);
  const voxBin = await resolveVoxBinary();
  if (!voxBin) {
    fail("vox not found. Install it with: go install github.com/ontypehq/vox@latest");
  }

  const context = buildContext(input.lang);

  const args = [
    voxBin,
    "hear",
    "-f",
    input.audio,
  ];
  if (context) {
    args.push("-c", context);
  }

  if (input.background) {
    const logFile = `${input.output}.log`;
    const cliPath = join(import.meta.dir, "..", "cli.ts");
    const bgArgs = [
      "bun",
      cliPath,
      "transcribe",
      input.audio,
      "--lang",
      input.lang,
      "--output",
      input.output,
      "--format",
      input.format,
    ];
    const cmdline = `${bgArgs.map(shellEscape).join(" ")} > ${shellEscape(logFile)} 2>&1 &`;
    await exec(["sh", "-c", `nohup ${cmdline}`]);

    output({
      message: `Transcription started in background. Log: ${logFile}`,
      hints: [
        `Check progress: tail -f ${logFile}`,
        `Output files will be written under ${input.output}.* when the job completes.`,
      ],
    });
    return;
  }

  const result = await exec(args);
  if (!result.success) {
    fail(result.stderr || "Transcription failed");
  }

  const text = result.stdout.trim();
  if (!text) {
    fail("Transcription returned empty output");
  }

  const outputFiles: string[] = [];
  if (input.format === "all") {
    await Bun.write(`${input.output}.txt`, `${text}\n`);
    outputFiles.push(`${input.output}.txt`);
  }

  if (input.format === "all" || input.format === "json") {
    await Bun.write(
      `${input.output}.json`,
      JSON.stringify({ backend: "vox", text }, null, 2) + "\n",
    );
    outputFiles.push(`${input.output}.json`);
  }

  if (input.format === "all" || input.format === "srt") {
    await Bun.write(`${input.output}.srt`, wrapAsSrt(text));
    outputFiles.push(`${input.output}.srt`);
  }

  if (input.format === "all" || input.format === "vtt") {
    await Bun.write(`${input.output}.vtt`, wrapAsVtt(text));
    outputFiles.push(`${input.output}.vtt`);
  }

  output({
    message: `Transcription complete. Files: ${outputFiles.join(", ")}`,
    hints: [
      "vox returns plain transcript text; generated .srt/.vtt files are single-block wrappers.",
      `Clean transcript: youtube-parse subtitle clean ${input.output}.vtt`,
    ],
  });
};
