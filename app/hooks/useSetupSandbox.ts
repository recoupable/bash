import { useEffect, useRef } from "react";

const RECOUP_API_URL =
  process.env.NEXT_PUBLIC_RECOUP_API_URL || "https://recoup-api.vercel.app";

export function useSetupSandbox({
  getAccessToken,
  authenticated,
}: {
  getAccessToken: () => Promise<string | null>;
  authenticated: boolean;
}) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!authenticated || hasRun.current) return;
    hasRun.current = true;

    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };

        const res = await fetch(`${RECOUP_API_URL}/api/sandboxes`, { headers });
        if (!res.ok) return;

        const data = await res.json();
        if (data.sandboxes && data.sandboxes.length > 0) return;

        fetch(`${RECOUP_API_URL}/api/sandboxes/setup`, {
          method: "POST",
          headers,
        });
      } catch {
        // Silent — background provisioning only
      }
    })();
  }, [authenticated, getAccessToken]);
}
