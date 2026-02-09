import { ToolLoopAgent, createAgentUIStreamResponse, stepCountIs } from "ai";
import { createBashTool } from "bash-tool";
import { Sandbox } from "@vercel/sandbox";
import { SANDBOX_CWD, SYSTEM_INSTRUCTIONS, TOOL_PROMPT } from "./constants";

export async function createAgentResponse(
  sandbox: Sandbox,
  messages: unknown[],
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
      body.pipeTo(transform.writable).finally(() => {
        sandbox.stop().catch(() => {});
      });
      return new Response(transform.readable, {
        headers: response.headers,
        status: response.status,
      });
    }

    sandbox.stop().catch(() => {});
    return response;
  } catch (error) {
    sandbox.stop().catch(() => {});
    throw error;
  }
}
