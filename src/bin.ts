#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { resolveRobotMdPath } from "./resolve-robot-md.js";

async function main() {
  let path: string;
  try {
    path = resolveRobotMdPath(process.argv[2]);
  } catch (err) {
    console.error(
      `robot-md-mcp: ${(err as Error).message}\n\n` +
        "Usage:\n" +
        "  robot-md-mcp                 # auto-discover ROBOT.md by walking up from cwd\n" +
        "  robot-md-mcp /path/ROBOT.md  # explicit path\n",
    );
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
