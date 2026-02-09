import { Sandbox } from "@vercel/sandbox";
import { readSourceFiles } from "./readSourceFiles";

export async function createFreshSandbox(agentDataDir: string): Promise<Sandbox> {
  const sandbox = await Sandbox.create();

  const files = readSourceFiles(agentDataDir);
  if (files.length > 0) {
    await sandbox.writeFiles(files);
  }

  return sandbox;
}
