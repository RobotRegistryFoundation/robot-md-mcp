import * as ajvNs from "ajv/dist/2020.js";
import * as ajvFormatsNs from "ajv-formats";
import type { ErrorObject } from "ajv/dist/2020.js";
import schema from "./schema/robot.schema.json" with { type: "json" };
import type { ParsedRobotMd } from "./parser.js";

export interface ValidateResult {
  ok: boolean;
  summary: string;
  errors: string[];
}

// ajv 8.x CJS ships `Ajv2020` as a named export and also as `default`.
// Under NodeNext module resolution, a namespace import is the most type-safe
// way to construct the class without relying on `esModuleInterop`-style
// synthetic defaults.
const Ajv2020 = ajvNs.Ajv2020;
// ajv-formats 3.x CJS assigns `module.exports = exports = formatsPlugin`, so
// at runtime the namespace is itself callable. TypeScript models it as the
// module object though, so reach through `.default` for the callable plugin.
const addFormats = (ajvFormatsNs as unknown as { default: (ajv: object) => unknown }).default;

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateFn = ajv.compile(schema as object);

function formatAjvError(err: ErrorObject): string {
  const path = err.instancePath || "(root)";
  return `${path}: ${err.message}`;
}

function h1(body: string): string | null {
  const m = body.match(/^\s*#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}

export function validateParsed(parsed: ParsedRobotMd): ValidateResult {
  const errors: string[] = [];

  const schemaValid = validateFn(parsed.frontmatter);
  if (!schemaValid && validateFn.errors) {
    for (const err of validateFn.errors) {
      errors.push(formatAjvError(err));
    }
  }

  const fm = parsed.frontmatter as {
    metadata?: { robot_name?: string };
    physics?: { type?: string; dof?: number };
    capabilities?: unknown[];
  };
  const robotName = fm.metadata?.robot_name;
  if (typeof robotName === "string" && robotName.trim() !== "") {
    const found = h1(parsed.body);
    if (found === null) {
      errors.push(`body: missing H1 heading (expected "# ${robotName}").`);
    } else if (found !== robotName.trim()) {
      errors.push(
        `body: H1 "${found}" does not match metadata.robot_name "${robotName}".`,
      );
    }
  }

  const physicsType = fm.physics?.type ?? "?";
  const dof = typeof fm.physics?.dof === "number" ? fm.physics.dof : 0;
  const caps = Array.isArray(fm.capabilities) ? fm.capabilities.length : 0;
  const summary = `${robotName ?? "?"} (${physicsType}, ${dof} DoF, ${caps} capabilities)`;

  return { ok: errors.length === 0, summary, errors };
}
