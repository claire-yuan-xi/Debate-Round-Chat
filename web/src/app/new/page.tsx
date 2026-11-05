import Link from "next/link";
import { client } from "@/sanity/client";
import { MY_TEAMS_QUERY } from "@/sanity/queries";
import { requireMember } from "@/lib/dal";
import { NewChatForm } from "@/components/NewChatForm";
import { LinkChatButton } from "@/components/RoomForms";
import { muted } from "@/components/ui";

export default async function NewChatPage() {
  const member = await requireMember("/new");
  const groups = await client.fetch(MY_TEAMS_QUERY, { memberId: member._id });

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/" className={`text-sm underline ${muted}`}>
          ← Back
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">New chat</h1>
      </div>
      {groups.length > 0 ? (
        <NewChatForm groups={groups} meId={member._id} />
      ) : (
        <p className={muted}>
          To chat with people you know,{" "}
          <Link href="/groups/new" className="underline">
            create a group
          </Link>{" "}
          and send them the invite link.
        </p>
      )}
      <section className="flex flex-col gap-2 border-t border-black/10 pt-5 text-sm dark:border-white/15">
        <h2 className="font-medium">Chat with anyone</h2>
        <p className={muted}>Get a link to send. They don&apos;t need an account, and it&apos;s deleted after 24 hours.</p>
        <LinkChatButton hasName={Boolean(member.name)} />
      </section>
    </main>
  );
}
