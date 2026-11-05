import Link from "next/link";
import { notFound } from "next/navigation";
import { client } from "@/sanity/client";
import { MANAGE_QUERY } from "@/sanity/queries";
import { isOwner, requireMember } from "@/lib/dal";
import { DeleteGroupButton, DeletePersonButton, RemoveTestDataButton } from "@/components/ManageActions";
import { card, muted } from "@/components/ui";

export default async function ManagePage() {
  const member = await requireMember("/manage");
  // To anyone else, this page doesn't exist.
  if (!isOwner(member)) notFound();
  const { people, groups, openChats, directChats, temporaryChats } = await client.fetch(MANAGE_QUERY);

  const testPeople = people.filter((p) => p.email?.endsWith("@example.test"));
  const testIds = new Set(testPeople.map((p) => p._id));
  const testGroups = groups.filter((g) => g.memberIds?.length && g.memberIds.every((id) => testIds.has(id)));
  const stats = [
    ["People", people.length],
    ["Groups", groups.length],
    ["Group chats", openChats],
    ["Direct messages", directChats],
    ["Temporary chats", temporaryChats],
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <div>
        <Link href="/" className={`text-sm underline ${muted}`}>
          ← Home
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Manage</h1>
        <p className={`mt-2 ${muted}`}>Only you can see this page. It never shows what anyone said in a chat.</p>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className={card}>
            <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            <dt className={`text-xs ${muted}`}>{label}</dt>
          </div>
        ))}
      </dl>

      {testPeople.length > 0 && (
        <section className={`${card} flex flex-col gap-2`}>
          <h2 className="font-semibold">Test data</h2>
          <p className={`text-sm ${muted}`}>
            Fake accounts from testing: {testPeople.map((p) => p.name ?? p.email).join(", ")}
            {testGroups.length > 0 && <>. Their groups and chats go too: {testGroups.map((g) => g.name).join(", ")}</>}.
          </p>
          <RemoveTestDataButton />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Groups</h2>
        {groups.length === 0 && <p className={muted}>No groups yet.</p>}
        <ul className="grid gap-2">
          {groups.map((group) => (
            <li key={group._id} className={`${card} flex items-center justify-between gap-3`}>
              <div className="min-w-0">
                <p className="truncate font-medium">{group.name}</p>
                <p className={`truncate text-sm ${muted}`}>
                  {(group.members ?? []).map((name) => name ?? "New member").join(", ") || "Nobody"} · {group.chatCount}{" "}
                  {group.chatCount === 1 ? "chat" : "chats"}
                </p>
              </div>
              <DeleteGroupButton id={group._id} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">People</h2>
        <ul className="grid gap-2">
          {people.map((person) => (
            <li key={person._id} className={`${card} flex items-center justify-between gap-3`}>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {person.name ?? "No name yet"}
                  {person._id === member._id && " (you)"}
                </p>
                <p className={`truncate text-sm ${muted}`}>
                  {person.email}
                  {person.groups?.length ? ` · ${person.groups.join(", ")}` : ""}
                </p>
              </div>
              {person._id !== member._id && <DeletePersonButton id={person._id} />}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
