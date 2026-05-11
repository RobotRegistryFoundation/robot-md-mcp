import { describe, expect, it } from "vitest";
import { describeManifestProblem } from "../src/errors.js";

describe("describeManifestProblem", () => {
  it("explains 'no ROBOT.md found' clearly", () => {
    const msg = describeManifestProblem({
      kind: "not-found",
      searchedPaths: ["/foo/ROBOT.md", "/ROBOT.md"],
    });
    expect(msg).toContain("no ROBOT.md found");
    expect(msg).toContain("Set ROBOT_MD_PATH");
  });

  it("explains invalid YAML clearly", () => {
    const msg = describeManifestProblem({
      kind: "yaml-error",
      path: "/foo/ROBOT.md",
      error: "unexpected token at line 5",
    });
    expect(msg).toContain("/foo/ROBOT.md");
    expect(msg).toContain("line 5");
  });

  it("explains schema violations clearly", () => {
    const msg = describeManifestProblem({
      kind: "schema-violation",
      path: "/foo/ROBOT.md",
      errors: ["missing required field: rcan_version", "capabilities must be a list"],
    });
    expect(msg).toContain("/foo/ROBOT.md");
    expect(msg).toContain("missing required field");
    expect(msg).toContain("capabilities must be a list");
  });
});
