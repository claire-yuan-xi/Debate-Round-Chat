import "server-only";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { writeClient } from "@/sanity/write-client";
import { ROUND_JOIN_CODE_QUERY } from "@/sanity/queries";

// Must match shared/joinCode.ts in the repo root.
const roundAccessId = (roundId: string) => `roundAccess.${roundId}`;
const cookieName = (roundId: string) => `round_${roundId}`;

export function normalizeJoinCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function getJoinCode(roundId: string): Promise<string | null> {
  if (!process.env.SANITY_API_WRITE_TOKEN) return null;
  return writeClient.fetch(ROUND_JOIN_CODE_QUERY, { accessId: roundAccessId(roundId) });
}

export function codesMatch(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when this browser has joined the round with its current code. */
export async function hasRoundAccess(roundId: string) {
  const given = (await cookies()).get(cookieName(roundId))?.value;
  if (!given) return false;
  const expected = await getJoinCode(roundId);
  return expected !== null && codesMatch(given, expected);
}

export async function rememberRoundAccess(roundId: string, code: string) {
  (await cookies()).set(cookieName(roundId), code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}
