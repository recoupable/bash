import { RECOUP_API_URL } from "@/lib/consts";

/**
 *
 * @param bearerToken
 */
export function setupSandbox(bearerToken: string) {
  fetch(`${RECOUP_API_URL}/api/sandboxes/setup`, {
    method: "POST",
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
}
