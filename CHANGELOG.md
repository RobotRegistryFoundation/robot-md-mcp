# Changelog

All notable changes to `robot-md-mcp` are documented here.

---

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
