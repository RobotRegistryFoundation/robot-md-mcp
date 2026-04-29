import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/bin.ts", "src/bin-http.ts", "src/http.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  target: "node18",
  outDir: "dist",
  outExtension: ({ format }) => ({
    js: format === "esm" ? ".mjs" : ".cjs",
  }),
});
