import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
    version: "0.1.0",
  });

  const register = (
    kind: "frontmatter" | "capabilities" | "safety" | "body",
    mimeType: string,
    getBody: (parsed: ParsedRobotMd) => string,
  ) => {
    const uri = `${base}/${kind}`;
    server.resource(kind, uri, async () => ({
      contents: [
        {
          uri,
          mimeType,
          text: getBody(loadCurrent(manifestPath)),
        },
      ],
    }));
  };

  register("frontmatter", "application/json", (p) => JSON.stringify(p.frontmatter));
  register("capabilities", "application/json", (p) =>
    JSON.stringify((p.frontmatter as { capabilities?: unknown[] }).capabilities ?? []),
  );
  register("safety", "application/json", (p) =>
    JSON.stringify((p.frontmatter as { safety?: unknown }).safety ?? {}),
  );
  register("body", "text/markdown", (p) => p.body);

  server.tool(
    "validate",
    "Validate the served ROBOT.md against the v1 schema and body rules.",
    {},
    async () => {
      const result = validateParsed(loadCurrent(manifestPath));
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    },
  );

  server.tool(
    "render",
    "Strip prose and return the frontmatter as canonical YAML.",
    {},
    async () => {
      const yaml = renderYaml(loadCurrent(manifestPath));
      return {
        content: [{ type: "text", text: yaml }],
      };
    },
  );

  return { server, robotName, manifestPath };
}
