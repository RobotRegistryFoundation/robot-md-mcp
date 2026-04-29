/**
 * robot-md-http — REST + OpenAPI bridge for robot-md.
 *
 * Wraps the same parser/validator/renderer that powers robot-md-mcp, but
 * exposes them as REST endpoints so non-MCP clients (ChatGPT Custom GPT
 * Actions, OpenAI Agents SDK, n8n, Zapier, plain curl) can read and act
 * on a ROBOT.md file.
 *
 * v0.1 scope (see RobotRegistryFoundation/robot-md#3):
 *   GET  /robots/:name/frontmatter   — full YAML frontmatter as JSON
 *   GET  /robots/:name/capabilities  — capabilities[] array
 *   GET  /robots/:name/safety        — safety block as JSON
 *   GET  /robots/:name/body          — markdown body
 *   GET  /robots/:name/identity      — compact one-line identity
 *   GET  /robots/:name/context       — pre-rendered Markdown briefing
 *   POST /validate                   — validate a ROBOT.md text body
 *   POST /render                     — render canonical YAML for a ROBOT.md text body
 *   GET  /openapi.json               — OpenAPI 3.1 spec for ChatGPT Custom GPT Actions
 *
 * Per the issue, v0.1 is localhost-only (no auth, no rate limiting), launched
 * via `npx robot-md-http /path/to/ROBOT.md`. A hosted multi-tenant variant
 * with RCAN 3.0 envelope auth is out of scope until v0.2.
 */

import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { parseRobotMd, type ParsedRobotMd } from "./parser.js";
import { validateParsed } from "./validate.js";
import { renderYaml } from "./render.js";
import { openApiDoc } from "./openapi.js";

export interface HttpHandle {
  app: Hono;
  robotName: string;
  manifestPath: string;
}

function loadCurrent(manifestPath: string): ParsedRobotMd {
  return parseRobotMd(readFileSync(manifestPath, "utf8"));
}

function robotNameFrom(parsed: ParsedRobotMd): string {
  const fm = parsed.frontmatter as { metadata?: { robot_name?: string } };
  return (fm.metadata?.robot_name ?? "robot").toString();
}

function identityBlock(parsed: ParsedRobotMd): string {
  const fm = parsed.frontmatter as Record<string, unknown>;
  const meta = (fm.metadata as Record<string, unknown> | undefined) ?? {};
  const physics = (fm.physics as Record<string, unknown> | undefined) ?? {};
  const caps = (fm.capabilities as unknown[] | undefined) ?? [];
  const name = meta.robot_name ?? "robot";
  const rrn = meta.rrn as string | undefined;
  const parts = [
    `${name} (${physics.type ?? "?"}, ${physics.dof ?? 0} DoF, ${caps.length} capabilities)`,
    meta.manufacturer ? `manufacturer: ${meta.manufacturer}` : null,
    meta.model ? `model: ${meta.model}` : null,
    meta.version ? `version: ${meta.version}` : null,
    rrn ? `rrn: ${rrn} (https://rcan.dev/r/${rrn})` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function contextBlock(parsed: ParsedRobotMd, robotName: string): string {
  const fm = parsed.frontmatter as Record<string, unknown>;
  return [
    `# ${robotName}`,
    "",
    `**Identity:** ${identityBlock(parsed)}`,
    "",
    `**Capabilities:** ${JSON.stringify(fm.capabilities ?? [])}`,
    "",
    `**Safety:** ${JSON.stringify(fm.safety ?? {})}`,
    "",
    "## Body",
    "",
    parsed.body.trim(),
  ].join("\n");
}

/**
 * Build the Hono app. Pass the path to the ROBOT.md file. The app reads
 * the file fresh on each request so live edits show up without a restart.
 */
export function createHttpApp(manifestPath: string): HttpHandle {
  const seed = loadCurrent(manifestPath);
  const robotName = robotNameFrom(seed);
  const app = new Hono();

  app.get("/openapi.json", (c) => c.json(openApiDoc(robotName)));

  app.get("/health", (c) => c.json({ ok: true, robot: robotName }));

  app.get("/robots/:name/frontmatter", (c) => {
    if (c.req.param("name") !== robotName) return c.json({ error: "unknown robot" }, 404);
    return c.json(loadCurrent(manifestPath).frontmatter);
  });

  app.get("/robots/:name/capabilities", (c) => {
    if (c.req.param("name") !== robotName) return c.json({ error: "unknown robot" }, 404);
    const fm = loadCurrent(manifestPath).frontmatter as { capabilities?: unknown[] };
    return c.json(fm.capabilities ?? []);
  });

  app.get("/robots/:name/safety", (c) => {
    if (c.req.param("name") !== robotName) return c.json({ error: "unknown robot" }, 404);
    const fm = loadCurrent(manifestPath).frontmatter as { safety?: unknown };
    return c.json(fm.safety ?? {});
  });

  app.get("/robots/:name/body", (c) => {
    if (c.req.param("name") !== robotName) return c.json({ error: "unknown robot" }, 404);
    return c.text(loadCurrent(manifestPath).body);
  });

  app.get("/robots/:name/identity", (c) => {
    if (c.req.param("name") !== robotName) return c.json({ error: "unknown robot" }, 404);
    return c.text(identityBlock(loadCurrent(manifestPath)));
  });

  app.get("/robots/:name/context", (c) => {
    if (c.req.param("name") !== robotName) return c.json({ error: "unknown robot" }, 404);
    const parsed = loadCurrent(manifestPath);
    return c.text(contextBlock(parsed, robotName));
  });

  app.post("/validate", async (c) => {
    const text = await c.req.text();
    try {
      const parsed = parseRobotMd(text);
      const result = validateParsed(parsed);
      return c.json(result);
    } catch (e) {
      return c.json({ ok: false, errors: [{ message: String((e as Error).message) }] }, 400);
    }
  });

  app.post("/render", async (c) => {
    const text = await c.req.text();
    try {
      const parsed = parseRobotMd(text);
      return c.text(renderYaml(parsed));
    } catch (e) {
      return c.json({ error: String((e as Error).message) }, 400);
    }
  });

  return { app, robotName, manifestPath };
}
