import pkg from "../package.json" with { type: "json" };

export { parseRobotMd, ParseError } from "./parser.js";
export type { ParsedRobotMd } from "./parser.js";
export { validateParsed } from "./validate.js";
export type { ValidateResult } from "./validate.js";
export { renderYaml } from "./render.js";
export { createServer } from "./server.js";
export type { ServerHandle } from "./server.js";

/** Package version — sourced from package.json at build time so it can't drift. */
export const VERSION: string = pkg.version;
