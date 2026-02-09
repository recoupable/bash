const IS_PROD = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
const RECOUP_API_URL = IS_PROD
  ? "https://recoup-api.vercel.app"
  : "https://test-recoup-api.vercel.app";

export async function updateAccountSnapshot(
  bearerToken: string,
  snapshotId: string,
): Promise<void> {
  try {
    const response = await fetch(`${RECOUP_API_URL}/api/sandboxes`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ snapshotId }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("Failed to update account snapshot:", response.status, errorText);
    }
  } catch (err) {
    console.warn("Error updating account snapshot:", err);
  }
}
