# robot-md-mcp

> MCP server that exposes a [`ROBOT.md`](https://robotmd.dev) file to Claude Desktop and any other MCP-speaking client.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-18.20%2B-green)](https://nodejs.org)
[![CI](https://github.com/RobotRegistryFoundation/robot-md-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/RobotRegistryFoundation/robot-md-mcp/actions)

## What it does

Reads a local `ROBOT.md` and exposes it to an MCP client as:

- **Resources** — the client can read at will:
  - `robot-md://<robot_name>/frontmatter` (`application/json`)
  - `robot-md://<robot_name>/capabilities` (`application/json`)
  - `robot-md://<robot_name>/safety` (`application/json`)
  - `robot-md://<robot_name>/body` (`text/markdown`)
- **Tools** — the client invokes on operator request:
  - `validate` → `{ ok, summary, errors }`
  - `render` → canonical YAML of the frontmatter

The server re-reads the file on every call. No cache, no watcher, no runtime config.

## Not in v0.1 — deferred to v0.2

- No signature verification. `ROBOT.md` v0.2 will add signed manifests (`.sig`) and a key-binding-at-RRN-mint flow; see [`spec/v0.2-design.md`](https://robotmd.dev/spec/v0.2-design.md).
- No robot dispatch. `invoke_skill` / `query_status` arrive after the v0.2 signing decisions in §13 are finalized.
- No multi-manifest / fleet mode.

## Install

```bash
# From npm (once NPM_TOKEN is configured on the release workflow)
npx robot-md-mcp /path/to/ROBOT.md

# From GitHub release tarball (during the npm-blocked window)
npm i github:RobotRegistryFoundation/robot-md-mcp#v0.1.0
```

Node 18.20+ required.

## Claude Desktop config

Add this to your `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "robot-md": {
      "command": "npx",
      "args": ["-y", "robot-md-mcp", "/absolute/path/to/ROBOT.md"]
    }
  }
}
```

Restart Claude Desktop. Open a new chat — Claude now has the robot's frontmatter, capabilities, safety block, and prose body on tap.

## Tier-0 adoption loop

```bash
# Generate a draft from visible hardware
pip install robot-md
robot-md autodetect --write ./ROBOT.md

# Edit the TODOs (robot name, physics type, DoF, capabilities)
# Then point Claude Desktop at it:
# -> add the JSON snippet above to claude_desktop_config.json
```

## API surface

```ts
import {
  // Core
  parseRobotMd,
  ParseError,
  validateParsed,
  renderYaml,
  createServer,
  VERSION,
  // Types
  type ParsedRobotMd,
  type ValidateResult,
  type ServerHandle,
} from "robot-md-mcp";
```

All are importable for programmatic use — e.g. building a custom MCP server on top, or running the parser/validator as part of a larger TypeScript tool.

## Development

```bash
git clone https://github.com/RobotRegistryFoundation/robot-md-mcp
cd robot-md-mcp
npm install
npm test            # vitest: parser, validator, render, server, bin
npm run build       # tsup → dist/
npm run sync-schema # refresh bundled schema from ../robot-md
```

## Contributing

- Schema lives at [`RobotRegistryFoundation/robot-md`](https://github.com/RobotRegistryFoundation/robot-md) — PR changes there, then re-run `npm run sync-schema` here.
- Small, focused PRs welcome.

## License

Apache 2.0.
