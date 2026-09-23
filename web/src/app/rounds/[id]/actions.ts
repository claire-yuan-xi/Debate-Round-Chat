"use server";

import { writeClient } from "@/sanity/write-client";
import { ROUND_QUERY } from "@/sanity/queries";

type Result = { ok: true } | { ok: false; error: string };

const MAX_BODY = 2000;
const MAX_NAME = 40;

async function getOpenRound(roundId: string) {
  if (!process.env.SANITY_API_WRITE_TOKEN) {
    return { error: "The server has no Sanity write token yet (SANITY_API_WRITE_TOKEN)." };
  }
  const round = await writeClient.fetch(ROUND_QUERY, { id: roundId });
  if (!round) return { error: "That round no longer exists." };
  if (!round.chatOpen) return { error: `Chat is closed while the round is ${round.stateTitle ?? round.workflowState}.` };
  return { round };
}

export async function sendMessage(
  roundId: string,
  speechKey: string | null,
  author: string,
  body: string,
): Promise<Result> {
  const text = body.trim();
  const name = author.trim().slice(0, MAX_NAME);
  if (!text) return { ok: false, error: "Message is empty." };
  if (text.length > MAX_BODY) return { ok: false, error: `Keep messages under ${MAX_BODY} characters.` };
  if (!name) return { ok: false, error: "Set your name first." };

  const { round, error } = await getOpenRound(roundId);
  if (!round) return { ok: false, error: error! };
  if (speechKey && !round.speeches?.some((s) => s._key === speechKey)) {
    return { ok: false, error: "That speech tab was removed." };
  }

  await writeClient.create({
    _type: "message",
    round: { _type: "reference", _ref: roundId },
    speechKey: speechKey ?? undefined,
    author: name,
    body: text,
    sentAt: new Date().toISOString(),
  });
  return { ok: true };
}

export async function addSpeechTab(roundId: string, name: string): Promise<Result> {
  const label = name.trim().slice(0, MAX_NAME);
  if (!label) return { ok: false, error: "Give the tab a name." };

  const { round, error } = await getOpenRound(roundId);
  if (!round) return { ok: false, error: error! };

  await writeClient
    .patch(roundId)
    .setIfMissing({ speeches: [] })
    .insert("after", "speeches[-1]", [{ _type: "speech", name: label }])
    .commit({ autoGenerateArrayKeys: true });
  return { ok: true };
}
