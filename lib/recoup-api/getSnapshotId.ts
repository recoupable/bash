const RECOUP_API_URL =
  process.env.RECOUP_API_URL || "https://recoup-api.vercel.app";

export async function getSnapshotId(
  bearerToken: string,
): Promise<string | null> {
  try {
    const response = await fetch(`${RECOUP_API_URL}/api/sandboxes`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data?.snapshot_id ?? null;
  } catch {
    return null;
  }
}
