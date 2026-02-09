import { Sandbox } from "@vercel/sandbox";
import { updateAccountSnapshot } from "@/lib/recoup-api/updateAccountSnapshot";

export async function saveSnapshot(
  sandbox: Sandbox,
  bearerToken: string,
): Promise<void> {
  try {
    const result = await sandbox.snapshot();
    await updateAccountSnapshot(bearerToken, result.snapshotId);
  } catch (err) {
    console.warn("Failed to save snapshot:", err);
  }
}
