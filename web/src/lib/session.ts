import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "session";
const MAX_AGE_DAYS = 30;
const key = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function createSession(memberId: string) {
  const token = await new SignJWT({ memberId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DAYS}d`)
    .sign(key);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
  });
}

export async function readSession(): Promise<{ memberId: string } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return typeof payload.memberId === "string" ? { memberId: payload.memberId } : null;
  } catch {
    return null;
  }
}

const guestCookie = (roomId: string) => `room-${roomId}`;

/** Who someone is in one temporary chat. Good until the chat ends, signed in or not. */
export async function createGuestSession(roomId: string, guest: { guestId: string; name: string }, expiresAt: Date) {
  const token = await new SignJWT({ roomId, ...guest })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key);
  (await cookies()).set(guestCookie(roomId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function readGuestSession(roomId: string): Promise<{ guestId: string; name: string } | null> {
  const token = (await cookies()).get(guestCookie(roomId))?.value;
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (payload.roomId !== roomId || typeof payload.guestId !== "string" || typeof payload.name !== "string") return null;
    return { guestId: payload.guestId, name: payload.name };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}
