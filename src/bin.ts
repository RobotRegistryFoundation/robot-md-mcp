#!/usr/bin/env node
import { existsSync } from "node:fs";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error(
      "Usage: robot-md-mcp <path-to-ROBOT.md>\n\n" +
        "Add this to Claude Desktop's MCP config (claude_desktop_config.json):\n" +
        '  { "mcpServers": { "robot-md": { "command": "npx", "args": ["-y", "robot-md-mcp", "/path/to/ROBOT.md"] } } }\n',
    );
    process.exit(2);
  }
  if (!existsSync(path)) {
    console.error(`robot-md-mcp: cannot read ${path} (file does not exist).`);
    process.exit(1);
  }

  try {
    const { server, robotName } = createServer(path);
    console.error(`robot-md-mcp: serving ${path} as '${robotName}'`);
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (err) {
    console.error(`robot-md-mcp: failed to start: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
