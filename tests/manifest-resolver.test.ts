import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { resolveManifest } from "../src/manifest-resolver.js";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => ""),
  };
});

describe("resolveManifest", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.ROBOT_MD_PATH;
    vi.mocked(existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("prefers --path CLI argument over everything else", () => {
    const result = resolveManifest({
      cliPath: "/explicit/ROBOT.md",
      cwd: "/somewhere",
    });
    expect(result.path).toBe("/explicit/ROBOT.md");
    expect(result.source).toBe("cli");
  });

  it("falls through to ROBOT_MD_PATH env var", () => {
    process.env.ROBOT_MD_PATH = "/env/ROBOT.md";
    const result = resolveManifest({ cliPath: undefined, cwd: "/somewhere" });
    expect(result.path).toBe("/env/ROBOT.md");
    expect(result.source).toBe("env");
  });

  it("returns an error result when no source resolves", () => {
    const result = resolveManifest({ cliPath: undefined, cwd: "/nowhere" });
    expect(result.path).toBeNull();
    expect(result.source).toBe("none");
    expect(result.message).toMatch(/no ROBOT\.md found via/);
  });
});
