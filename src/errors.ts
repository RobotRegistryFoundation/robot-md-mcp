export type ManifestProblem =
  | { kind: "not-found"; searchedPaths: string[] }
  | { kind: "yaml-error"; path: string; error: string }
  | { kind: "schema-violation"; path: string; errors: string[] };

export function describeManifestProblem(p: ManifestProblem): string {
  switch (p.kind) {
    case "not-found":
      return [
        "no ROBOT.md found.",
        "Tried:",
        ...p.searchedPaths.map((s) => `  - ${s}`),
        "",
        "Set ROBOT_MD_PATH=/abs/path/ROBOT.md or cd into a directory that contains one.",
      ].join("\n");
    case "yaml-error":
      return `ROBOT.md at ${p.path} contains invalid YAML: ${p.error}`;
    case "schema-violation":
      return [
        `ROBOT.md at ${p.path} fails schema validation:`,
        ...p.errors.map((e) => `  - ${e}`),
      ].join("\n");
  }
}
