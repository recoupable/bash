import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import { SANDBOX_CWD } from "@/lib/agent/constants";

export function readSourceFiles(
  dir: string,
  baseDir?: string,
): Array<{ path: string; content: Buffer }> {
  const base = baseDir ?? dir;
  const files: Array<{ path: string; content: Buffer }> = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      files.push(...readSourceFiles(fullPath, base));
    } else {
      const relPath = relative(base, fullPath);
      files.push({
        path: join(SANDBOX_CWD, relPath),
        content: readFileSync(fullPath),
      });
    }
  }

  return files;
}
