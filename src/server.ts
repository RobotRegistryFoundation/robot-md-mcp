import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import pkg from "../package.json" with { type: "json" };
import { parseRobotMd, type ParsedRobotMd } from "./parser.js";
import { validateParsed } from "./validate.js";
import { renderYaml } from "./render.js";

export interface ServerHandle {
  server: McpServer;
  robotName: string;
  manifestPath: string;
}

function loadCurrent(manifestPath: string): ParsedRobotMd {
  const text = readFileSync(manifestPath, "utf8");
  return parseRobotMd(text);
}

function robotNameFrom(parsed: ParsedRobotMd): string {
  const name = (parsed.frontmatter as { metadata?: { robot_name?: string } })
    .metadata?.robot_name;
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error(
      "manifest is missing metadata.robot_name; robot-md-mcp needs it to namespace resource URIs.",
    );
  }
  return name.trim();
}

function identityBlock(parsed: ParsedRobotMd): string {
  const md = (parsed.frontmatter as { metadata?: Record<string, unknown> }).metadata ?? {};
  const physics = (parsed.frontmatter as { physics?: Record<string, unknown> }).physics ?? {};
  const caps = (parsed.frontmatter as { capabilities?: unknown[] }).capabilities ?? [];
  const rrn = md.rrn as string | undefined;
  const name = md.robot_name ?? "?";
  const parts: string[] = [
    `${name} (${physics.type ?? "?"}, ${physics.dof ?? 0} DoF, ${caps.length} capabilities)`,
  ];
  if (md.manufacturer) parts.push(`manufacturer=${md.manufacturer}`);
  if (md.model) parts.push(`model=${md.model}`);
  if (md.version) parts.push(`version=${md.version}`);
  if (md.device_id) parts.push(`device_id=${md.device_id}`);
  if (rrn) parts.push(`rrn=${rrn}  resolver=https://rcan.dev/r/${rrn}`);
  else parts.push("rrn=(unregistered)");
  return parts.join(" · ");
}

function claudeContext(parsed: ParsedRobotMd, robotName: string): string {
  const fm = parsed.frontmatter as Record<string, unknown>;
  const md = (fm.metadata ?? {}) as Record<string, unknown>;
  const physics = (fm.physics ?? {}) as Record<string, unknown>;
  const caps = (fm.capabilities as unknown[] | undefined) ?? [];
  const safety = (fm.safety as Record<string, unknown> | undefined) ?? {};
  const gates = ((safety.hitl_gates as unknown[] | undefined) ?? []) as Array<
    Record<string, unknown>
  >;
  const estop = (safety.estop as Record<string, unknown> | undefined) ?? {};
  const rrn = md.rrn as string | undefined;

  const gateLines =
    gates.length === 0
      ? "- *No HITL gates declared.* Surface this gap to the operator before any motion."
      : gates
          .map(
            (g) =>
              `- \`${g.scope ?? "?"}\`${g.require_auth ? " — requires explicit authorization" : ""}`,
          )
          .join("\n");

  const capLines = caps.length === 0 ? "- (none declared)" : caps.map((c) => `- \`${c}\``).join("\n");

  return `# Robot context — ${robotName}

${identityBlock(parsed)}
${rrn ? `Public resolver: https://rcan.dev/r/${rrn}` : ""}

## Capabilities

${capLines}

## Safety gates

${gateLines}

E-stop: software=${estop.software ?? false} response_ms=${estop.response_ms ?? "?"}${estop.hardware ? " · hardware e-stop present" : ""}

## What's authoritative

\`ROBOT.md\` is the source of truth. When answering questions about what this robot
can do, what's safe, or how it's configured, read from the manifest's
\`robot-md://${robotName}/frontmatter\`, \`/capabilities\`, or \`/safety\` resources
rather than assuming or guessing.

## Before any physical motion

Check the HITL gate list above. If the operator's request matches a declared
scope with \`require_auth: true\`, stop and ask for explicit authorization. If
no matching gate exists for a potentially-harmful motion, surface that gap
instead of silently proceeding.

## Body (from the manifest's prose section)

${parsed.body.trim() || "(no prose body)"}
`;
}

function doctorSummary(parsed: ParsedRobotMd): Record<string, unknown> {
  const fm = parsed.frontmatter;
  const result = validateParsed(parsed);
  const drivers = ((fm as { drivers?: Array<Record<string, unknown>> }).drivers ?? []).map((d) => ({
    id: d.id,
    protocol: d.protocol,
    port: d.port,
    host: d.host,
  }));
  const md = (fm as { metadata?: Record<string, unknown> }).metadata ?? {};
  const safety = (fm as { safety?: Record<string, unknown> }).safety ?? {};
  const gates = ((safety.hitl_gates as unknown[] | undefined) ?? []) as Array<
    Record<string, unknown>
  >;
  return {
    schema_ok: result.ok,
    schema_errors: result.errors,
    robot_name: md.robot_name,
    rrn: md.rrn ?? null,
    registered: Boolean(md.rrn),
    dof: (fm as { physics?: { dof?: number } }).physics?.dof ?? 0,
    capabilities_count: ((fm as { capabilities?: unknown[] }).capabilities ?? []).length,
    drivers,
    hitl_gates: gates.map((g) => ({ scope: g.scope, require_auth: g.require_auth ?? false })),
    estop: safety.estop ?? null,
    notes: [
      "This is a read-only, manifest-only check. To probe live hardware (port reachability, servo response, registry lookup), run `robot-md doctor` from the shell.",
    ],
  };
}

const SERVER_INSTRUCTIONS = `
This MCP server exposes a ROBOT.md file — the single-file declaration of what
a robot IS and what it CAN DO. Treat it as the authoritative source for every
question about this robot's identity, capabilities, safety posture, drivers,
and registry status. Do not guess or answer from general robotics knowledge
when the manifest has the answer.

When to route to this server (operator-intent → resource/tool):

  "What can this robot do?"                        → resource: .../capabilities
  "What are its safety gates?" / "Is X dangerous?" → resource: .../safety
  "Give me the full context" / "Brief me"          → resource: .../context
  "What's it called? What's its RRN?"              → resource: .../identity
  "Read the manifest" / "What's in the YAML?"      → resource: .../frontmatter
  "Read the prose" / "What does the README say?"   → resource: .../body
  "Is the manifest valid?" / "Did I break it?"     → tool:     validate
  "Give me the canonical YAML"                     → tool:     render
  "Quick-check the robot"                          → tool:     doctor_summary

Before advising ANY physical motion ("pick that up", "move forward", "rotate"),
read .../safety first. If the requested scope matches a declared hitl_gate with
require_auth: true, pause and ask the operator for explicit authorization
before issuing a driver command. If no matching gate exists for a
potentially-harmful motion, surface the gap to the operator rather than
silently proceeding.

The .../context resource is the single best resource to read at session start:
it combines identity, capabilities, safety gates, and the prose body into one
block suitable for system-prompt injection.
`.trim();

export function createServer(manifestPath: string): ServerHandle {
  const initial = loadCurrent(manifestPath);
  const robotName = robotNameFrom(initial);
  const base = `robot-md://${robotName}`;

  const server = new McpServer(
    {
      name: "robot-md-mcp",
      version: pkg.version,
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  const register = (
    kind: "frontmatter" | "capabilities" | "safety" | "body" | "identity" | "context",
    mimeType: string,
    title: string,
    description: string,
    getBody: (parsed: ParsedRobotMd) => string,
  ) => {
    const uri = `${base}/${kind}`;
    server.registerResource(
      kind,
      uri,
      { mimeType, title, description },
      async () => ({
        contents: [
          {
            uri,
            mimeType,
            text: getBody(loadCurrent(manifestPath)),
          },
        ],
      }),
    );
  };

  register(
    "identity",
    "text/plain",
    `${robotName} · identity`,
    `Compact one-line identity for ${robotName}: name, physics type, DoF, capabilities count, manufacturer/model/version, device_id, and RRN (plus public resolver URL if registered). Read this FIRST at session start — it's the cheapest way to orient. Matches operator phrases like: "what is this robot", "what's its RRN", "who made this arm".`,
    (p) => identityBlock(p),
  );

  register(
    "context",
    "text/markdown",
    `${robotName} · Claude-ready context`,
    `Pre-rendered Markdown context block combining identity, capabilities, HITL gates, E-stop configuration, and the prose body into one document. Designed for system-prompt injection or a "brief me on this robot" first turn. Matches operator phrases like: "give me the full context", "brief me on this robot", "what should I know before operating", "tell me everything about this robot".`,
    (p) => claudeContext(p, robotName),
  );

  register(
    "frontmatter",
    "application/json",
    `${robotName} · frontmatter`,
    `Full YAML frontmatter of the ROBOT.md serialized as a JSON object. Contains every declared field: metadata, physics, drivers, safety, capabilities, compliance, network, extensions. Use when you need to inspect a specific nested field that isn't surfaced by a narrower resource. Matches operator phrases like: "read the manifest", "what's in the frontmatter", "dump the YAML as JSON", "what's the servo_id of the wrist".`,
    (p) => JSON.stringify(p.frontmatter, null, 2),
  );

  register(
    "capabilities",
    "application/json",
    `${robotName} · capabilities`,
    `The capabilities[] array from the manifest — every action this robot declares it can perform (e.g. arm.pick, nav.go_to, vision.describe). This is the authoritative list; do not claim the robot can do anything not listed here without operator confirmation. Matches operator phrases like: "what can this robot do", "what are its capabilities", "can it pick things up", "does it have a camera", "is navigation available".`,
    (p) => JSON.stringify((p.frontmatter as { capabilities?: unknown[] }).capabilities ?? [], null, 2),
  );

  register(
    "safety",
    "application/json",
    `${robotName} · safety`,
    `The safety block from the manifest — HITL gates (with scope + require_auth flags), E-stop configuration (software/hardware/response_ms), payload limits, workspace bounds, failsafe behavior. READ THIS BEFORE ADVISING ANY PHYSICAL MOTION. If the requested action's scope matches a gate with require_auth: true, ask the operator for explicit authorization first. Matches operator phrases like: "what are the safety gates", "is it safe to X", "what needs human approval", "what's the E-stop setup", "can I do X autonomously".`,
    (p) => JSON.stringify((p.frontmatter as { safety?: unknown }).safety ?? {}, null, 2),
  );

  register(
    "body",
    "text/markdown",
    `${robotName} · prose body`,
    `The markdown prose body of ROBOT.md (everything after the closing '---'). Usually contains Identity, "What this robot can do", and Safety Gates sections written for a planner LLM to read. Use this when you need the operator's narrative explanation, not the machine-readable fields. Matches operator phrases like: "read the README", "what does the operator say about this robot", "tell me the background".`,
    (p) => p.body,
  );

  server.registerTool(
    "validate",
    {
      title: "Validate ROBOT.md",
      description: `Validate the served ROBOT.md against the v1 JSON schema and body requirements. Returns { ok: boolean, errors: [...] }. Run this after any edit to the manifest, or when the operator asks "did I break it", "is the manifest still valid", "why won't it load". Safe to run repeatedly — read-only.`,
      inputSchema: {},
    },
    async () => {
      const result = validateParsed(loadCurrent(manifestPath));
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "render",
    {
      title: "Render frontmatter as YAML",
      description: `Strip the prose body and emit the frontmatter as canonical YAML. Use when the operator asks "dump the YAML", "give me just the config", "I need the frontmatter to pipe into another tool". The output matches what \`robot-md render ROBOT.md\` produces from the shell.`,
      inputSchema: {},
    },
    async () => {
      const yaml = renderYaml(loadCurrent(manifestPath));
      return {
        content: [{ type: "text", text: yaml }],
      };
    },
  );

  server.registerTool(
    "doctor_summary",
    {
      title: "Quick-check the robot (manifest-only)",
      description: `Read-only, manifest-only sanity check. Returns a JSON object with schema status, identity fields, driver summary, HITL gates, E-stop config, and registration status. This is cheaper + safer than the full \`robot-md doctor\` CLI (which also probes network + drivers). Use when the operator asks "is everything OK", "quick-check", "what's the state of the manifest". For live hardware diagnostics, tell the operator to run \`robot-md doctor\` from the shell.`,
      inputSchema: {},
    },
    async () => {
      const summary = doctorSummary(loadCurrent(manifestPath));
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    },
  );

  return { server, robotName, manifestPath };
}
