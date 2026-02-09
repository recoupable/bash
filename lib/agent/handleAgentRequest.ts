import { Sandbox } from "@vercel/sandbox";
import { createAgentResponse } from "./createAgentResponse";

type CreateSandbox = (bearerToken: string) => Promise<Sandbox>;

export async function handleAgentRequest(
  req: Request,
  createSandbox: CreateSandbox,
): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bearerToken = authHeader.slice("Bearer ".length);

  const { messages } = await req.json();
  const lastUserMessage = messages
    .filter((m: { role: string }) => m.role === "user")
    .pop();
  console.log("Prompt:", lastUserMessage?.parts?.[0]?.text);

  const sandbox = await createSandbox(bearerToken);

  return createAgentResponse(sandbox, messages, bearerToken);
}
