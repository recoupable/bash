const IS_PROD = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
const RECOUP_API_URL = IS_PROD
  ? "https://recoup-api.vercel.app"
  : "https://test-recoup-api.vercel.app";

export async function createSandbox(
  bearerToken: string,
): Promise<string | null> {
  try {
    const response = await fetch(`${RECOUP_API_URL}/api/sandboxes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data?.sandboxes?.[0]?.sandboxId ?? null;
  } catch {
    return null;
  }
}
