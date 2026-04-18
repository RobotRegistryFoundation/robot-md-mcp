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

export function createServer(manifestPath: string): ServerHandle {
  const initial = loadCurrent(manifestPath);
  const robotName = robotNameFrom(initial);
  const base = `robot-md://${robotName}`;

  const server = new McpServer({
    name: "robot-md-mcp",
    version: pkg.version,
  });

  const register = (
    kind: "frontmatter" | "capabilities" | "safety" | "body",
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
    "frontmatter",
    "application/json",
    `${robotName} · frontmatter`,
    "The full YAML frontmatter of the ROBOT.md, as a JSON object.",
    (p) => JSON.stringify(p.frontmatter),
  );
  register(
    "capabilities",
    "application/json",
    `${robotName} · capabilities`,
    "The capabilities[] array from the frontmatter. What this robot can do.",
    (p) => JSON.stringify((p.frontmatter as { capabilities?: unknown[] }).capabilities ?? []),
  );
  register(
    "safety",
    "application/json",
    `${robotName} · safety`,
    "The safety block from the frontmatter (E-stop, HITL gates, workspace bounds, failsafe).",
    (p) => JSON.stringify((p.frontmatter as { safety?: unknown }).safety ?? {}),
  );
  register(
    "body",
    "text/markdown",
    `${robotName} · body`,
    "The prose body of the ROBOT.md — Identity, capabilities narrative, and safety gates in plain English.",
    (p) => p.body,
  );

  server.registerTool(
    "validate",
    {
      title: "Validate ROBOT.md",
      description: "Validate the served ROBOT.md against the v1 schema and body rules.",
      inputSchema: {},
    },
    async () => {
      const result = validateParsed(loadCurrent(manifestPath));
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    },
  );

  server.registerTool(
    "render",
    {
      title: "Render frontmatter as YAML",
      description: "Strip prose and return the frontmatter as canonical YAML.",
      inputSchema: {},
    },
    async () => {
      const yaml = renderYaml(loadCurrent(manifestPath));
      return {
        content: [{ type: "text", text: yaml }],
      };
    },
  );

  return { server, robotName, manifestPath };
}
