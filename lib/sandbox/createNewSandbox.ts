import { Sandbox } from "@vercel/sandbox";
import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import { createSandbox } from "@/lib/recoup-api/createSandbox";

const SANDBOX_CWD = "/vercel/sandbox";

function readSourceFiles(
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

export async function createNewSandbox(
  bearerToken: string,
  agentDataDir: string,
): Promise<Sandbox> {
  const sandboxId = await createSandbox(bearerToken);

  if (sandboxId) {
    try {
      return await Sandbox.get({ sandboxId });
    } catch (err) {
      console.warn("Failed to connect to API sandbox, falling back:", err);
    }
  }

  const sandbox = await Sandbox.create();

  const files = readSourceFiles(agentDataDir);
  if (files.length > 0) {
    await sandbox.writeFiles(files);
  }

  return sandbox;
}
