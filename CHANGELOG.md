# Changelog

All notable changes to `robot-md-mcp` are documented here.

---

## [0.5.0] - 2026-05-11

### Added
- Mirror pick-place trial protocol section in `using-robot-md` SKILL.md (canonical update synced to robot-md 1.10.0).

---

## [0.3.0] - 2026-04-24

### Added
- `resolveRobotMdPath` — cwd-walk auto-discovery. Running `robot-md-mcp`
  with no path argument now walks up from `process.cwd()` looking for a
  `ROBOT.md`. An argument that still contains an unexpanded `${...}`
  template (from MCP clients that don't substitute plugin env vars) is
  treated as missing and also falls back to the walk. Explicit paths
  that exist continue to win; explicit paths that don't exist still
  error (no silent fallback) so typos surface immediately.
- `tests/resolve-robot-md.test.ts` — 6 tests pinning the resolution
  ladder.

### Why
Enables the new `robot-md` Claude Code plugin (separate release) to ship
a zero-configuration install: the plugin's `.mcp.json` passes
`${CLAUDE_PROJECT_DIR}/ROBOT.md` and the server handles both the
expanded and unexpanded cases. Benefits every MCP client, not just
Claude Code — Cursor/Zed/Continue/Desktop all get auto-discovery for
free.

### Compatibility
Fully backward compatible. Existing explicit-path invocations
(`robot-md-mcp /path/to/ROBOT.md`) behave identically.

---

## [0.2.2] - 2026-04-23

### BREAKING — RCAN 3.0+ required
- Bundled `src/schema/robot.schema.json` resynced from canonical upstream
  (`robot-md/schema/v1/robot.schema.json`). `rcan_version` now enforced
  as pattern `^3\.[0-9]+(\.[0-9]+)?$` with description "RCAN protocol
  version. Must be 3.0 or higher (ecosystem policy: RCAN 3.0+ only
  going forward; 2.x no longer accepted)." ROBOT.md files declaring
  `rcan_version: "2.x"` will fail validation.

### Added
- `tests/schema-rcan-version.test.ts` — 7 regression tests locking the
  3.0+ acceptance gate.

## [0.2.1] - 2026-04-18

### Added

- **Four MCP prompts** (surface as slash commands in Claude Desktop /
  Code and any prompt-aware MCP client):
  - `/brief-me` (zero-arg) — produces a short operator briefing on the
    robot from the context resource.
  - `/check-safety action=<text>` — checks a proposed action against
    declared `hitl_gates[]`. Asks Claude to return one of
    "✓ safe to proceed", "⚠ authorization required — <gate>", or
    "⚠ gate gap — <explanation>". Designed to be invoked **before any
    physical motion**.
  - `/explain-capability capability=<name>` — explains what a declared
    capability does, which drivers it uses, and which safety gates
    apply. Catches the common failure mode of agents claiming a
    capability that isn't in `capabilities[]`.
  - `/manifest-status` (zero-arg) — wraps `doctor_summary` in a
    human-readable report.
- **`zod`** added as a direct dependency (used for prompt argument
  schemas; already transitive via the MCP SDK).

### Why prompts?

Resources and tools get routed-to by description-matching; prompts get
*invoked* by the operator as slash commands. `/check-safety` in
particular converts the "read safety first" habit from "I hope Claude
remembers" into a one-keystroke enforcement path any operator can
trigger before asking for a motion.

35/35 tests pass.

---

## [0.2.0] - 2026-04-18

Agent-affordances release. Goal: any MCP-aware agent (Claude Code,
Claude Desktop, Cursor, Zed, Gemini CLI, Codex, ChatGPT Desktop) can
route to this server by description-match alone — without the operator
explicitly naming the tool.

### Added

- **Server-level `instructions` field** (MCP initialize response).
  Tells clients what this server is for, when to route to it, and an
  operator-intent → resource/tool routing table. Matches the MCP spec
  field designed exactly for this.
- **New resource `robot-md://<name>/identity`** — compact one-line
  summary (name, type, DoF, manufacturer/model/version, RRN, resolver
  URL). Read this FIRST at session start; it's the cheapest orient.
- **New resource `robot-md://<name>/context`** — pre-rendered Markdown
  combining identity, capabilities, HITL gates, E-stop config, and the
  prose body. Designed for system-prompt injection or a "brief me"
  first turn.
- **New tool `doctor_summary`** — read-only, manifest-only quick-check.
  Returns JSON with schema status, driver summary, HITL gates, E-stop,
  registration status. Cheaper + safer than the full `robot-md doctor`
  CLI (which also probes network + drivers).

### Changed

- **All resource + tool descriptions rewritten** with operator-intent
  phrasing. Each description now starts with what the resource IS,
  then lists operator phrases that should trigger a read/call (e.g.
  "what can this robot do", "is it safe to X", "did I break the
  manifest"). This makes description-match routing reliable.
- `frontmatter` JSON output is now pretty-printed (2-space indent) so
  agents don't have to re-parse for legibility.

### Test coverage

30/30 tests pass. New coverage for `identity`, `context`,
`doctor_summary`, and the `instructions` field.

---

## [0.1.4] - 2026-04-18

### Changed

- **Bundled JSON Schema refreshed to v1.1.** Picks up the `physics.solver`
  block + per-joint DH fields (`a_mm`, `d_mm`, `servo_id`, `encoder_sign`,
  `zero_pose_steps`) that shipped in `robot-md` v0.2.0. Manifests generated
  by `robot-md init --preset so-arm101` now pass the MCP server's `validate`
  tool instead of failing on unknown fields. No API change; this is a
  data-only refresh — 28 tests still green.
- **README role shelf.** Added the unified 7-row "Where this fits in the
  stack" table that now lands in every ecosystem repo. Sharpened the
  tagline to explicitly list the MCP-aware agents this works with
  (Claude Code, Claude Desktop, Cursor, Zed, Cline, Continue.dev,
  OpenAI Codex CLI, Gemini CLI).

## [0.1.3] - 2026-04-17

### Changed

- **Migrated to the non-deprecated MCP SDK APIs.** `server.resource()` and `server.tool()` are `@deprecated` in `@modelcontextprotocol/sdk` 1.29.x. Switched to `registerResource(name, uri, {mimeType, title, description}, cb)` and `registerTool(name, {title, description, inputSchema}, cb)`. MCP clients that render resource pickers (Claude Desktop, Zed, Cline) now show a friendly title + description for each of the four resources (`frontmatter`, `capabilities`, `safety`, `body`) and both tools (`validate`, `render`). No behavior changes — URIs, MIME types, and tool payloads are byte-identical.

### Added

- **`sync-schema --check` mode.** `npm run sync-schema -- --check` exits 2 on drift (without overwriting) so contributors can verify the bundled copy matches the canonical `robot-md` schema locally before pushing. Equivalent check already runs in CI.
- **README API surface expanded** to list all 9 public exports (added `ParseError`, `VERSION`, and the three type exports).

## [0.1.2] - 2026-04-17

### Fixed

- **Internal version strings drifted from `package.json`.** `src/index.ts`'s `VERSION` constant and the `McpServer({ version })` handshake value were hardcoded to `0.1.0`, so consumers — and MCP clients like Claude Desktop — saw `0.1.0` even when running 0.1.1 from npm. Both now import the version from `package.json` at build time via `with { type: "json" }`, so they can never drift.

### Changed

- CI matrix Node floor pinned from `18` to `18.20` to match the declared `engines.node` floor exactly.

## [0.1.1] - 2026-04-17

### Fixed

- **`npm i github:RobotRegistryFoundation/robot-md-mcp#vX` installs were non-functional.** `dist/` is gitignored, and v0.1.0 had no `prepare` script, so git-installed copies landed without a built `bin/`. Adds `"prepare": "test -d dist || tsup"` so npm builds `dist/` automatically when installing from a git ref. No-op when installing from the npm tarball (already has `dist/`).

## [0.1.0] - 2026-04-17

### Added

Initial release.

- MCP server that reads a local `ROBOT.md` and exposes it as 4 resources (`frontmatter`, `capabilities`, `safety`, `body`) and 2 tools (`validate`, `render`).
- In-house parser (`yaml` + `ajv` against the bundled `robot-md` v1 schema). No Python dependency.
- Re-reads the manifest on every call — no cache, no watcher.
- Node 18.20+. Apache-2.0.
- `robot-md-mcp <path>` CLI binary over stdio for Claude Desktop + other MCP clients.
- Published to npm as `robot-md-mcp`.
- GitHub release includes the built tarball for `npm i github:…#v0.1.0` fallback — **but note: v0.1.0's `github:` path was broken; use v0.1.1+ for that install mode.**

### Not yet (v0.2)

- Signature verification / RRN-bound keys (see `robotmd.dev/spec/v0.2-design.md` §13).
- `invoke_skill` / `query_status` dispatch to a running robot gateway.
- Multi-manifest / fleet mode.
