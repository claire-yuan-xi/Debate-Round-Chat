"use server";

import { redirect } from "next/navigation";
import { client } from "@/sanity/client";
import { GUEST_MESSAGE_COUNTS_QUERY, MESSAGES_QUERY, ROUND_QUERY, WORKFLOW_QUERY } from "@/sanity/queries";
import { getChatAccess, getRoundAccess, requireMember } from "@/lib/dal";
import { makeEvent, planTransition, randomKey, type WorkflowDefinition } from "@shared/workflow";
import type { Result } from "./auth";

const MAX_BODY = 2000;
const MAX_NAME = 40;
// Anyone with a temporary chat's link can post, so its messages have limits.
const MAX_ROOM_MESSAGES = 1000;
const MAX_GUEST_MESSAGES_PER_MINUTE = 30;

const memberRef = (id: string) => ({ _key: randomKey(), _type: "reference", _ref: id, _weak: true });

async function getWorkflow() {
  return (await client.fetch(WORKFLOW_QUERY)) as WorkflowDefinition | null;
}

export async function createRound(input: {
  teamId: string;
  title: string;
  teammateIds: string[];
  speeches: string[];
}): Promise<Result> {
  const member = await requireMember();
  const teamMemberIds = await client.fetch<string[] | null>(`*[_type == "team" && _id == $id][0].members[]._ref`, {
    id: input.teamId,
  });
  if (!teamMemberIds?.includes(member._id)) return { ok: false, error: "You're not in that group." };

  const participants = [member._id, ...input.teammateIds.filter((id) => id !== member._id)];
  if (participants.some((id) => !teamMemberIds.includes(id))) {
    return { ok: false, error: "Everyone in a chat has to be in the group." };
  }
  // Naming a chat is optional. Without one it goes by who's in it.
  const others = await client.fetch<(string | null)[]>(`*[_id in $ids].name`, {
    ids: participants.filter((id) => id !== member._id),
  });
  const title = (input.title.trim() || others.filter(Boolean).join(", ") || "Chat").slice(0, 80);

  const workflow = await getWorkflow();
  const state = workflow?.initialState ?? "live";
  const round = await client.create({
    _type: "round",
    title,
    team: { _type: "reference", _ref: input.teamId, _weak: true },
    participants: [...new Set(participants)].map(memberRef),
    speeches: input.speeches
      .map((name) => name.trim().slice(0, MAX_NAME))
      .filter(Boolean)
      .map((name) => ({ _key: randomKey(), _type: "speech", name })),
    workflowState: state,
    workflowHistory: [makeEvent("create", null, state, { type: "person", name: member.name ?? member.email ?? "" })],
  });
  redirect(`/chats/${round._id}`);
}

/** Everything the chat shows, for its live refresh. */
export async function getRoundState(roundId: string) {
  if (!(await getChatAccess(roundId))) return null;
  const [round, messages] = await Promise.all([
    client.fetch(ROUND_QUERY, { id: roundId }),
    client.fetch(MESSAGES_QUERY, { id: roundId }),
  ]);
  return round ? { round, messages } : null;
}

export async function sendMessage(roundId: string, speechKey: string | null, body: string): Promise<Result> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Message is empty." };
  if (text.length > MAX_BODY) return { ok: false, error: `Keep messages under ${MAX_BODY} characters.` };

  const access = await getChatAccess(roundId);
  if (!access) return { ok: false, error: "This chat has ended, or you're no longer in it." };
  const { round, me } = access;
  if (!round.chatOpen) return { ok: false, error: "This chat is closed." };
  if (speechKey && !round.speechKeys?.includes(speechKey)) {
    return { ok: false, error: "That tab was removed." };
  }

  const isRoom = round.kind === "room";
  if (isRoom) {
    const since = new Date(Date.now() - 60_000).toISOString();
    const counts = await client.fetch(GUEST_MESSAGE_COUNTS_QUERY, { id: roundId, guestId: me._id, since });
    if (counts.inRoom >= MAX_ROOM_MESSAGES) return { ok: false, error: "This chat is full." };
    if (counts.recentFromGuest >= MAX_GUEST_MESSAGES_PER_MINUTE) {
      return { ok: false, error: "You're sending messages too quickly. Wait a moment." };
    }
  }

  await client.create({
    _type: "message",
    // Temporary chats get deleted, so nothing may block deleting one.
    round: { _type: "reference", _ref: roundId, _weak: isRoom },
    author: isRoom ? undefined : { _type: "reference", _ref: me._id, _weak: true },
    guestId: isRoom ? me._id : undefined,
    authorName: me.name,
    speechKey: speechKey ?? undefined,
    body: text,
    sentAt: new Date().toISOString(),
  });
  return { ok: true };
}

export async function addSpeechTab(roundId: string, name: string): Promise<Result> {
  const member = await requireMember();
  const label = name.trim().slice(0, MAX_NAME);
  if (!label) return { ok: false, error: "Give the tab a name." };
  const round = await getRoundAccess(roundId, member._id);
  if (!round || round.kind) return { ok: false, error: "You're not in this chat." };
  if (!round.chatOpen) return { ok: false, error: "This chat has ended." };

  await client
    .patch(roundId)
    .setIfMissing({ speeches: [] })
    .append("speeches", [{ _key: randomKey(), _type: "speech", name: label }])
    .commit();
  return { ok: true };
}

export async function addParticipant(roundId: string, teammateId: string): Promise<Result> {
  const member = await requireMember();
  const round = await getRoundAccess(roundId, member._id);
  if (!round || round.kind) return { ok: false, error: "You're not in this chat." };
  if (!round.teamMemberIds?.includes(teammateId)) return { ok: false, error: "They're not in this group." };

  const alreadyIn = await client.fetch<boolean>(`$id in *[_id == $roundId][0].participants[]._ref`, {
    id: teammateId,
    roundId,
  });
  if (!alreadyIn) {
    await client.patch(roundId).setIfMissing({ participants: [] }).append("participants", [memberRef(teammateId)]).commit();
  }
  return { ok: true };
}

export async function moveRound(roundId: string, transitionId: string): Promise<Result> {
  const member = await requireMember();
  const round = await getRoundAccess(roundId, member._id);
  if (!round || round.kind) return { ok: false, error: "You're not in this chat." };

  const plan = planTransition(await getWorkflow(), round.workflowState, transitionId, {
    type: "person",
    name: member.name ?? member.email ?? "",
  });
  if (!plan.ok) return { ok: false, error: "This chat has already changed. Refresh and try again." };

  await client
    .patch(roundId)
    .ifRevisionId(round._rev)
    .setIfMissing(plan.patch.setIfMissing)
    .set(plan.patch.set)
    .insert("after", plan.patch.insert.after, plan.patch.insert.items)
    .commit();
  return { ok: true };
}
