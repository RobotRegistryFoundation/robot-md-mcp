import { stringify as yamlStringify } from "yaml";
import type { ParsedRobotMd } from "./parser.js";

export function renderYaml(parsed: ParsedRobotMd): string {
  return yamlStringify(parsed.frontmatter, {
    aliasDuplicateObjects: false,
    lineWidth: 0,
  });
}
