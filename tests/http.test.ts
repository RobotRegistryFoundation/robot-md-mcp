import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHttpApp } from "../src/http.js";

const here = resolve(fileURLToPath(import.meta.url), "..");
const fixturePath = resolve(here, "fixtures", "minimal.ROBOT.md");

describe("robot-md-http", () => {
  it("serves /openapi.json with the right operationIds", async () => {
    const { app } = createHttpApp(fixturePath);
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { paths: Record<string, unknown>; openapi: string };
    expect(doc.openapi).toBe("3.1.0");
    const paths = Object.keys(doc.paths);
    expect(paths).toContain("/validate");
    expect(paths).toContain("/render");
    expect(paths.some((p) => p.endsWith("/frontmatter"))).toBe(true);
    expect(paths.some((p) => p.endsWith("/capabilities"))).toBe(true);
  });

  it("/health returns ok with the robot name", async () => {
    const { app, robotName } = createHttpApp(fixturePath);
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, robot: robotName });
  });

  it("returns frontmatter as JSON for the registered robot", async () => {
    const { app, robotName } = createHttpApp(fixturePath);
    const res = await app.request(`/robots/${robotName}/frontmatter`);
    expect(res.status).toBe(200);
    const fm = (await res.json()) as { metadata?: { robot_name?: string } };
    expect(fm.metadata?.robot_name).toBe(robotName);
  });

  it("returns 404 for unknown robot name", async () => {
    const { app } = createHttpApp(fixturePath);
    const res = await app.request("/robots/not-the-robot/frontmatter");
    expect(res.status).toBe(404);
  });

  it("returns capabilities[] as a JSON array", async () => {
    const { app, robotName } = createHttpApp(fixturePath);
    const res = await app.request(`/robots/${robotName}/capabilities`);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it("identity endpoint returns a one-line plaintext briefing", async () => {
    const { app, robotName } = createHttpApp(fixturePath);
    const res = await app.request(`/robots/${robotName}/identity`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain(robotName);
    expect(body.split("\n").length).toBe(1);
  });

  it("POST /validate accepts a ROBOT.md text body and returns ValidateResult", async () => {
    const { app } = createHttpApp(fixturePath);
    const text = readFileSync(fixturePath, "utf8");
    const res = await app.request("/validate", { method: "POST", body: text });
    expect(res.status).toBe(200);
    const result = (await res.json()) as { ok: boolean };
    expect(typeof result.ok).toBe("boolean");
  });

  it("POST /render returns canonical YAML for a valid input", async () => {
    const { app } = createHttpApp(fixturePath);
    const text = readFileSync(fixturePath, "utf8");
    const res = await app.request("/render", { method: "POST", body: text });
    expect(res.status).toBe(200);
    const yaml = await res.text();
    expect(yaml).toContain("rcan_version");
  });
});
