#!/usr/bin/env node
/**
 * robot-md-http — CLI entry. Launch with `npx robot-md-http /path/to/ROBOT.md`
 * or `npx robot-md-http` to auto-discover via cwd-walk.
 *
 * v0.1: localhost-only Hono server on port 8787 (or PORT env var). No auth.
 */

import { serve } from "@hono/node-server";
import { resolveManifest } from "./manifest-resolver.js";
import { createHttpApp } from "./http.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const argPath = args.find((a) => !a.startsWith("-"));
  const port = Number(process.env.PORT ?? 8787);

  const resolution = resolveManifest({
    cliPath: argPath,
    cwd: process.cwd(),
  });
  if (!resolution.path) {
    process.stderr.write(`robot-md-http: ${resolution.message}\n`);
    process.exit(2);
  }
  process.stderr.write(`robot-md-http: ${resolution.message}\n`);
  const manifestPath = resolution.path;
  const { app, robotName } = createHttpApp(manifestPath);

  serve({ fetch: app.fetch, port }, (info) => {
    process.stderr.write(
      `robot-md-http: serving ${robotName} (${manifestPath}) on http://localhost:${info.port}\n`,
    );
    process.stderr.write(
      `  OpenAPI 3.1: http://localhost:${info.port}/openapi.json\n`,
    );
    process.stderr.write(
      `  Health:      http://localhost:${info.port}/health\n`,
    );
  });
}

main().catch((err) => {
  process.stderr.write(`robot-md-http: ${err.message ?? err}\n`);
  process.exit(1);
});
