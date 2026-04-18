// Sync the JSON schema from the canonical robot-md repo.
// Usage: `npm run sync-schema` — write the bundled copy.
//        `npm run sync-schema -- --check` — verify-only; exit 2 on drift.
// Source: ../robot-md/schema/v1/robot.schema.json (if present)
//         else https://robotmd.dev/schema/v1/robot.schema.json
//
// CI runs the md5-compare equivalent inline — see .github/workflows/ci.yml.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const localSrc = resolve(repoRoot, "..", "robot-md", "schema", "v1", "robot.schema.json");
const dest = resolve(repoRoot, "src", "schema", "robot.schema.json");

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");

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

const canonical = await fetchSchema();

if (checkOnly) {
  if (!existsSync(dest)) {
    console.error(`sync-schema --check: ${dest} does not exist.`);
    process.exit(2);
  }
  const bundled = readFileSync(dest, "utf8");
  if (bundled !== canonical) {
    console.error(
      `sync-schema --check: ${dest} has drifted from the canonical schema.\n` +
        `  bundled: ${bundled.length} bytes\n` +
        `  canonical: ${canonical.length} bytes\n` +
        `  run 'npm run sync-schema' to refresh.`,
    );
    process.exit(2);
  }
  console.log(`OK — schema is in sync (${canonical.length} bytes).`);
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, canonical);
console.log(`wrote ${dest} (${canonical.length} bytes)`);
