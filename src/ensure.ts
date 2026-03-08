import { existsSync } from "fs";
import { join } from "path";

export const SKILL_DIR = `${import.meta.dir}/..`;
export const LOCAL_VOX_BIN = join(
  SKILL_DIR,
  "..",
  "ontype-workspace",
  "vox",
  "vox",
);

export type Requirement = "yt-dlp" | "ffmpeg" | "uvx" | "vox";

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

async function ensureBrew(pkg: string, cmd?: string): Promise<boolean> {
  const cmdName = cmd ?? pkg;
  if (await commandExists(cmdName)) return true;

  console.log(`Installing ${pkg}...`);
  return execLive(["brew", "install", pkg]);
}

function isExecutableFile(path: string): boolean {
  return existsSync(path);
}

export async function resolveVoxBinary(): Promise<string | null> {
  const override = process.env.YOUTUBE_PARSE_VOX_BIN?.trim();
  if (override && isExecutableFile(override)) {
    return override;
  }

  if (await commandExists("vox")) {
    return "vox";
  }

  if (isExecutableFile(LOCAL_VOX_BIN)) {
    return LOCAL_VOX_BIN;
  }

  return null;
}

async function ensureVox(): Promise<boolean> {
  if ((await resolveVoxBinary()) !== null) return true;

  if (!(await commandExists("go"))) {
    return false;
  }

  console.log("Installing vox via go install...");
  return execLive(["go", "install", "github.com/ontypehq/vox@latest"]);
}

export type EnsureResult = {
  ok: boolean;
  missing: string[];
};

const REQUIREMENT_TO_TOOL: Record<
  Exclude<Requirement, "vox">,
  { pkg: string; cmd?: string }
> = {
  "yt-dlp": { pkg: "yt-dlp" },
  ffmpeg: { pkg: "ffmpeg" },
  uvx: { pkg: "uv", cmd: "uvx" },
};

export async function ensureAll(install = true): Promise<EnsureResult> {
  return ensureRequirements(["yt-dlp", "ffmpeg", "uvx", "vox"], install);
}

export async function ensureRequirements(
  requirements: Requirement[],
  install = true,
): Promise<EnsureResult> {
  const missing: string[] = [];

  const needsBrew = requirements.some((requirement) => requirement !== "vox");
  if (needsBrew && !(await commandExists("brew"))) {
    return { ok: false, missing: ["brew (install from https://brew.sh)"] };
  }

  for (const requirement of requirements) {
    if (requirement === "vox") {
      const voxBin = await resolveVoxBinary();
      if (voxBin) continue;

      if (install) {
        const ok = await ensureVox();
        if (!ok) missing.push("vox");
      } else {
        missing.push("vox");
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

export async function checkAll(): Promise<EnsureResult> {
  return ensureAll(false);
}
