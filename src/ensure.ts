/**
 * Idempotent dependency checker/installer.
 * Called once at CLI startup.
 */

import { existsSync, mkdirSync } from "fs";

// ============================================================================
// Paths
// ============================================================================

export const SKILL_DIR = `${import.meta.dir}/..`;
export const MODELS_DIR = `${SKILL_DIR}/models`;
export const DEFAULT_MODEL = "ggml-large-v3-turbo-q5_0.bin";
export const MODEL_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${DEFAULT_MODEL}`;

export type Requirement =
  | "yt-dlp"
  | "ffmpeg"
  | "whisper-cli"
  | "uvx"
  | "whisper-model";

export function getModelPath(model?: string): string {
  return `${MODELS_DIR}/${model ?? DEFAULT_MODEL}`;
}

// ============================================================================
// Exec Helpers
// ============================================================================

async function exec(
  cmd: string[],
): Promise<{ success: boolean; output: string }> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { success: exitCode === 0, output: output.trim() };
}

async function execLive(cmd: string[]): Promise<boolean> {
  const proc = Bun.spawn(cmd, { stdout: "inherit", stderr: "inherit" });
  return (await proc.exited) === 0;
}

async function commandExists(cmd: string): Promise<boolean> {
  return (await exec(["which", cmd])).success;
}

// ============================================================================
// Installers
// ============================================================================

async function ensureBrew(pkg: string, cmd?: string): Promise<boolean> {
  const cmdName = cmd ?? pkg;
  if (await commandExists(cmdName)) return true;

  console.log(`Installing ${pkg}...`);
  return execLive(["brew", "install", pkg]);
}

async function ensureModel(): Promise<boolean> {
  const modelPath = getModelPath();
  if (existsSync(modelPath)) return true;

  console.log(`Downloading whisper model...`);
  mkdirSync(MODELS_DIR, { recursive: true });

  return execLive([
    "curl",
    "-L",
    "-C",
    "-",
    "--progress-bar",
    "-o",
    modelPath,
    MODEL_URL,
  ]);
}

// ============================================================================
// Main Ensure Function
// ============================================================================

export type EnsureResult = {
  ok: boolean;
  missing: string[];
};

const REQUIREMENT_TO_TOOL: Record<
  Exclude<Requirement, "whisper-model">,
  { pkg: string; cmd?: string }
> = {
  "yt-dlp": { pkg: "yt-dlp" },
  ffmpeg: { pkg: "ffmpeg" },
  "whisper-cli": { pkg: "whisper-cpp", cmd: "whisper-cli" },
  uvx: { pkg: "uv", cmd: "uvx" },
};

/**
 * Ensure all dependencies are installed.
 * Idempotent - safe to call multiple times.
 *
 * @param install - If true, attempt to install missing deps. If false, just check.
 */
export async function ensureAll(install = true): Promise<EnsureResult> {
  const missing: string[] = [];

  // Check brew first
  if (!(await commandExists("brew"))) {
    return { ok: false, missing: ["brew (install from https://brew.sh)"] };
  }

  return ensureRequirements(
    ["yt-dlp", "ffmpeg", "whisper-cli", "uvx", "whisper-model"],
    install,
  );
}

export async function ensureRequirements(
  requirements: Requirement[],
  install = true,
): Promise<EnsureResult> {
  const missing: string[] = [];

  if (!(await commandExists("brew"))) {
    return { ok: false, missing: ["brew (install from https://brew.sh)"] };
  }

  for (const requirement of requirements) {
    if (requirement === "whisper-model") {
      const modelPath = getModelPath();
      if (existsSync(modelPath)) continue;

      if (install) {
        const ok = await ensureModel();
        if (!ok) missing.push("whisper-model");
      } else {
        missing.push("whisper-model");
      }

      continue;
    }

    const { pkg, cmd } = REQUIREMENT_TO_TOOL[requirement];
    const cmdName = cmd ?? pkg;
    if (await commandExists(cmdName)) continue;

    if (install) {
      const ok = await ensureBrew(pkg, cmd);
      if (!ok) missing.push(requirement);
    } else {
      missing.push(requirement);
    }
  }

  return { ok: missing.length === 0, missing };
}

/**
 * Quick check if all deps exist (no install).
 */
export async function checkAll(): Promise<EnsureResult> {
  return ensureAll(false);
}
