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
  const t0 = Date.now();
  const sandboxId = await createSandbox(bearerToken);
  console.log(`[timing] POST /api/sandboxes: ${Date.now() - t0}ms (sandboxId: ${sandboxId})`);

  if (sandboxId) {
    try {
      const t1 = Date.now();
      const sandbox = await Sandbox.get({ sandboxId });
      console.log(`[timing] Sandbox.get: ${Date.now() - t1}ms`);

      const t2 = Date.now();
      await sandbox.runCommand("true");
      console.log(`[timing] sandbox warm-up: ${Date.now() - t2}ms`);

      return sandbox;
    } catch (err) {
      console.warn("Failed to connect to API sandbox, falling back:", err);
    }
  }

  const t2 = Date.now();
  const sandbox = await Sandbox.create();
  console.log(`[timing] Sandbox.create (fallback): ${Date.now() - t2}ms`);

  const files = readSourceFiles(agentDataDir);
  if (files.length > 0) {
    const t3 = Date.now();
    await sandbox.writeFiles(files);
    console.log(`[timing] writeFiles (fallback): ${Date.now() - t3}ms`);
  }

  return sandbox;
}
