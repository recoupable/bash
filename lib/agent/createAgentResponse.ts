import { ToolLoopAgent, createAgentUIStreamResponse, stepCountIs } from "ai";
import { createBashTool } from "bash-tool";
import { Sandbox } from "@vercel/sandbox";
import { after } from "next/server";
import { SANDBOX_CWD, SYSTEM_INSTRUCTIONS, TOOL_PROMPT } from "./constants";
import { saveSnapshot } from "@/lib/sandbox/saveSnapshot";

export async function createAgentResponse(
  sandbox: Sandbox,
  messages: unknown[],
  bearerToken: string,
): Promise<Response> {
  try {
    const bashToolkit = await createBashTool({
      sandbox,
      destination: SANDBOX_CWD,
      promptOptions: {
        toolPrompt: TOOL_PROMPT,
      },
    });

    const agent = new ToolLoopAgent({
      model: "claude-haiku-4-5",
      instructions: SYSTEM_INSTRUCTIONS,
      tools: {
        bash: bashToolkit.tools.bash,
      },
      stopWhen: stepCountIs(20),
    });

    const response = await createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
    });

    // Clean up sandbox after the stream finishes (not before).
    const body = response.body;
    if (body) {
      const transform = new TransformStream();
      const pipePromise = body.pipeTo(transform.writable);

      // Use after() so Vercel keeps the function alive until
      // the snapshot save completes after streaming ends.
      after(async () => {
        await pipePromise.catch(() => {});
        await saveSnapshot(sandbox, bearerToken);
        sandbox.stop().catch(() => {});
      });

      return new Response(transform.readable, {
        headers: response.headers,
        status: response.status,
      });
    }

    after(async () => {
      await saveSnapshot(sandbox, bearerToken);
      sandbox.stop().catch(() => {});
    });
    return response;
  } catch (error) {
    after(async () => {
      await saveSnapshot(sandbox, bearerToken);
      sandbox.stop().catch(() => {});
    });
    throw error;
  }
}
