import { RECOUP_API_URL } from "@/lib/consts";

/**
 *
 * @param bearerToken
 */
export async function getSandboxes(bearerToken: string) {
  const response = await fetch(`${RECOUP_API_URL}/api/sandboxes`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!response.ok) return null;

  return response.json();
}
