import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getSandboxes } from "@/lib/recoup-api/getSandboxes";
import { setupSandbox } from "@/lib/recoup-api/setupSandbox";

/**
 *
 */
export function useSetupSandbox() {
  const { authenticated, getAccessToken } = usePrivy();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!authenticated || hasRun.current) return;
    hasRun.current = true;

    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;

        const data = await getSandboxes(token);
        if (!data) return;
        if (data.snapshot_id && data.github_repo) return;

        setupSandbox(token);
      } catch {
        // Silent — background provisioning only
      }
    })();
  }, [authenticated, getAccessToken]);
}
