import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type ResolutionSource = "cli" | "env" | "config" | "cwd-walk" | "none";

export interface ManifestResolution {
  path: string | null;
  source: ResolutionSource;
  message: string;
}

export interface ResolveOptions {
  cliPath: string | undefined;
  cwd: string;
}

export function resolveManifest(opts: ResolveOptions): ManifestResolution {
  if (opts.cliPath) {
    return {
      path: resolve(opts.cliPath),
      source: "cli",
      message: `using --path ${opts.cliPath}`,
    };
  }

  const envPath = process.env.ROBOT_MD_PATH;
  if (envPath) {
    return {
      path: resolve(envPath),
      source: "env",
      message: `using ROBOT_MD_PATH=${envPath}`,
    };
  }

  const configPath = join(homedir(), ".config", "robot-md", "manifests.yaml");
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, "utf8");
      const match = content.match(/^\s*path:\s*([^\s#]+)/m);
      if (match) {
        return {
          path: resolve(match[1]),
          source: "config",
          message: `using ${configPath} first entry`,
        };
      }
    } catch {
      // fall through to cwd walk
    }
  }

  let dir = resolve(opts.cwd);
  while (dir !== "/" && dir !== "") {
    const candidate = join(dir, "ROBOT.md");
    if (existsSync(candidate)) {
      return {
        path: candidate,
        source: "cwd-walk",
        message: `found via cwd walk at ${candidate}`,
      };
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  return {
    path: null,
    source: "none",
    message:
      `no ROBOT.md found via --path, ROBOT_MD_PATH env, ${configPath}, ` +
      `or cwd walk from ${opts.cwd}`,
  };
}
