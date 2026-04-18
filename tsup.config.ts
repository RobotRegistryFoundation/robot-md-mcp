import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/bin.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  target: "node18",
  outDir: "dist",
  outExtension: ({ format }) => ({
    js: format === "esm" ? ".mjs" : ".cjs",
  }),
  banner: ({ format }) =>
    format === "esm" ? { js: "#!/usr/bin/env node" } : {},
});
