import { createFreshSandbox } from "@/lib/sandbox/createFreshSandbox";
import { handleAgentRequest } from "@/lib/agent/handleAgentRequest";
import { AGENT_DATA_DIR } from "@/lib/agent/constants";

/**
 *
 * @param req
 */
export async function POST(req: Request) {
  return handleAgentRequest(req, () => createFreshSandbox(AGENT_DATA_DIR));
}
