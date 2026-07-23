import { NextResponse } from "next/server";

// Feedback / submission endpoint. Posts the message to a Slack channel via the
// Slack Web API using a bot token that lives ONLY on the server (never shipped
// to the client). This is the one server-side seam in an otherwise client-only
// app — it exists because a bot token cannot be exposed in the browser.
//
// Required env (see .env.example):
//   SLACK_BOT_TOKEN        xoxb-… bot token with chat:write scope
//   SLACK_FEEDBACK_CHANNEL channel id (e.g. C0123ABCD) or #channel-name the bot is in
//
// No new dependencies — plain fetch against slack.com/api/chat.postMessage.

export const runtime = "nodejs";

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  submit: { label: "Problem / result submission", emoji: "🧮" },
  correction: { label: "Correction to a statement or status", emoji: "✏️" },
  idea: { label: "Idea", emoji: "💡" },
  question: { label: "Question", emoji: "❓" },
};

interface FeedbackBody {
  category?: string;
  message?: string;
  problem?: { title?: string; slug?: string } | null;
  url?: string;
}

export async function POST(req: Request) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_FEEDBACK_CHANNEL;
  if (!token || !channel) {
    return NextResponse.json(
      { ok: false, error: "Feedback isn't configured on the server yet." },
      { status: 501 },
    );
  }

  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const meta = CATEGORY_META[String(body.category ?? "")];
  if (!meta) {
    return NextResponse.json({ ok: false, error: "Unknown category." }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (message.length < 2 || message.length > 1000) {
    return NextResponse.json(
      { ok: false, error: "Message must be between 2 and 1000 characters." },
      { status: 400 },
    );
  }

  const problem =
    body.problem && typeof body.problem === "object" && body.problem.title
      ? { title: String(body.problem.title).slice(0, 200), slug: String(body.problem.slug ?? "") }
      : null;
  const url = typeof body.url === "string" ? body.url.slice(0, 300) : "";

  const contextLine = problem
    ? `*Re:* ${problem.title}${problem.slug ? ` (\`${problem.slug}\`)` : ""}`
    : "*Re:* homepage / general";

  const text = [
    `${meta.emoji} *${meta.label}* — Math Lab`,
    contextLine,
    url ? `<${url}|source page>` : null,
    "",
    message,
  ]
    .filter(Boolean)
    .join("\n");

  let data: { ok?: boolean; error?: string };
  try {
    const resp = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel, text, unfurl_links: false }),
    });
    data = (await resp.json()) as { ok?: boolean; error?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach Slack." }, { status: 502 });
  }

  if (!data.ok) {
    return NextResponse.json(
      { ok: false, error: `Slack rejected the message (${data.error ?? "unknown"}).` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
