import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as yamlParse } from "yaml";
import { parseRobotMd } from "../src/parser.js";
import { renderYaml } from "../src/render.js";

const here = resolve(fileURLToPath(import.meta.url), "..");
const fixture = (name: string) =>
  readFileSync(resolve(here, "fixtures", name), "utf8");

describe("renderYaml", () => {
  it("emits canonical YAML for the frontmatter", () => {
    const parsed = parseRobotMd(fixture("minimal.ROBOT.md"));
    const yaml = renderYaml(parsed);
    expect(yaml).toContain("rcan_version:");
    expect(yaml).toContain("robot_name: test-bot");
    expect(yaml).not.toContain("# test-bot"); // body stripped
  });

  it("round-trips: parse(render) equals the original frontmatter", () => {
    const parsed = parseRobotMd(fixture("minimal.ROBOT.md"));
    const rendered = renderYaml(parsed);
    const reparsed = yamlParse(rendered);
    expect(reparsed).toEqual(parsed.frontmatter);
  });
});
