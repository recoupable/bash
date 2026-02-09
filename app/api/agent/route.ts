import { ToolLoopAgent, createAgentUIStreamResponse, stepCountIs } from "ai";
import { createBashTool } from "bash-tool";
import { Sandbox } from "@vercel/sandbox";
import { readdirSync, readFileSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";
import { getSnapshotId } from "@/lib/recoup-api/getSnapshotId";

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

/**
 * Recursively read all files from a directory, returning them in the format
 * expected by Sandbox.writeFiles().
 */
function readSourceFiles(
  dir: string,
  baseDir?: string
): Array<{ path: string; content: Buffer }> {
  const base = baseDir ?? dir;
  const files: Array<{ path: string; content: Buffer }> = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and other large/irrelevant dirs
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      files.push(...readSourceFiles(fullPath, base));
    } else {
      const relPath = relative(base, fullPath);
      files.push({
        path: join(SANDBOX_CWD, relPath),
        content: readFileSync(fullPath),
      });
    }
  }

  return files;
}

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

  const snapshotId = await getSnapshotId(bearerToken);

  let sandbox: Sandbox;
  let usedSnapshot = false;

  if (snapshotId) {
    try {
      sandbox = await Sandbox.create({
        source: { type: "snapshot", snapshotId },
      });
      usedSnapshot = true;
    } catch (err) {
      console.warn("Snapshot sandbox creation failed, falling back:", err);
      sandbox = await Sandbox.create();
    }
  } else {
    sandbox = await Sandbox.create();
  }

  try {
    if (!usedSnapshot) {
      // Upload source files so the agent can explore them
      const files = readSourceFiles(AGENT_DATA_DIR);
      if (files.length > 0) {
        await sandbox.writeFiles(files);
      }
    }

    const bashToolkit = await createBashTool({
      sandbox,
      destination: SANDBOX_CWD,
    });

    // Create a fresh agent per request for proper streaming
    const agent = new ToolLoopAgent({
      model: "claude-haiku-4-5",
      instructions: SYSTEM_INSTRUCTIONS,
      tools: {
        bash: bashToolkit.tools.bash,
      },
      stopWhen: stepCountIs(20),
    });

    return createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
    });
  } finally {
    // Don't await — let it clean up in background so response isn't delayed
    sandbox.stop().catch(() => {});
  }
}
