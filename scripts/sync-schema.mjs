// Sync the JSON schema from the canonical robot-md repo.
// Usage: `npm run sync-schema`
// Source: ../robot-md/schema/v1/robot.schema.json (if present)
//         else https://robotmd.dev/schema/v1/robot.schema.json
//
// CI will fail if the bundled copy drifts — see .github/workflows/ci.yml.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const localSrc = resolve(repoRoot, "..", "robot-md", "schema", "v1", "robot.schema.json");
const dest = resolve(repoRoot, "src", "schema", "robot.schema.json");

async function fetchSchema() {
  if (existsSync(localSrc)) {
    return readFileSync(localSrc, "utf8");
  }
  const url = "https://robotmd.dev/schema/v1/robot.schema.json";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const text = await fetchSchema();
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, text);
console.log(`wrote ${dest} (${text.length} bytes)`);
