// Gmail (and Google Workspace via googlemail.com) ignores dots in the local
// part and everything after a "+" - so "j.doe+work@gmail.com" and
// "jdoe@gmail.com" deliver to the same inbox. Two authorized-worker rows
// created from those spellings would look like different people even
// though they're the same Google account. This folds a raw email down to
// the form Gmail actually routes on, for duplicate detection only - the
// address as typed is still what gets stored and matched against sign-in.
export function normalizeEmailForDuplicateCheck(rawEmail: string): string {
  const email = rawEmail.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at === -1) return email;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (domain !== "gmail.com" && domain !== "googlemail.com") return email;

  const withoutAlias = local.split("+")[0];
  const withoutDots = withoutAlias.replaceAll(".", "");
  return `${withoutDots}@gmail.com`;
}

// --- Notification email sending (Resend HTTP API, no SDK dependency) ---
// Best-effort: if email isn't configured or the request fails, we log and
// move on - a notification never blocks or breaks the action that sent it.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// True when a real email provider is configured; the UI uses this to show a
// clear "not set up yet" message instead of silently no-oping.
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export function appUrl(path = ""): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://eiv-solution-air-service-work-recor.vercel.app";
  return `${base}${path}`;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!apiKey || !from || recipients.length === 0) return;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: recipients, subject, html }),
    });
    if (!res.ok) {
      console.warn(`Email send failed (${res.status}): ${await res.text()}`);
    }
  } catch (err) {
    console.warn("Email send error:", err);
  }
}

// Small self-contained HTML shell so notification emails read cleanly
// anywhere without external CSS.
export function emailLayout(
  heading: string,
  lines: string[],
  cta?: { href: string; label: string }
): string {
  const paragraphs = lines
    .map(
      (line) =>
        `<p style="margin:0 0 12px;color:#404040;font-size:15px;line-height:1.5">${line}</p>`
    )
    .join("");
  const button = cta
    ? `<a href="${cta.href}" style="display:inline-block;margin-top:8px;background:#171717;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">${cta.label}</a>`
    : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <h1 style="margin:0 0 16px;font-size:18px;color:#171717">${heading}</h1>
    ${paragraphs}
    ${button}
    <p style="margin:24px 0 0;color:#a3a3a3;font-size:12px">AeroTrack — Service Work Record</p>
  </div>`;
}
