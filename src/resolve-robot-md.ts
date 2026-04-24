import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

const UNEXPANDED_TEMPLATE = /\$\{[^}]+\}/;

/**
 * Resolve the ROBOT.md path used by the MCP server.
 *
 * Ladder:
 * 1. Explicit, existing path wins (absolute or relative to cwd).
 * 2. Explicit path that doesn't exist → throw (no silent fallback, so typos surface).
 * 3. Missing arg, or arg that still contains an unexpanded ${...} template
 *    (happens with MCP clients that don't substitute plugin env vars) →
 *    walk up from cwd looking for a ROBOT.md.
 * 4. Nothing found → throw with an actionable message.
 */
export function resolveRobotMdPath(argPath?: string): string {
  if (argPath && !UNEXPANDED_TEMPLATE.test(argPath)) {
    const abs = isAbsolute(argPath) ? argPath : resolve(process.cwd(), argPath);
    if (!existsSync(abs)) {
      throw new Error(`cannot read ${abs} (file does not exist).`);
    }
    return abs;
  }

  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, "ROBOT.md");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        "No ROBOT.md found. Pass a path explicitly, or open a project with ROBOT.md at the workspace root.",
      );
    }
    dir = parent;
  }
}
