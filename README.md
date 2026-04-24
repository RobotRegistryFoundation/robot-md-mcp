# robot-md-mcp

> **The one-command bridge from a `ROBOT.md` file to any MCP-aware agent.**
> Claude Code, Claude Desktop, Cursor, Zed, Cline, Continue.dev, OpenAI Codex CLI, Google Gemini CLI — any MCP client speaking stdio transport reads your robot's manifest as structured resources. Zero config files.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-18.20%2B-green)](https://nodejs.org)
[![CI](https://github.com/RobotRegistryFoundation/robot-md-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/RobotRegistryFoundation/robot-md-mcp/actions)
[![npm](https://img.shields.io/npm/v/robot-md-mcp.svg)](https://www.npmjs.com/package/robot-md-mcp)

## Where this fits in the stack

This repo is the **agent bridge** — an MCP server that speaks the open [Model Context Protocol](https://modelcontextprotocol.io) and serves your `ROBOT.md` to any MCP-aware planner. Everything else is independent; adopt one, or all seven.

| Layer | Piece | What it is |
|---|---|---|
| **Declaration** | [ROBOT.md](https://github.com/RobotRegistryFoundation/robot-md) | The file a robot ships at its root. YAML frontmatter + markdown prose. Declares identity, capabilities, safety gates. Spec + Python CLI (`init`, `validate`, `calibrate`, `register`). |
| **Agent bridge** ← *this* | [robot-md-mcp](https://github.com/RobotRegistryFoundation/robot-md-mcp) | **MCP server** that exposes a `ROBOT.md` as 4 MCP resources (`frontmatter`, `capabilities`, `safety`, `body`) + 2 tools (`validate`, `render`). One `claude mcp add` away. |
| **Wire protocol** | [RCAN](https://rcan.dev/spec/) | How robots, gateways, and planners talk. Signed envelopes, LoA enforcement, PQC crypto. Think HTTP for robots. |
| **Python SDK** | [rcan-py](https://github.com/continuonai/rcan-py) | `pip install rcan` — `RCANMessage`, `RobotURI`, `ConfidenceGate`, `HiTLGate`, `AuditChain`. |
| **TypeScript SDK** | [rcan-ts](https://github.com/continuonai/rcan-ts) | `npm install rcan-ts` — same API surface for Node + browser. |
| **Registry** | [Robot Registry Foundation](https://robotregistryfoundation.org) | Permanent RRN identities. Public resolver at `/r/<rrn>`. Like ICANN for robots. |
| **Reference runtime** | [OpenCastor](https://github.com/craigm26/OpenCastor) | Open-source robot runtime — connects LLM brains to hardware bodies. One implementation of RCAN. |

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

## Claude Code plugin — the easiest path

```bash
claude plugin marketplace add RobotRegistryFoundation/claude-code-plugins
/plugin install robot-md
```

That's it. The plugin ships the `using-robot-md` skill and auto-registers this MCP server. Open any project with a `ROBOT.md` at the workspace root — the skill loads and the MCP resources are live.

Prefer the plain `claude mcp add` flow below if you need to pin a specific path, run against multiple `ROBOT.md` files, or install without a marketplace.

---

## Claude Code (CLI) — one command

The fastest way. One line, no config files:

```bash
claude mcp add robot-md -- npx -y robot-md-mcp /absolute/path/to/ROBOT.md
```

That's it. Open Claude Code — it now reads your robot's frontmatter, capabilities, safety block, and prose body as MCP resources, and can invoke the `validate` and `render` tools on request. **No harness config, no provider setup, no YAML wrangling.**

To confirm it's wired up:

```bash
claude mcp list | grep robot-md
```

To remove: `claude mcp remove robot-md`.

## Install (standalone)

If you want to run the server yourself:

```bash
npx robot-md-mcp /path/to/ROBOT.md
```

Node 18.20+ required. The `claude mcp add` flow above uses `npx` under the hood, so no global install needed for the Claude Code path.

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

## Any MCP-aware agent harness

ROBOT.md is a file. `robot-md-mcp` is an MCP server. MCP is an [open standard](https://modelcontextprotocol.io). Any agent tool that speaks MCP can ingest ROBOT.md through this server — not just Claude.

The underlying command to register is always the same:

```
npx -y robot-md-mcp /absolute/path/to/ROBOT.md
```

Stdio transport, no auth. How you wire it depends on the harness:

| Harness | How to add |
|---|---|
| **Claude Code** (CLI) | `claude mcp add robot-md -- npx -y robot-md-mcp /path/to/ROBOT.md` |
| **Claude Desktop** | JSON snippet in `claude_desktop_config.json` (see above) |
| **OpenAI** (Codex CLI, ChatGPT Desktop) | Add to the tool's MCP-server config — command `npx`, args `["-y","robot-md-mcp","/path/to/ROBOT.md"]` |
| **Google Gemini CLI** | Add to `~/.gemini/settings.json` under `mcpServers` with the command above |
| **Cursor / Zed / Cline / Continue.dev / VS Code MCP extensions** | Add via the tool's MCP settings with the same command |
| **Anything else speaking MCP stdio** | Register the `npx` command; that's it |

Create and place one ROBOT.md. Any agent — any provider — reads the same file. That's the whole point.

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
