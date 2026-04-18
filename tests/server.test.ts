import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

const here = resolve(fileURLToPath(import.meta.url), "..");
const fixturePath = resolve(here, "fixtures", "minimal.ROBOT.md");

async function connected(manifestPath: string) {
  const { server } = createServer(manifestPath);
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverT), client.connect(clientT)]);
  return { client, server };
}

describe("MCP server", () => {
  it("lists six resources for a valid manifest", async () => {
    const { client } = await connected(fixturePath);
    const list = await client.listResources();
    const uris = list.resources.map((r) => r.uri).sort();
    expect(uris).toEqual([
      "robot-md://test-bot/body",
      "robot-md://test-bot/capabilities",
      "robot-md://test-bot/context",
      "robot-md://test-bot/frontmatter",
      "robot-md://test-bot/identity",
      "robot-md://test-bot/safety",
    ]);
  });

  it("identity resource returns compact one-line summary", async () => {
    const { client } = await connected(fixturePath);
    const result = await client.readResource({
      uri: "robot-md://test-bot/identity",
    });
    const c0 = result.contents[0] as { mimeType?: string; text?: string };
    expect(c0.mimeType).toBe("text/plain");
    expect(String(c0.text)).toContain("test-bot");
  });

  it("context resource returns Claude-ready markdown", async () => {
    const { client } = await connected(fixturePath);
    const result = await client.readResource({
      uri: "robot-md://test-bot/context",
    });
    const c0 = result.contents[0] as { mimeType?: string; text?: string };
    expect(c0.mimeType).toBe("text/markdown");
    const text = String(c0.text);
    expect(text).toContain("Robot context");
    expect(text).toContain("Capabilities");
    expect(text).toContain("Safety gates");
  });

  it("doctor_summary tool returns schema_ok + driver summary", async () => {
    const { client } = await connected(fixturePath);
    const result = await client.callTool({ name: "doctor_summary", arguments: {} });
    const content = result.content as Array<{ type: string; text?: string }>;
    const text = content.find((c) => c.type === "text")?.text;
    const parsed = JSON.parse(String(text));
    expect(parsed.schema_ok).toBe(true);
    expect(parsed.robot_name).toBe("test-bot");
    expect(Array.isArray(parsed.drivers)).toBe(true);
    expect(Array.isArray(parsed.hitl_gates)).toBe(true);
  });

  it("server advertises instructions at initialization", async () => {
    const { client } = await connected(fixturePath);
    const instructions = client.getInstructions();
    expect(instructions).toBeDefined();
    expect(String(instructions)).toContain("ROBOT.md");
    expect(String(instructions)).toContain("safety");
  });

  it("lists four prompts (brief-me, check-safety, explain-capability, manifest-status)", async () => {
    const { client } = await connected(fixturePath);
    const list = await client.listPrompts();
    const names = list.prompts.map((p) => p.name).sort();
    expect(names).toEqual([
      "brief-me",
      "check-safety",
      "explain-capability",
      "manifest-status",
    ]);
  });

  it("brief-me prompt renders with the robot name", async () => {
    const { client } = await connected(fixturePath);
    const result = await client.getPrompt({ name: "brief-me", arguments: {} });
    const msg = result.messages[0];
    expect(msg.role).toBe("user");
    const content = msg.content as { type: string; text: string };
    expect(content.text).toContain("test-bot");
    expect(content.text).toContain("robot-md://test-bot/context");
  });

  it("check-safety prompt interpolates the action argument", async () => {
    const { client } = await connected(fixturePath);
    const result = await client.getPrompt({
      name: "check-safety",
      arguments: { action: "pick up the red cup" },
    });
    const content = result.messages[0].content as { text: string };
    expect(content.text).toContain("pick up the red cup");
    expect(content.text).toContain("hitl_gates");
    expect(content.text).toContain("robot-md://test-bot/safety");
  });

  it("explain-capability prompt interpolates the capability argument", async () => {
    const { client } = await connected(fixturePath);
    const result = await client.getPrompt({
      name: "explain-capability",
      arguments: { capability: "arm.pick" },
    });
    const content = result.messages[0].content as { text: string };
    expect(content.text).toContain("arm.pick");
    expect(content.text).toContain("robot-md://test-bot/capabilities");
  });

  it("manifest-status prompt exists and references the doctor_summary tool", async () => {
    const { client } = await connected(fixturePath);
    const result = await client.getPrompt({
      name: "manifest-status",
      arguments: {},
    });
    const content = result.messages[0].content as { text: string };
    expect(content.text).toContain("doctor_summary");
    expect(content.text).toContain("test-bot");
  });

  it("returns JSON frontmatter on read", async () => {
    const { client } = await connected(fixturePath);
    const result = await client.readResource({
      uri: "robot-md://test-bot/frontmatter",
    });
    const c0 = result.contents[0] as { mimeType?: string; text?: string };
    expect(c0.mimeType).toBe("application/json");
    const obj = JSON.parse(String(c0.text));
    expect(obj.metadata.robot_name).toBe("test-bot");
  });

  it("returns raw markdown on body read", async () => {
    const { client } = await connected(fixturePath);
    const result = await client.readResource({
      uri: "robot-md://test-bot/body",
    });
    const c0 = result.contents[0] as { mimeType?: string; text?: string };
    expect(c0.mimeType).toBe("text/markdown");
    expect(String(c0.text)).toContain("# test-bot");
  });

  it("validate tool returns ok=true for a valid manifest", async () => {
    const { client } = await connected(fixturePath);
    const result = await client.callTool({ name: "validate", arguments: {} });
    const content = result.content as Array<{ type: string; text?: string }>;
    const text = content.find((c) => c.type === "text")?.text;
    const parsed = JSON.parse(String(text));
    expect(parsed.ok).toBe(true);
    expect(parsed.summary).toContain("test-bot");
  });

  it("render tool returns canonical YAML", async () => {
    const { client } = await connected(fixturePath);
    const result = await client.callTool({ name: "render", arguments: {} });
    const content = result.content as Array<{ type: string; text?: string }>;
    const text = content.find((c) => c.type === "text")?.text;
    expect(String(text)).toContain("robot_name: test-bot");
  });

  it("reflects file changes between calls", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mcp-"));
    const path = join(dir, "ROBOT.md");
    writeFileSync(path, readFileSync(fixturePath, "utf8"));
    const { client } = await connected(path);

    // Mutate the file on disk.
    const mutated = readFileSync(fixturePath, "utf8").replace("Minimal test robot.", "Changed!");
    writeFileSync(path, mutated);

    const body = await client.readResource({ uri: "robot-md://test-bot/body" });
    const c0 = body.contents[0] as { text?: string };
    expect(String(c0.text)).toContain("Changed!");
  });
});
