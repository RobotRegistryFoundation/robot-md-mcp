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
  const m = body.match(/^\s*#\s+(.+?)\s*#*\s*$/m);
  // Strip ATX-style trailing hashes (e.g. "# Bob #" → "Bob") to match
  // CommonMark's decoration convention.
  return m ? m[1].trim() : null;
}

// Mirror the Python validator's required body sections. Kept in sync with
// /home/craigm26/robot-md/cli/src/robot_md/validate.py : REQUIRED_BODY_SECTIONS.
const REQUIRED_BODY_SECTIONS = ["## Identity", "## Safety Gates"];

export function validateParsed(parsed: ParsedRobotMd): ValidateResult {
  const errors: string[] = [];

  // Defensive: validator may be called with a hand-built ParsedRobotMd where
  // frontmatter is null / non-object. Parser rejects this in practice, but
  // guard the direct-call path so MCP tool invocations never crash.
  const fmRaw: unknown = parsed.frontmatter;
  const fm =
    fmRaw !== null && typeof fmRaw === "object" && !Array.isArray(fmRaw)
      ? (fmRaw as {
          metadata?: { robot_name?: string };
          physics?: { type?: string; dof?: number };
          capabilities?: unknown[];
        })
      : {};

  const schemaValid = validateFn(fmRaw);
  if (!schemaValid && validateFn.errors) {
    for (const err of validateFn.errors) {
      errors.push(formatAjvError(err));
    }
  }

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

    for (const section of REQUIRED_BODY_SECTIONS) {
      if (!parsed.body.includes(section)) {
        errors.push(`body: missing required section '${section}'.`);
      }
    }
    const whatPattern = new RegExp(
      `^## What ${robotName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} Can Do\\s*$`,
      "im",
    );
    if (!whatPattern.test(parsed.body)) {
      errors.push(
        `body: missing required section '## What ${robotName} Can Do' (case-insensitive).`,
      );
    }
  }

  const physicsType = fm.physics?.type ?? "?";
  const dof = typeof fm.physics?.dof === "number" ? fm.physics.dof : 0;
  const caps = Array.isArray(fm.capabilities) ? fm.capabilities.length : 0;
  const summary = `${robotName ?? "?"} (${physicsType}, ${dof} DoF, ${caps} capabilities)`;

  return { ok: errors.length === 0, summary, errors };
}
