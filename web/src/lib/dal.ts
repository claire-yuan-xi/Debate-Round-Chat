import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { client } from "@/sanity/client";
import { MEMBER_QUERY, ROUND_ACCESS_QUERY } from "@/sanity/queries";
import { readSession } from "./session";

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
  const round = await client.fetch(ROUND_ACCESS_QUERY, { id: roundId, memberId });
  return round?.isParticipant ? round : null;
}

/** Only allow redirects to paths on this site. */
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
