import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { client } from "@/sanity/client";
import { MEMBER_QUERY, ROUND_ACCESS_QUERY } from "@/sanity/queries";
import { readGuestSession, readSession } from "./session";

/** The signed-in member, or null. Memoized for one request. */
export const getMember = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  return client.fetch(MEMBER_QUERY, { id: session.memberId });
});

/** The signed-in member, sending everyone else to the sign-in page. */
export async function requireMember(next?: string) {
  const member = await getMember();
  if (!member) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return member;
}

/** The round, if the member is one of its participants. */
export async function getRoundAccess(roundId: string, memberId: string) {
  const round = await client.fetch(ROUND_ACCESS_QUERY, { id: roundId, memberId, guestId: "" });
  return round?.isParticipant ? round : null;
}

/** The chat and who's viewing it: a member, or for a temporary chat, anyone who joined through its link. */
export async function getChatAccess(roundId: string) {
  const [member, guest] = await Promise.all([getMember(), readGuestSession(roundId)]);
  const round = await client.fetch(ROUND_ACCESS_QUERY, {
    id: roundId,
    memberId: member?._id ?? "",
    guestId: guest?.guestId ?? "",
  });
  if (!round?.isParticipant) return null;
  if (round.kind === "room") return guest && { round, me: { _id: guest.guestId, name: guest.name }, isGuest: true };
  return member && { round, me: { _id: member._id, name: member.name ?? "" }, isGuest: false };
}

// The app's owner is whoever runs it, which is the address sign-in emails come from.
const ownerEmail = (process.env.OWNER_EMAIL ?? process.env.GMAIL_USER)?.trim().toLowerCase();

export const isOwner = (member: { email: string | null } | null) => Boolean(ownerEmail && member?.email === ownerEmail);

/** Only allow redirects to paths on this site. */
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
