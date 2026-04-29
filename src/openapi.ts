/**
 * Handcrafted OpenAPI 3.1 spec for robot-md-http.
 *
 * Kept in code (not generated from the routes) for v0.1 — it's small enough
 * that the duplication is cheaper than pulling in zod-to-openapi or similar.
 * If endpoints grow past ~12, switch to generation.
 *
 * Imported by the ChatGPT Custom GPT Actions importer at /openapi.json.
 */

export function openApiDoc(robotName: string): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: `robot-md-http — ${robotName}`,
      version: "0.1.0",
      description:
        "REST + OpenAPI bridge for ROBOT.md. Mirrors the robot-md-mcp tool surface " +
        "for non-MCP agents (ChatGPT Custom GPT Actions, OpenAI Agents SDK, REST clients).",
    },
    servers: [{ url: "http://localhost:8787", description: "Local npx-launched server" }],
    paths: {
      [`/robots/${robotName}/frontmatter`]: {
        get: {
          summary: "Full YAML frontmatter as JSON",
          operationId: "getFrontmatter",
          responses: {
            "200": {
              description: "Parsed frontmatter object",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      [`/robots/${robotName}/capabilities`]: {
        get: {
          summary: "capabilities[] array",
          operationId: "getCapabilities",
          responses: {
            "200": {
              description: "Array of capability strings",
              content: { "application/json": { schema: { type: "array", items: { type: "string" } } } },
            },
          },
        },
      },
      [`/robots/${robotName}/safety`]: {
        get: {
          summary: "Safety block as JSON",
          operationId: "getSafety",
          responses: {
            "200": {
              description: "Safety configuration",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      [`/robots/${robotName}/body`]: {
        get: {
          summary: "Markdown body of the manifest",
          operationId: "getBody",
          responses: {
            "200": {
              description: "Markdown text",
              content: { "text/plain": { schema: { type: "string" } } },
            },
          },
        },
      },
      [`/robots/${robotName}/identity`]: {
        get: {
          summary: "Compact one-line identity",
          operationId: "getIdentity",
          responses: {
            "200": {
              description: "Identity string",
              content: { "text/plain": { schema: { type: "string" } } },
            },
          },
        },
      },
      [`/robots/${robotName}/context`]: {
        get: {
          summary: "Pre-rendered Markdown briefing",
          operationId: "getContext",
          responses: {
            "200": {
              description: "Context block (markdown)",
              content: { "text/plain": { schema: { type: "string" } } },
            },
          },
        },
      },
      "/validate": {
        post: {
          summary: "Validate a ROBOT.md text body",
          operationId: "validate",
          requestBody: {
            required: true,
            content: { "text/plain": { schema: { type: "string" } } },
          },
          responses: {
            "200": {
              description: "ValidateResult",
              content: { "application/json": { schema: { type: "object" } } },
            },
            "400": {
              description: "Parse error",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      "/render": {
        post: {
          summary: "Render canonical YAML from a ROBOT.md text body",
          operationId: "render",
          requestBody: {
            required: true,
            content: { "text/plain": { schema: { type: "string" } } },
          },
          responses: {
            "200": {
              description: "Rendered YAML",
              content: { "text/plain": { schema: { type: "string" } } },
            },
            "400": {
              description: "Parse error",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
    },
  };
}
