const RECOUP_API_URL =
  process.env.RECOUP_API_URL || "https://recoup-api.vercel.app";

export async function createSandbox(
  bearerToken: string,
): Promise<string | null> {
  try {
    const response = await fetch(`${RECOUP_API_URL}/api/sandboxes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data?.sandboxes?.[0]?.sandboxId ?? null;
  } catch {
    return null;
  }
}
