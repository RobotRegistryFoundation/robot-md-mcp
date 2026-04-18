import { parse as yamlParse } from "yaml";

export interface ParsedRobotMd {
  /** Frontmatter as a plain object. */
  frontmatter: Record<string, unknown>;
  /** Body markdown, verbatim, after the closing `---`. */
  body: string;
  /** The exact input text that was parsed. */
  rawText: string;
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

const FRONTMATTER_RE = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/;

export function parseRobotMd(text: string): ParsedRobotMd {
  if (!text.trimStart().startsWith("---")) {
    throw new ParseError(
      "no frontmatter found — ROBOT.md must start with a YAML frontmatter block delimited by '---'.",
    );
  }
  const m = text.match(FRONTMATTER_RE);
  if (!m) {
    throw new ParseError("frontmatter block is not properly closed with '---'.");
  }
  const [, yamlText, body] = m;
  let frontmatter: unknown;
  try {
    frontmatter = yamlParse(yamlText);
  } catch (e) {
    throw new ParseError(`invalid YAML frontmatter: ${(e as Error).message}`);
  }
  if (
    typeof frontmatter !== "object" ||
    frontmatter === null ||
    Array.isArray(frontmatter)
  ) {
    throw new ParseError("frontmatter must be a YAML mapping (object), not a list or scalar.");
  }
  return {
    frontmatter: frontmatter as Record<string, unknown>,
    body: body ?? "",
    rawText: text,
  };
}
