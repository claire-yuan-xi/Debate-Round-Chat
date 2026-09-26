"use server";

import { redirect } from "next/navigation";
import { client } from "@/sanity/client";
import { TEAM_BY_INVITE_QUERY } from "@/sanity/queries";
import { requireMember } from "@/lib/dal";
import { newInviteCode } from "@/lib/tokens";
import { randomKey } from "@shared/workflow";

const memberRef = (id: string) => ({ _key: randomKey(), _type: "reference", _ref: id, _weak: true });

export async function createTeam(formData: FormData) {
  const member = await requireMember();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  await client.create({
    _type: "team",
    name,
    members: [memberRef(member._id)],
    inviteCode: newInviteCode(),
  });
  redirect("/");
}

export async function joinTeam(code: string) {
  const member = await requireMember(`/join/${code}`);
  const team = await client.fetch(TEAM_BY_INVITE_QUERY, { code });
  if (!team) redirect("/");
  const alreadyIn = await client.fetch<boolean>(
    `$memberId in *[_id == $teamId][0].members[]._ref`,
    { memberId: member._id, teamId: team._id },
  );
  if (!alreadyIn) {
    await client
      .patch(team._id)
      .setIfMissing({ members: [] })
      .append("members", [memberRef(member._id)])
      .commit();
  }
  redirect("/");
}

/** Anyone on the team can replace the invite link, for example if it was shared too widely. */
export async function resetInviteLink(teamId: string) {
  const member = await requireMember();
  const onTeam = await client.fetch<boolean>(`$memberId in *[_id == $teamId][0].members[]._ref`, {
    memberId: member._id,
    teamId,
  });
  if (!onTeam) return;
  await client.patch(teamId).set({ inviteCode: newInviteCode() }).commit();
  redirect("/");
}
