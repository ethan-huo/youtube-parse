import { existsSync } from "fs";

import { exec, output, fail, requireRequirements } from "../lib";
import type { AppHandlers } from "../lib";

function checkFile(filePath: string): void {
  if (!existsSync(filePath)) {
    fail(`File not found: ${filePath}`);
  }
}

export const sceneHandlers: AppHandlers["scene"] = {
  detect: async ({ input }) => {
    await requireRequirements(["uvx"]);
    checkFile(input.video);

    const args = [
      "uvx",
      "--from",
      "scenedetect[opencv]",
      "scenedetect",
      "-i",
      input.video,
      "detect-adaptive",
    ];

    if (input.threshold !== undefined) {
      args.push("--threshold", String(input.threshold));
    }

    args.push("list-scenes");

    const result = await exec(args);

    if (!result.success) {
      fail(result.stderr || "Scene detection failed");
    }

    // Output CSV is typically named <video>-Scenes.csv
    const baseName = input.video.replace(/\.[^.]+$/, "");
    const csvFile = `${baseName}-Scenes.csv`;

    if (existsSync(csvFile)) {
      output({
        message: `Scene detection complete. Output: ${csvFile}`,
        hints: [
          `Read CSV to get scene timestamps`,
          `Use timestamps with: youtube-parse frame extract "${input.video}" --timestamps ...`,
        ],
      });
    } else {
      output({
        message: "Scene detection complete. Check stdout for results.",
      });
    }
  },
};
