import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRobotMdPath } from "../src/resolve-robot-md.js";

describe("resolveRobotMdPath", () => {
  let sandbox: string;
  let originalCwd: string;

  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), "rmmcp-resolve-"));
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(sandbox, { recursive: true, force: true });
  });

  it("returns the absolute form of an explicit existing path", () => {
    const file = join(sandbox, "ROBOT.md");
    writeFileSync(file, "# robot");
    expect(resolveRobotMdPath(file)).toBe(file);
  });

  it("resolves an explicit relative path against cwd", () => {
    const file = join(sandbox, "ROBOT.md");
    writeFileSync(file, "# robot");
    process.chdir(sandbox);
    expect(resolveRobotMdPath("ROBOT.md")).toBe(file);
  });

  it("walks up from cwd to find ROBOT.md when no arg is given", () => {
    const file = join(sandbox, "ROBOT.md");
    writeFileSync(file, "# robot");
    const deep = join(sandbox, "a", "b", "c");
    mkdirSync(deep, { recursive: true });
    process.chdir(deep);
    expect(resolveRobotMdPath()).toBe(file);
  });

  it("treats an unexpanded template like ${CLAUDE_PROJECT_DIR}/ROBOT.md as missing and falls back to cwd walk", () => {
    const file = join(sandbox, "ROBOT.md");
    writeFileSync(file, "# robot");
    process.chdir(sandbox);
    expect(resolveRobotMdPath("${CLAUDE_PROJECT_DIR}/ROBOT.md")).toBe(file);
  });

  it("throws a clear error when no ROBOT.md can be found", () => {
    const bare = mkdtempSync(join(tmpdir(), "rmmcp-bare-"));
    try {
      process.chdir(bare);
      expect(() => resolveRobotMdPath()).toThrow(/No ROBOT\.md found/);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });

  it("throws when an explicit path points at a non-existent file (no silent fallback)", () => {
    process.chdir(sandbox);
    expect(() => resolveRobotMdPath(join(sandbox, "does-not-exist.md"))).toThrow(
      /cannot read/,
    );
  });
});
