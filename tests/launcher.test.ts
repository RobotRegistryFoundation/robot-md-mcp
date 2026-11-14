import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The plugin's .mcp.json runs scripts/start-mcp-server.py. It must refuse to
// start a robot-md older than 2.0.1. In 1.x the MCP motion tools move the arm
// from inside the server process instead of sending to robot-md-gateway; in
// 2.0.0 they send to the gateway but don't refuse a motion gated on a scope
// such as `destructive` or `system`.

const here = resolve(fileURLToPath(import.meta.url), "..");
const launcher = resolve(here, "..", "scripts", "start-mcp-server.py");

const which = spawnSync("sh", ["-c", "command -v python3"], { encoding: "utf8" });
const python3 = which.status === 0 ? which.stdout.trim() : "";
const runnable = process.platform !== "win32" && python3 !== "";

let root = "";

function fakeRobotMd(versionOutput: string, versionExit = 0): string {
  const dir = mkdtempSync(join(root, "bin-"));
  const exe = join(dir, "robot-md");
  writeFileSync(
    exe,
    [
      "#!/bin/sh",
      'if [ "$1" = "--version" ]; then',
      `  printf '%s\\n' "${versionOutput}"`,
      `  exit ${versionExit}`,
      "fi",
      'if [ "$1" = "mcp" ]; then',
      '  echo "MCP-STARTED $*"',
      "  exit 0",
      "fi",
      "exit 2",
      "",
    ].join("\n"),
  );
  chmodSync(exe, 0o755);
  return dir;
}

function launch(pathDir: string) {
  return spawnSync(python3, [launcher], {
    encoding: "utf8",
    timeout: 30000,
    env: { ...process.env, PATH: pathDir },
  });
}

describe.skipIf(!runnable)("plugin launcher (scripts/start-mcp-server.py)", () => {
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "robot-md-launcher-"));
  });
  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it("refuses robot-md 1.x and never starts its MCP server", () => {
    const result = launch(fakeRobotMd("robot-md 1.10.6"));
    expect(result.status).toBe(1);
    expect(result.stdout).not.toMatch(/MCP-STARTED/);
    expect(result.stderr).toMatch(/needs robot-md 2\.0\.1 or newer, and found 1\.10\.6/);
    expect(result.stderr).toMatch(/In robot-md 1\.x/);
    expect(result.stderr).toMatch(/robot-md-gateway/);
  });

  it("refuses robot-md 2.0.0, whose MCP server sends gated motion", () => {
    for (const version of ["robot-md 2.0.0", "robot-md 2.0.0.post1"]) {
      const result = launch(fakeRobotMd(version));
      expect(result.status).toBe(1);
      expect(result.stdout).not.toMatch(/MCP-STARTED/);
      expect(result.stderr).toMatch(/needs robot-md 2\.0\.1 or newer, and found 2\.0\.0/);
      expect(result.stderr).toMatch(/`destructive` or `system`/);
      expect(result.stderr).toMatch(/robot-md\[hardware\]>=2\.0\.1/);
    }
  });

  it("refuses when the version can't be read", () => {
    const result = launch(fakeRobotMd("robot-md (unknown)"));
    expect(result.status).toBe(1);
    expect(result.stdout).not.toMatch(/MCP-STARTED/);
    expect(result.stderr).toMatch(/not a release version/);
  });

  it("reads only the whole first line, so other text can't pass a 1.x", () => {
    for (const output of ["python 3.12.1 robot-md 1.10.6", "robot-md 1.10.6 (built on 2.0.1)"]) {
      const result = launch(fakeRobotMd(output));
      expect(result.status).toBe(1);
      expect(result.stdout).not.toMatch(/MCP-STARTED/);
    }
  });

  it("refuses a 2.0.1 pre-release or dev build", () => {
    for (const version of ["robot-md 2.0.1rc1", "robot-md 2.0.1a1", "robot-md 2.0.1.dev3"]) {
      const result = launch(fakeRobotMd(version));
      expect(result.status).toBe(1);
      expect(result.stdout).not.toMatch(/MCP-STARTED/);
    }
  });

  it("refuses when `robot-md --version` fails, even with a good version string", () => {
    const result = launch(fakeRobotMd("robot-md 2.0.1", 3));
    expect(result.status).toBe(1);
    expect(result.stdout).not.toMatch(/MCP-STARTED/);
    expect(result.stderr).toMatch(/exited 3/);
  });

  it("starts robot-md 2.0.1 or newer as `robot-md mcp`", () => {
    for (const version of ["robot-md 2.0.1", "robot-md 2.1.0", "robot-md 10.0.0", "robot-md 2.0.1.post1"]) {
      const result = launch(fakeRobotMd(version));
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/MCP-STARTED mcp/);
    }
  });

  it("gives the install line when robot-md isn't on PATH", () => {
    const empty = mkdtempSync(join(root, "empty-"));
    const result = launch(empty);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/was not found on PATH/);
    expect(result.stderr).toMatch(/robot-md\[hardware\]>=2\.0\.1/);
  });
});
