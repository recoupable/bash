import { RECOUP_API_URL } from "@/lib/consts";

/**
 *
 * @param bearerToken
 */
export async function createSandbox(bearerToken: string): Promise<string | null> {
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
