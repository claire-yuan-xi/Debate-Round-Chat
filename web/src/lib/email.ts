import "server-only";
import nodemailer from "nodemailer";

/**
 * Sends the sign-in link from a Gmail account using an app password. Without those
 * settings in development, the link is printed to the server console instead.
 */
export async function sendSignInEmail(to: string, link: string) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email isn't set up on this server (GMAIL_USER / GMAIL_APP_PASSWORD).");
    }
    console.log(`\n[dev] Sign-in link for ${to}:\n${link}\n`);
    return;
  }

  const transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  await transport.sendMail({
    from: `Round Chat <${user}>`,
    to,
    subject: "Your Round Chat sign-in link",
    text: `Sign in to Round Chat:\n\n${link}\n\nThe link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.`,
    html: `<p>Sign in to Round Chat:</p>
<p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">Sign in</a></p>
<p style="color:#666;font-size:13px">The link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.</p>`,
  });
}
