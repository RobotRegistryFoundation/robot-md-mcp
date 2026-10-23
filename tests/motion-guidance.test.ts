// What this package tells Claude about motion.
//
// This server has no motion tools: it serves ROBOT.md. The robot-md plugin it
// ships registers the Python `robot-md mcp` server, whose motion tools send
// every motion to robot-md-gateway. These tests pin the guidance both carry:
// a reply in chat is never authorization for motion, motion goes only through
// the gateway, a person at the machine with a hardware stop comes first, and
// test runs are started by the person.
import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

const here = resolve(fileURLToPath(import.meta.url), "..");
const repo = resolve(here, "..");
const fixturePath = resolve(here, "fixtures", "minimal.ROBOT.md");

// Phrases that offered a chat reply as authorization for motion.
const CHAT_AUTHORIZATION = [
  "authorize this specific action",
  "ask the operator for explicit authorization",
  "stop and ask for explicit authorization",
  "need explicit authorization before proceeding",
  "yes, authorize",
];

function expectNoChatAuthorization(text: string) {
  const lowered = text.toLowerCase();
  for (const phrase of CHAT_AUTHORIZATION) {
    expect(lowered, `still says "${phrase}"`).not.toContain(phrase);
  }
}

function gatedManifest(): string {
  const dir = mkdtempSync(join(tmpdir(), "robot-md-mcp-gated-"));
  const path = join(dir, "ROBOT.md");
  writeFileSync(
    path,
    readFileSync(fixturePath, "utf8").replace(
      "safety:\n",
      "safety:\n  hitl_gates:\n    - scope: destructive\n      require_auth: true\n",
    ),
  );
  return path;
}

async function connected(manifestPath: string) {
  const { server } = createServer(manifestPath);
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverT), client.connect(clientT)]);
  return client;
}

async function readText(client: Client, uri: string): Promise<string> {
  const result = await client.readResource({ uri });
  return String((result.contents[0] as { text?: string }).text);
}

describe("this server", () => {
  it("registers no motion tools", async () => {
    const client = await connected(fixturePath);
    const names = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(names).toEqual(["doctor_summary", "render", "validate"]);
  });

  it("instructions route motion to the gateway and never to a chat reply", async () => {
    const client = await connected(fixturePath);
    const instructions = String(client.getInstructions());
    expectNoChatAuthorization(instructions);
    expect(instructions).toContain("robot-md-gateway");
    expect(instructions).toContain("never authorization for motion");
    expect(instructions).toContain("hardware stop");
  });

  it("context resource carries the same rule", async () => {
    const client = await connected(gatedManifest());
    const text = await readText(client, "robot-md://test-bot/context");
    expectNoChatAuthorization(text);
    expect(text).toContain("robot-md-gateway");
    expect(text).toContain("never authorization for motion");
    expect(text).toContain("`destructive` — requires a person's confirmation from outside this chat");
  });

  it("safety resource description carries the same rule", async () => {
    const client = await connected(fixturePath);
    const { resources } = await client.listResources();
    const safety = resources.find((r) => r.uri === "robot-md://test-bot/safety");
    expect(safety).toBeDefined();
    expectNoChatAuthorization(String(safety?.description));
    expect(String(safety?.description)).toContain("robot-md-gateway");
  });

  it("check-safety prompt never offers chat authorization", async () => {
    const client = await connected(fixturePath);
    const result = await client.getPrompt({
      name: "check-safety",
      arguments: { action: "pick up the glass vial" },
    });
    const text = String((result.messages[0].content as { text?: string }).text);
    expectNoChatAuthorization(text);
    expect(text).not.toContain("safe to proceed");
    expect(text).toContain("robot-md-gateway");
    expect(text).toContain("not that confirmation");
    expect(text).toContain("pick up the glass vial");
  });
});

describe("using-robot-md skill", () => {
  const skill = readFileSync(join(repo, "skills", "using-robot-md", "SKILL.md"), "utf8");

  it("never treats a chat yes as authorization", () => {
    expectNoChatAuthorization(skill);
    expect(skill).toContain('A chat "yes" is never authorization for motion');
    expect(skill).not.toContain("confirm_token=");
  });

  it("routes motion only through the gateway", () => {
    expect(skill).toContain("Motion goes only through robot-md-gateway");
    expect(skill).toContain("never run a command or script that opens it");
    expect(skill).not.toContain("pip install 'robot-md[hardware]'");
    expect(skill).not.toContain("mcp__robot-md__invoke` with");
  });

  it("requires a person at the machine with a hardware stop", () => {
    expect(skill).toContain(
      "A person at the machine, with a hardware stop, comes before any motion",
    );
    expect(skill).toContain("The `estop` tool is a software stop, not that hardware stop");
  });

  it("leaves test runs and clearing stops to the person", () => {
    expect(skill).toContain("Test runs are started by the person, never by you");
    expect(skill).toContain("Never call `estop_clear` to resume on your own");
  });

  it("states how it relates to the bounded-embodiment skill", () => {
    expect(skill).toContain("### How this skill relates to the bounded-embodiment skill");
    expect(skill).toContain("They differ in one place, for a reason");
    expect(skill).toContain("the stricter rule wins");
  });
});

describe("plugin manifest", () => {
  it("describes motion through the gateway", () => {
    const plugin = JSON.parse(
      readFileSync(join(repo, ".claude-plugin", "plugin.json"), "utf8"),
    ) as { description: string };
    expect(plugin.description).toContain("robot-md-gateway");
    expect(plugin.description).not.toContain("all in one server");
  });
});
