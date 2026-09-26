"use server";

import { redirect } from "next/navigation";
import { client } from "@/sanity/client";
import {
  LOGIN_TOKEN_QUERY,
  MEMBER_BY_EMAIL_QUERY,
  RECENT_LOGIN_TOKENS_QUERY,
} from "@/sanity/queries";
import { requireMember, safeNext } from "@/lib/dal";
import { sendSignInEmail } from "@/lib/email";
import { createSession, deleteSession } from "@/lib/session";
import { randomToken, sha256 } from "@/lib/tokens";

export type Result = { ok: true } | { ok: false; error: string };

const LINK_MINUTES = 15;
const MAX_LINKS_PER_WINDOW = 3;

export async function requestSignInLink(rawEmail: string, next?: string): Promise<Result> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { ok: false, error: "That doesn't look like an email address." };
  }
  if (!process.env.APP_URL) return { ok: false, error: "The server is missing APP_URL." };

  const since = new Date(Date.now() - LINK_MINUTES * 60_000).toISOString();
  const recent = await client.fetch(RECENT_LOGIN_TOKENS_QUERY, { email, since });
  if (recent >= MAX_LINKS_PER_WINDOW) {
    return { ok: false, error: "We've sent a few links already. Check your inbox, or wait 15 minutes." };
  }

  // Tidy up links nobody used.
  await client.delete({ query: `*[_type == "loginToken" && expiresAt < now()]` });

  const token = randomToken();
  await client.create({
    _type: "loginToken",
    email,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + LINK_MINUTES * 60_000).toISOString(),
    next: safeNext(next),
  });

  try {
    await sendSignInEmail(email, `${process.env.APP_URL}/auth/verify?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error("Sending sign-in email failed", err);
    return { ok: false, error: "The email couldn't be sent. Try again in a minute." };
  }
  return { ok: true };
}

/** Uses a sign-in link. It's a button press, not a page load, so email scanners can't spend it. */
export async function signInWithToken(token: string): Promise<Result> {
  const link = await client.fetch(LOGIN_TOKEN_QUERY, { tokenHash: sha256(token) });
  if (!link?.email || !link.expiresAt || new Date(link.expiresAt) < new Date()) {
    return { ok: false, error: "This link has expired or was already used. Ask for a new one." };
  }
  await client.delete(link._id);

  const existing = await client.fetch(MEMBER_BY_EMAIL_QUERY, { email: link.email });
  const memberId = existing?._id ?? (await client.create({ _type: "member", email: link.email }))._id;
  await createSession(memberId);

  // New members pick the name teammates will see first.
  const next = safeNext(link.next);
  redirect(existing?.name ? next : `/welcome?next=${encodeURIComponent(next)}`);
}

export async function saveName(formData: FormData) {
  const member = await requireMember();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  if (name) await client.patch(member._id).set({ name }).commit();
  redirect(safeNext(String(formData.get("next") ?? "/")));
}

export async function signOut() {
  await deleteSession();
  redirect("/login");
}
