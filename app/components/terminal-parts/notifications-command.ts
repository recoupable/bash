import { defineCommand } from "just-bash/browser";

const RECOUP_API_URL =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? "https://recoup-api.vercel.app"
    : "https://test-recoup-api.vercel.app";

const USAGE = `Usage: notifications <options>

Send a notification email to the authenticated account's email address.

Required:
  --subject <text>     Email subject line

Optional:
  --cc <email>         CC email (repeatable)
  --text <body>        Plain text / Markdown body
  --html <body>        HTML body (takes precedence over --text)
  --room-id <id>       Room ID for chat link in footer

Examples:
  notifications --subject "Pulse Report" --text "Here's your weekly summary."
  notifications --subject "Update" --cc admin@example.com --text "# Heading\\nBody text"
`;

function parseArgs(args: string[]): {
  cc: string[];
  subject: string;
  text?: string;
  html?: string;
  room_id?: string;
  error?: string;
} {
  const cc: string[] = [];
  let subject = "";
  let text: string | undefined;
  let html: string | undefined;
  let room_id: string | undefined;

  let i = 0;
  while (i < args.length) {
    const flag = args[i];
    const value = args[i + 1];

    if (!value && flag.startsWith("--")) {
      return { cc, subject, error: `Missing value for ${flag}` };
    }

    switch (flag) {
      case "--cc":
        cc.push(value);
        i += 2;
        break;
      case "--subject":
        subject = value;
        i += 2;
        break;
      case "--text":
        text = value;
        i += 2;
        break;
      case "--html":
        html = value;
        i += 2;
        break;
      case "--room-id":
        room_id = value;
        i += 2;
        break;
      default:
        return { cc, subject, error: `Unknown option: ${flag}` };
    }
  }

  if (!subject) {
    return { cc, subject, error: "Missing required --subject option" };
  }

  return { cc, subject, text, html, room_id };
}

export function createNotificationsCommand(
  getAccessToken: () => Promise<string | null>,
) {
  return defineCommand("notifications", async (args) => {
    if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
      return { stdout: USAGE, stderr: "", exitCode: 0 };
    }

    const parsed = parseArgs(args);
    if (parsed.error) {
      return { stdout: "", stderr: `Error: ${parsed.error}\n\n${USAGE}`, exitCode: 1 };
    }

    const token = await getAccessToken();
    if (!token) {
      return {
        stdout: "",
        stderr: "Error: Not authenticated. Please log in and try again.\n",
        exitCode: 1,
      };
    }

    const body: Record<string, unknown> = {
      subject: parsed.subject,
    };
    if (parsed.cc.length > 0) body.cc = parsed.cc;
    if (parsed.text) body.text = parsed.text;
    if (parsed.html) body.html = parsed.html;
    if (parsed.room_id) body.room_id = parsed.room_id;

    try {
      const response = await fetch(`${RECOUP_API_URL}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error || `Request failed with status ${response.status}`;
        return { stdout: "", stderr: `Error: ${errorMsg}\n`, exitCode: 1 };
      }

      return {
        stdout: `${data.message || "Notification sent successfully."}\n`,
        stderr: "",
        exitCode: 0,
      };
    } catch (error) {
      return {
        stdout: "",
        stderr: `Error: ${error instanceof Error ? error.message : "Unknown error"}\n`,
        exitCode: 1,
      };
    }
  });
}
