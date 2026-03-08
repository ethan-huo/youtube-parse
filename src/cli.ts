#!/usr/bin/env bun
import { downloadHandlers } from "./commands/download";
import { frameHandlers } from "./commands/frame";
import { sceneHandlers } from "./commands/scene";
import { subtitleHandlers } from "./commands/subtitle";
import { transcribeHandler } from "./commands/transcribe";
import { app } from "./lib";

const passthroughFlags = new Set([
  "--help",
  "-h",
  "--schema",
  "--version",
  "-v",
  "--completions",
]);

const argv = process.argv.slice(2);
const shouldEnsureDeps = argv.length > 0 && !argv.some((arg) => passthroughFlags.has(arg));

app
  .run({
    handlers: {
      download: downloadHandlers,
      subtitle: subtitleHandlers,
      transcribe: transcribeHandler,
      scene: sceneHandlers,
      frame: frameHandlers,
    },
  })
  .catch((e: Error) => {
    console.log(`error: ${e.message}`);
    process.exit(1);
  });
