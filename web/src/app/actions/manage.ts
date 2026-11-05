"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { client } from "@/sanity/client";
import { MANAGE_QUERY } from "@/sanity/queries";
import { isOwner, requireMember } from "@/lib/dal";
import { deleteChat } from "@/lib/rooms";

async function requireOwner() {
  const member = await requireMember();
  if (!isOwner(member)) notFound();
  return member;
}

async function removeGroup(groupId: string) {
  const chats = await client.fetch<string[]>(`*[_type == "round" && team._ref == $groupId]._id`, { groupId });
  for (const id of chats) await deleteChat(id);
  await client.delete(groupId);
}

async function removePerson(personId: string) {
  const { email, teams, rounds, directs } = await client.fetch<{
    email: string | null;
    teams: string[];
    rounds: string[];
    directs: string[];
  }>(
    `{
      "email": *[_id == $id][0].email,
      "teams": *[_type == "team" && $id in members[]._ref]._id,
      "rounds": *[_type == "round" && !defined(kind) && $id in participants[]._ref]._id,
      "directs": *[_type == "round" && kind == "direct" && $id in participants[]._ref]._id
    }`,
    { id: personId },
  );
  for (const id of directs) await deleteChat(id);
  const tx = client.transaction();
  for (const id of teams) tx.patch(id, (p) => p.unset([`members[_ref == "${personId}"]`]));
  for (const id of rounds) tx.patch(id, (p) => p.unset([`participants[_ref == "${personId}"]`]));
  await tx.commit();
  if (email) await client.delete({ query: `*[_type == "loginToken" && email == $email]`, params: { email } });
  await client.delete(personId);
}

/** Delete a group, its chats and their messages. */
export async function deleteGroup(groupId: string) {
  await requireOwner();
  await removeGroup(groupId);
  revalidatePath("/manage");
}

/** Delete someone's account. What they said in group chats stays, under the name they used. */
export async function deletePerson(personId: string) {
  const owner = await requireOwner();
  if (personId === owner._id) return;
  await removePerson(personId);
  revalidatePath("/manage");
}

/** The fake @example.test accounts from testing, and any group only they are in. */
export async function removeTestData() {
  const owner = await requireOwner();
  const { people, groups } = await client.fetch(MANAGE_QUERY);
  const testPeople = people.filter((p) => p.email?.endsWith("@example.test") && p._id !== owner._id);
  const testIds = new Set(testPeople.map((p) => p._id));
  for (const group of groups) {
    if (group.memberIds?.length && group.memberIds.every((id) => testIds.has(id))) await removeGroup(group._id);
  }
  for (const person of testPeople) await removePerson(person._id);
  revalidatePath("/manage");
}
