import { cli } from "argc";

import { print } from "./fmt";

import { schema } from "./schema";

// Re-export from ensure.ts
export {
  SKILL_DIR,
  ensureAll,
  ensureRequirements,
  checkAll,
  resolveVoxBinary,
} from "./ensure";

import { ensureRequirements, type Requirement } from "./ensure";

// ============================================================================
// Types
// ============================================================================

export type CLIResult = {
  message: string;
  hints?: string[];
};

// ============================================================================
// Output
// ============================================================================

/**
 * Output success message with optional hints for agent guidance.
 */
export function output(result: CLIResult): void {
  print(result);
}

/**
 * Output error and exit.
 */
export function fail(error: string): never {
  print({ error });
  process.exit(1);
}

export async function requireRequirements(
  requirements: Requirement[],
): Promise<void> {
  const { ok, missing } = await ensureRequirements(requirements);
  if (!ok) {
    fail(`Missing dependencies: ${missing.join(", ")}`);
  }
}

// ============================================================================
// Shell Execution
// ============================================================================

export type ExecResult = {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
};

/**
 * Execute shell command and return result.
 */
export async function exec(
  cmd: string[],
  options?: { cwd?: string },
): Promise<ExecResult> {
  const proc = Bun.spawn(cmd, {
    cwd: options?.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;

  return {
    success: exitCode === 0,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode,
  };
}

// ============================================================================
// App
// ============================================================================

export const app = cli(schema, {
  name: "youtube-parse",
  version: "1.0.0",
  description: "YouTube video parsing toolkit for agents",
});

export type AppHandlers = typeof app.Handlers;
