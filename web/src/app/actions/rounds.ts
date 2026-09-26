"use server";

import { redirect } from "next/navigation";
import { client } from "@/sanity/client";
import { MESSAGES_QUERY, ROUND_QUERY, WORKFLOW_QUERY } from "@/sanity/queries";
import { getRoundAccess, requireMember } from "@/lib/dal";
import { makeEvent, planTransition, randomKey, type WorkflowDefinition } from "@shared/workflow";
import type { Result } from "./auth";

const MAX_BODY = 2000;
const MAX_NAME = 40;

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
  const title = input.title.trim().slice(0, 80);
  if (!title) return { ok: false, error: "Give the round a name." };

  const teamMemberIds = await client.fetch<string[] | null>(`*[_type == "team" && _id == $id][0].members[]._ref`, {
    id: input.teamId,
  });
  if (!teamMemberIds?.includes(member._id)) return { ok: false, error: "You're not on that team." };

  const participants = [member._id, ...input.teammateIds.filter((id) => id !== member._id)];
  if (participants.some((id) => !teamMemberIds.includes(id))) {
    return { ok: false, error: "Everyone in a round has to be on the team." };
  }

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
  redirect(`/rounds/${round._id}`);
}

/** Everything the chat shows, for its live refresh. */
export async function getRoundState(roundId: string) {
  const member = await requireMember();
  if (!(await getRoundAccess(roundId, member._id))) return null;
  const [round, messages] = await Promise.all([
    client.fetch(ROUND_QUERY, { id: roundId }),
    client.fetch(MESSAGES_QUERY, { id: roundId }),
  ]);
  return round ? { round, messages } : null;
}

export async function sendMessage(roundId: string, speechKey: string | null, body: string): Promise<Result> {
  const member = await requireMember();
  const text = body.trim();
  if (!text) return { ok: false, error: "Message is empty." };
  if (text.length > MAX_BODY) return { ok: false, error: `Keep messages under ${MAX_BODY} characters.` };

  const round = await getRoundAccess(roundId, member._id);
  if (!round) return { ok: false, error: "You're not in this round." };
  if (!round.chatOpen) return { ok: false, error: "This round is finished." };
  if (speechKey && !round.speechKeys?.includes(speechKey)) {
    return { ok: false, error: "That tab was removed." };
  }

  await client.create({
    _type: "message",
    round: { _type: "reference", _ref: roundId },
    author: { _type: "reference", _ref: member._id, _weak: true },
    authorName: member.name ?? "",
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
  if (!round) return { ok: false, error: "You're not in this round." };
  if (!round.chatOpen) return { ok: false, error: "This round is finished." };

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
  if (!round) return { ok: false, error: "You're not in this round." };
  if (!round.teamMemberIds?.includes(teammateId)) return { ok: false, error: "They're not on this team." };

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
  if (!round) return { ok: false, error: "You're not in this round." };

  const plan = planTransition(await getWorkflow(), round.workflowState, transitionId, {
    type: "person",
    name: member.name ?? member.email ?? "",
  });
  if (!plan.ok) return { ok: false, error: plan.reason };

  await client
    .patch(roundId)
    .ifRevisionId(round._rev)
    .setIfMissing(plan.patch.setIfMissing)
    .set(plan.patch.set)
    .insert("after", plan.patch.insert.after, plan.patch.insert.items)
    .commit();
  return { ok: true };
}
