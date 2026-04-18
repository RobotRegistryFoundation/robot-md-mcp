import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRobotMd } from "../src/parser.js";
import { validateParsed } from "../src/validate.js";

const here = resolve(fileURLToPath(import.meta.url), "..");
const fixture = (name: string) =>
  readFileSync(resolve(here, "fixtures", name), "utf8");

describe("validateParsed", () => {
  it("accepts a valid minimal manifest", () => {
    const result = validateParsed(parseRobotMd(fixture("minimal.ROBOT.md")));
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.summary).toContain("test-bot");
    expect(result.summary).toContain("wheeled");
    expect(result.summary).toContain("2 DoF");
  });

  it("reports schema violations when required fields are missing", () => {
    const result = validateParsed(parseRobotMd(fixture("missing-safety.ROBOT.md")));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("safety"))).toBe(true);
  });

  it("flags mismatch between H1 and metadata.robot_name", () => {
    const mismatched =
      `---
rcan_version: "3.0"
metadata:
  robot_name: alice
physics:
  type: wheeled
  dof: 2
drivers:
  - id: wheels
    protocol: pca9685
safety:
  estop:
    software: true
    response_ms: 200
---

# bob

## Identity
Has wrong H1.
`;
    const result = validateParsed(parseRobotMd(mismatched));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("H1"))).toBe(true);
  });

  it("flags missing H1 heading", () => {
    const noH1 =
      `---
rcan_version: "3.0"
metadata:
  robot_name: alice
physics:
  type: wheeled
  dof: 2
drivers:
  - id: wheels
    protocol: pca9685
safety:
  estop:
    software: true
    response_ms: 200
---

No heading here.
`;
    const result = validateParsed(parseRobotMd(noH1));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("h1"))).toBe(true);
  });

  it("flags a missing Identity body section (parity with Python validator)", () => {
    const result = validateParsed(
      parseRobotMd(fixture("missing-identity-section.ROBOT.md")),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("## Identity"))).toBe(true);
  });

  it("does NOT crash when frontmatter is null (defensive)", () => {
    const result = validateParsed({
      frontmatter: null as unknown as Record<string, unknown>,
      body: "",
      rawText: "",
    });
    expect(result.ok).toBe(false);
    expect(result.summary).toBe("? (?, 0 DoF, 0 capabilities)");
  });
});
