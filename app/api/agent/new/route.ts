import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createFreshSandbox } from "@/lib/sandbox/createFreshSandbox";
import { createAgentResponse } from "@/lib/agent/createAgentResponse";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENT_DATA_DIR = join(__dirname, "../_agent-data");

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { messages } = await req.json();
  const lastUserMessage = messages
    .filter((m: { role: string }) => m.role === "user")
    .pop();
  console.log("Prompt (no snapshot):", lastUserMessage?.parts?.[0]?.text);

  const sandbox = await createFreshSandbox(AGENT_DATA_DIR);

  return createAgentResponse(sandbox, messages);
}
