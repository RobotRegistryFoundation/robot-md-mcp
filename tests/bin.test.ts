import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = resolve(fileURLToPath(import.meta.url), "..");
const bin = resolve(here, "..", "src", "bin.ts");

// Run via tsx so we don't require a build between test iterations.
function run(args: string[]) {
  return spawnSync("node", ["--import", "tsx/esm", bin, ...args], {
    encoding: "utf8",
    timeout: 2000,
  });
}

describe("robot-md-mcp CLI", () => {
  it("errors when no path is provided", () => {
    const result = spawnSync("node", ["--import", "tsx/esm", bin], {
      encoding: "utf8",
      timeout: 2000,
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Usage|path/i);
  });

  it("errors when the path does not exist", () => {
    const result = run(["/tmp/definitely-does-not-exist.ROBOT.md"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/read|ENOENT|not found/i);
  });

  // The happy-path stdio run is an integration test covered via the
  // in-process MCP client in server.test.ts. A CLI "starts then we
  // kill it" check is flaky across runners; skip it here.
});
