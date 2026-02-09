import { Sandbox } from "@vercel/sandbox";
import { getSnapshotId } from "@/lib/recoup-api/getSnapshotId";
import { createFreshSandbox } from "./createFreshSandbox";

export async function createNewSandbox(
  bearerToken: string,
  agentDataDir: string,
): Promise<Sandbox> {
  const snapshotId = await getSnapshotId(bearerToken);

  if (snapshotId) {
    try {
      return await Sandbox.create({
        source: { type: "snapshot", snapshotId },
      });
    } catch (err) {
      console.warn("Snapshot sandbox creation failed, falling back:", err);
    }
  }

  return createFreshSandbox(agentDataDir);
}
