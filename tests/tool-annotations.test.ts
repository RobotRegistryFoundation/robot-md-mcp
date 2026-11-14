// Every tool says what it does to the world, so a cautious client (one that only
// reads tools marked read-only) can use this server. A new tool with no
// annotations, or one that changes something, fails here until it says so.
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

const fixturePath = resolve(fileURLToPath(import.meta.url), "..", "fixtures", "minimal.ROBOT.md");

const EXPECTED: Record<string, { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean; openWorldHint: boolean }> = {
  validate: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  render: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  doctor_summary: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};

describe("tool annotations", () => {
  it("every tool carries all four hints, as pinned", async () => {
    const { server } = createServer(fixturePath);
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await Promise.all([server.connect(serverT), client.connect(clientT)]);
    const tools = (await client.listTools()).tools;
    expect(tools.map((t) => t.name).sort()).toEqual(Object.keys(EXPECTED).sort());
    for (const t of tools) {
      const a = t.annotations ?? {};
      const { readOnlyHint, destructiveHint, idempotentHint, openWorldHint } = a;
      expect({ readOnlyHint, destructiveHint, idempotentHint, openWorldHint }, t.name).toEqual(EXPECTED[t.name]);
      expect(a.title, t.name).toBe(t.title);
    }
  });
});
