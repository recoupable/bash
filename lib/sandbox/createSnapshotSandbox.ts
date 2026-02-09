import { Sandbox } from "@vercel/sandbox";
import { createSandbox } from "@/lib/recoup-api/createSandbox";
import { createFreshSandbox } from "./createFreshSandbox";

export async function createSnapshotSandbox(
  bearerToken: string,
  agentDataDir: string,
): Promise<Sandbox> {
  const sandboxId = await createSandbox(bearerToken);

  if (sandboxId) {
    try {
      return await Sandbox.get({ sandboxId });
    } catch (err) {
      console.warn("Snapshot sandbox connection failed, falling back:", err);
    }
  }

  return createFreshSandbox(agentDataDir);
}
