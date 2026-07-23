const FEEDBACK_TO = "jack4444baby@gmail.com";
const DEFAULT_FROM = "BestPlanner <onboarding@resend.dev>";

function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

async function sendWithResend({ subject, body, replyTo, apiKey, from }) {
  const payload = {
    from,
    to: [FEEDBACK_TO],
    subject,
    text: body,
  };
  if (replyTo) payload.reply_to = replyTo;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error("Resend failed");
    error.status = 502;
    error.detail = detail;
    throw error;
  }

  return { provider: "resend" };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const data = readJsonBody(req);
  const trimmedSubject = String(data.subject || "").trim();
  const trimmedBody = String(data.body || "").trim();
  const replyTo = isValidEmail(data.replyTo) ? String(data.replyTo).trim() : undefined;

  if (!trimmedSubject && !trimmedBody) {
    return res.status(400).json({ error: "Subject or message is required." });
  }

  const subject = trimmedSubject || "BestPlanner feedback";
  const body = trimmedBody || "(No message)";
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || DEFAULT_FROM;

  if (!apiKey) {
    return res.status(503).json({
      error: "Email sending isn’t set up yet. Please try again later.",
    });
  }

  try {
    const result = await sendWithResend({ subject, body, replyTo, apiKey, from });
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error("feedback send failed", error?.detail || error);
    return res.status(error?.status || 500).json({
      error: "Could not send your message. Please try again.",
    });
  }
}
