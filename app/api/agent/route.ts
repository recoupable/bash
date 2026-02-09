import { createSnapshotSandbox } from "@/lib/sandbox/createSnapshotSandbox";
import { handleAgentRequest } from "@/lib/agent/handleAgentRequest";
import { AGENT_DATA_DIR } from "@/lib/agent/constants";

export async function POST(req: Request) {
  return handleAgentRequest(req, (bearerToken) =>
    createSnapshotSandbox(bearerToken, AGENT_DATA_DIR),
  );
}
