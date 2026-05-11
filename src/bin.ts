#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { resolveManifest } from "./manifest-resolver.js";

async function main() {
  const resolution = resolveManifest({
    cliPath: process.argv[2],
    cwd: process.cwd(),
  });
  if (!resolution.path) {
    console.error(
      `robot-md-mcp: ${resolution.message}\n\n` +
        "Usage:\n" +
        "  robot-md-mcp                 # auto-discover ROBOT.md (env, config, cwd walk)\n" +
        "  robot-md-mcp /path/ROBOT.md  # explicit path\n",
    );
    process.exit(2);
  }
  console.error(`robot-md-mcp: ${resolution.message}`);
  const path = resolution.path;

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
