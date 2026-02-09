import { ToolLoopAgent, createAgentUIStreamResponse, stepCountIs } from "ai";
import { createBashTool } from "bash-tool";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createNewSandbox } from "@/lib/sandbox/createNewSandbox";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENT_DATA_DIR = join(__dirname, "./_agent-data");
const SANDBOX_CWD = "/vercel/sandbox";

const SYSTEM_INSTRUCTIONS = `You are an expert on just-bash, a TypeScript bash interpreter with an in-memory virtual filesystem.

You have access to a real bash sandbox with the full source code of:
- just-bash/ - The main bash interpreter
- bash-tool/ - AI SDK tool for bash

The source files are located at ${SANDBOX_CWD}.

Refer to the README.md of the projects to answer questions about just-bash and bash-tool
themselves which is your main focus. Never talk about this demo implementation unless asked explicitly.

Use the sandbox to explore the source code, demonstrate commands, and help users understand:
- How to use just-bash and bash-tool
- Bash scripting in general
- The implementation details of just-bash

Key features of just-bash:
- Pure TypeScript implementation (no WASM dependencies)
- In-memory virtual filesystem
- Supports common bash commands: ls, cat, grep, awk, sed, jq, etc.
- Custom command support via defineCommand
- Network access control with URL allowlists

Use cat to read files. Use head, tail to read parts of large files.

Keep responses concise. You have access to a full Linux environment with standard tools.`;

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const bearerToken = authHeader.slice("Bearer ".length);

  const { messages } = await req.json();
  const lastUserMessage = messages
    .filter((m: { role: string }) => m.role === "user")
    .pop();
  console.log("Prompt:", lastUserMessage?.parts?.[0]?.text);

  const t0 = Date.now();
  const sandbox = await createNewSandbox(bearerToken, AGENT_DATA_DIR);
  console.log(`[timing] createNewSandbox: ${Date.now() - t0}ms`);

  try {
    const t1 = Date.now();
    const bashToolkit = await createBashTool({
      sandbox,
      destination: SANDBOX_CWD,
      promptOptions: {
        toolPrompt:
          "Available tools: awk, cat, column, curl, cut, diff, find, grep, head, jq, join, nl, node, od, paste, printf, rev, sed, sort, split, strings, tail, tee, tr, uniq, wc, xargs, xxd, and more",
      },
    });
    console.log(`[timing] createBashTool: ${Date.now() - t1}ms`);

    // Create a fresh agent per request for proper streaming
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
    // The original `finally` block killed the sandbox immediately when
    // createAgentUIStreamResponse returned, before any tool calls ran.
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
