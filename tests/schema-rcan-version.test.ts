/**
 * Regression tests for Release C schema tightening: rcan_version
 * must match pattern ^3\.[0-9]+(\.[0-9]+)?$ (RCAN 3.0+ only).
 */

import { describe, it, expect } from "vitest";
import * as ajvNs from "ajv/dist/2020.js";
import * as ajvFormatsNs from "ajv-formats";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(here, "..", "src", "schema", "robot.schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

// Mirror the import pattern from src/validate.ts: schema uses draft 2020-12,
// so we must use Ajv2020 (not the default Ajv which is draft-07).
const Ajv2020 = ajvNs.Ajv2020;
const addFormats = (ajvFormatsNs as unknown as { default: (ajv: object) => unknown }).default;

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

/**
 * Minimal fixture that satisfies the rest of the schema — filled with plausible
 * values for required fields. Individual tests override only rcan_version.
 *
 * Required top-level: rcan_version, metadata, physics, drivers, safety
 * metadata required: robot_name
 * physics required: type, dof
 * drivers items required: id, protocol  (array, minItems 1)
 * safety required: estop { software: true, response_ms: number }
 */
function makeFixture(rcanVersion: string): Record<string, unknown> {
  return {
    rcan_version: rcanVersion,
    metadata: { robot_name: "test-bot" },
    physics: { type: "arm", dof: 6 },
    drivers: [{ id: "test", protocol: "simulation" }],
    safety: {
      estop: { software: true, response_ms: 200 },
    },
  };
}

describe("rcan_version schema gate (Release C)", () => {
  it("accepts 3.0", () => {
    const ok = validate(makeFixture("3.0"));
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it("accepts 3.1", () => {
    expect(validate(makeFixture("3.1"))).toBe(true);
  });

  it("accepts 3.1.1", () => {
    expect(validate(makeFixture("3.1.1"))).toBe(true);
  });

  it("rejects 2.1", () => {
    const ok = validate(makeFixture("2.1"));
    expect(ok).toBe(false);
    const patternErr = validate.errors?.find(e => e.keyword === "pattern");
    expect(patternErr).toBeDefined();
  });

  it("rejects 2.2.1", () => {
    expect(validate(makeFixture("2.2.1"))).toBe(false);
  });

  it("rejects 1.6", () => {
    expect(validate(makeFixture("1.6"))).toBe(false);
  });

  it("rejects 4.0 (no free pass for future majors)", () => {
    expect(validate(makeFixture("4.0"))).toBe(false);
  });
});
