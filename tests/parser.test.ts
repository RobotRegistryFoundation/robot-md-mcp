import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRobotMd, ParseError } from "../src/parser.js";

const here = resolve(fileURLToPath(import.meta.url), "..");
const fixture = (name: string) =>
  readFileSync(resolve(here, "fixtures", name), "utf8");

describe("parseRobotMd", () => {
  it("parses a valid minimal ROBOT.md", () => {
    const parsed = parseRobotMd(fixture("minimal.ROBOT.md"));
    expect(parsed.frontmatter).toMatchObject({
      rcan_version: "3.0",
      metadata: { robot_name: "test-bot" },
      physics: { type: "wheeled", dof: 2 },
    });
    expect(parsed.body).toContain("# test-bot");
    expect(parsed.body).toContain("Minimal test robot.");
  });

  it("preserves the raw input text", () => {
    const text = fixture("minimal.ROBOT.md");
    const parsed = parseRobotMd(text);
    expect(parsed.rawText).toBe(text);
  });

  it("throws ParseError when no frontmatter is present", () => {
    expect(() => parseRobotMd(fixture("no-frontmatter.md"))).toThrow(ParseError);
    expect(() => parseRobotMd(fixture("no-frontmatter.md"))).toThrow(/frontmatter/i);
  });

  it("throws ParseError on malformed YAML", () => {
    expect(() => parseRobotMd(fixture("bad-yaml.ROBOT.md"))).toThrow(ParseError);
  });

  it("throws ParseError when text does not start with ---", () => {
    expect(() => parseRobotMd("hello world")).toThrow(ParseError);
  });

  it("throws ParseError when frontmatter is an array (not a mapping)", () => {
    const text = "---\n- a\n- b\n---\n\n# foo\n";
    expect(() => parseRobotMd(text)).toThrow(/mapping/i);
  });
});
