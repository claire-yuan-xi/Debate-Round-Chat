import Link from "next/link";
import { client } from "@/sanity/client";
import { MY_CHATS_QUERY, MY_TEAMS_QUERY } from "@/sanity/queries";
import { isOwner, requireMember } from "@/lib/dal";
import { resetInviteLink } from "@/app/actions/teams";
import { signOut } from "@/app/actions/auth";
import { ChatList, type ChatRow } from "@/components/ChatList";
import { CopyButton } from "@/components/CopyButton";
import { TeamMembers } from "@/components/TeamMembers";
import { card, muted, primaryButton, secondaryButton } from "@/components/ui";

export default async function Home() {
  const member = await requireMember();
  const [groups, chats] = await Promise.all([
    client.fetch(MY_TEAMS_QUERY, { memberId: member._id }),
    client.fetch(MY_CHATS_QUERY, { memberId: member._id }),
  ]);

  const rows: ChatRow[] = chats.map((chat) => {
    const others = (chat.participants ?? []).filter((p) => p && p._id !== member._id);
    if (chat.kind === "direct") {
      return { id: chat._id, href: `/dm/${chat._id}`, title: others[0]?.name ?? "New member", subtitle: "Direct message" };
    }
    if (chat.kind === "room") {
      return {
        id: chat._id,
        href: `/r/${chat.joinCode}`,
        title: chat.title ?? "Temporary chat",
        subtitle: "Temporary chat, anyone with the link",
        endQuestion: chat.startedIt ? "Delete for everyone?" : undefined,
      };
    }
    return {
      id: chat._id,
      href: `/chats/${chat._id}`,
      title: chat.title ?? "Chat",
      subtitle: [chat.team, others.map((p) => p?.name ?? "New member").join(", ")].filter(Boolean).join(" · "),
      endQuestion: "End for everyone?",
    };
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Sidenotes</h1>
        <div className={`flex items-center gap-3 text-sm ${muted}`}>
          <span>
            {member.name} ·{" "}
            <Link href="/welcome?next=/" className="underline">
              change name
            </Link>
          </span>
          {isOwner(member) && (
            <Link href="/manage" className="underline">
              Manage
            </Link>
          )}
          <form action={signOut}>
            <button className="underline">Sign out</button>
          </form>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your chats</h2>
          <Link href="/new" className={primaryButton}>
            New chat
          </Link>
        </div>
        {rows.length === 0 ? <p className={muted}>No chats open. Start one and it&apos;ll show up here.</p> : <ChatList chats={rows} />}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{groups.length === 1 ? "Your group" : "Your groups"}</h2>
        {groups.length === 0 && (
          <p className={muted}>A group is the people you chat with regularly. Create one and send them the invite link.</p>
        )}
        {groups.map((group) => {
          const inviteLink = `${process.env.APP_URL}/join/${group.inviteCode}`;
          return (
            <div key={group._id} className={`${card} flex flex-col gap-3`}>
              <h3 className="font-medium">{group.name}</h3>
              <TeamMembers
                teamId={group._id}
                teamName={group.name ?? "this group"}
                meId={member._id}
                members={(group.members ?? []).filter((m) => m !== null)}
              />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={muted}>Invite link:</span>
                <code className="min-w-0 flex-1 truncate rounded bg-black/[.05] px-2 py-1 dark:bg-white/[.08]">
                  {inviteLink}
                </code>
                <CopyButton text={inviteLink} />
                <form action={resetInviteLink.bind(null, group._id)}>
                  <button className={secondaryButton} title="The old link stops working. Use this after removing someone.">
                    New link
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        <Link href="/groups/new" className={`text-sm underline ${muted}`}>
          Create {groups.length === 0 ? "a" : "another"} group
        </Link>
      </section>
    </main>
  );
}
