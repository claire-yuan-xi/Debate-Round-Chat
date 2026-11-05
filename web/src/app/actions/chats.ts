"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { client } from "@/sanity/client";
import {
  ACTIVE_ROOM_COUNT_QUERY,
  END_CHAT_QUERY,
  RECENT_ROOMS_BY_CREATOR_QUERY,
  ROOM_BY_CODE_QUERY,
  WORKFLOW_QUERY,
} from "@/sanity/queries";
import { getMember, requireMember } from "@/lib/dal";
import { deleteChat } from "@/lib/rooms";
import { createGuestSession, readGuestSession } from "@/lib/session";
import { newInviteCode, randomToken, sha256 } from "@/lib/tokens";
import { availableTransitions, randomKey, type WorkflowDefinition } from "@shared/workflow";
import { moveRound } from "./rounds";
import type { Result } from "./auth";

const ROOM_HOURS = 24;
const MAX_GUESTS = 25;
// Starting a temporary chat doesn't need an account, so keep one person from starting hundreds.
const MAX_ROOMS_PER_HOUR = 5;
const MAX_ACTIVE_ROOMS = 200;
const MAX_NAME = 40;

const memberRef = (id: string) => ({ _key: randomKey(), _type: "reference", _ref: id, _weak: true });

/** Open the direct message with someone in a shared group, starting it the first time. */
export async function openDirectMessage(teammateId: string) {
  const member = await requireMember();
  if (teammateId === member._id) redirect("/");
  const sharesTeam = await client.fetch<boolean>(
    `count(*[_type == "team" && $a in members[]._ref && $b in members[]._ref]) > 0`,
    { a: member._id, b: teammateId },
  );
  if (!sharesTeam) redirect("/");

  // The ID comes from the two people, so a pair only ever has one conversation.
  const _id = `direct-${sha256([member._id, teammateId].sort().join("|")).slice(0, 32)}`;
  await client.createIfNotExists({
    _id,
    _type: "round",
    kind: "direct",
    title: "Direct message",
    participants: [memberRef(member._id), memberRef(teammateId)],
  });
  redirect(`/dm/${_id}`);
}

async function creatorHash() {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return sha256(`${ip}|${process.env.SESSION_SECRET}`);
}

export async function createRoom(input: { title: string; name: string }): Promise<Result> {
  const member = await getMember();
  const name = (member?.name ?? input.name).trim().slice(0, MAX_NAME);
  if (!name) return { ok: false, error: "Add the name people will see." };

  const hash = await creatorHash();
  const since = new Date(Date.now() - 3600_000).toISOString();
  const [recent, active] = await Promise.all([
    client.fetch(RECENT_ROOMS_BY_CREATOR_QUERY, { creatorHash: hash, since }),
    client.fetch(ACTIVE_ROOM_COUNT_QUERY),
  ]);
  if (recent >= MAX_ROOMS_PER_HOUR) return { ok: false, error: "You've started a few chats already. Try again in an hour." };
  if (active >= MAX_ACTIVE_ROOMS) return { ok: false, error: "Too many temporary chats are open right now. Try again later." };

  const expiresAt = new Date(Date.now() + ROOM_HOURS * 3600_000);
  const guestId = randomToken(12);
  const joinCode = newInviteCode();
  const room = await client.create({
    _type: "round",
    kind: "room",
    title: input.title.trim().slice(0, 80) || "Temporary chat",
    joinCode,
    expiresAt: expiresAt.toISOString(),
    createdBy: guestId,
    creatorHash: hash,
    guests: [{ _key: randomKey(), _type: "roomGuest", guestId, name, memberId: member?._id }],
  });
  await createGuestSession(room._id, { guestId, name }, expiresAt);
  redirect(`/r/${joinCode}`);
}

export async function joinRoom(code: string, rawName: string): Promise<Result> {
  const room = await client.fetch(ROOM_BY_CODE_QUERY, { code });
  if (!room?.expiresAt) return { ok: false, error: "This chat has ended." };

  const member = await getMember();
  const name = (member?.name ?? rawName).trim().slice(0, MAX_NAME);
  if (!name) return { ok: false, error: "Add the name people will see." };

  const current = await readGuestSession(room._id);
  const guests = room.guests ?? [];
  if (!current || !guests.some((g) => g.guestId === current.guestId)) {
    // A member who lost their cookie comes back as themselves. Guests have nothing to prove it.
    const returning = member && guests.find((g) => g.memberId === member._id);
    const guestId = returning?.guestId ?? randomToken(12);
    if (!returning) {
      if (guests.length >= MAX_GUESTS) return { ok: false, error: "This chat is full." };
      await client
        .patch(room._id)
        .setIfMissing({ guests: [] })
        .append("guests", [{ _key: randomKey(), _type: "roomGuest", guestId, name, memberId: member?._id }])
        .commit();
    }
    await createGuestSession(room._id, { guestId, name }, new Date(room.expiresAt));
  }
  redirect(`/r/${code}`);
}

/**
 * End a chat for everyone. A temporary chat gets deleted, and only whoever started it can do
 * that. A group chat closes, and anyone in it can do that or reopen it.
 */
export async function endChat(chatId: string): Promise<Result> {
  const chat = await client.fetch(END_CHAT_QUERY, { id: chatId });
  if (!chat) return { ok: true };

  if (chat.kind === "room") {
    const [member, guest] = await Promise.all([getMember(), readGuestSession(chatId)]);
    const started = guest?.guestId === chat.createdBy || (member && member._id === chat.creatorMemberId);
    if (!started) return { ok: false, error: "Only the person who started this chat can end it." };
    await deleteChat(chatId);
  } else {
    const workflow = (await client.fetch(WORKFLOW_QUERY)) as WorkflowDefinition | null;
    const end = availableTransitions(workflow, chat.workflowState, "person").find(
      (t) => !workflow?.states.find((s) => s.id === t.to)?.chatOpen,
    );
    if (!end) return { ok: true };
    const result = await moveRound(chatId, end.id);
    if (!result.ok) return result;
  }
  revalidatePath("/");
  return { ok: true };
}
