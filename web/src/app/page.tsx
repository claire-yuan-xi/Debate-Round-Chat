import Link from "next/link";
import { client } from "@/sanity/client";
import { MY_OPEN_ROUNDS_QUERY, MY_TEAMS_QUERY } from "@/sanity/queries";
import { requireMember } from "@/lib/dal";
import { resetInviteLink } from "@/app/actions/teams";
import { signOut } from "@/app/actions/auth";
import { CopyButton } from "@/components/CopyButton";
import { card, muted, primaryButton, secondaryButton } from "@/components/ui";

export default async function Home() {
  const member = await requireMember();
  const [teams, rounds] = await Promise.all([
    client.fetch(MY_TEAMS_QUERY, { memberId: member._id }),
    client.fetch(MY_OPEN_ROUNDS_QUERY, { memberId: member._id }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Round Chat</h1>
        <div className={`flex items-center gap-3 text-sm ${muted}`}>
          <span>
            {member.name} ·{" "}
            <Link href="/welcome?next=/" className="underline">
              change name
            </Link>
          </span>
          <form action={signOut}>
            <button className="underline">Sign out</button>
          </form>
        </div>
      </header>

      {teams.length === 0 ? (
        <section className={`${card} flex flex-col gap-3`}>
          <h2 className="text-lg font-semibold">You&apos;re not on a team yet</h2>
          <p className={muted}>Ask a teammate for your team&apos;s invite link, or start a team and invite them.</p>
          <Link href="/teams/new" className={`${primaryButton} self-start`}>
            Create a team
          </Link>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your rounds</h2>
              <Link href="/rounds/new" className={primaryButton}>
                New round
              </Link>
            </div>
            {rounds.length === 0 ? (
              <p className={muted}>No open rounds. Start one, and add the teammates you&apos;re with.</p>
            ) : (
              <ul className="grid gap-2">
                {rounds.map((round) => (
                  <li key={round._id}>
                    <Link
                      href={`/rounds/${round._id}`}
                      className={`${card} flex flex-col gap-0.5 hover:bg-black/[.03] dark:hover:bg-white/[.05]`}
                    >
                      <span className="font-medium">{round.title}</span>
                      <span className={`text-sm ${muted}`}>
                        {round.team} · {(round.participants ?? []).filter(Boolean).join(", ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{teams.length === 1 ? "Your team" : "Your teams"}</h2>
            {teams.map((team) => {
              const inviteLink = `${process.env.APP_URL}/join/${team.inviteCode}`;
              return (
                <div key={team._id} className={`${card} flex flex-col gap-3`}>
                  <div>
                    <h3 className="font-medium">{team.name}</h3>
                    <p className={`text-sm ${muted}`}>
                      {(team.members ?? []).map((m) => m?.name ?? "New member").join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={muted}>Invite link:</span>
                    <code className="min-w-0 flex-1 truncate rounded bg-black/[.05] px-2 py-1 dark:bg-white/[.08]">
                      {inviteLink}
                    </code>
                    <CopyButton text={inviteLink} />
                    <form action={resetInviteLink.bind(null, team._id)}>
                      <button className={secondaryButton} title="The old link stops working">
                        New link
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
            <Link href="/teams/new" className={`text-sm underline ${muted}`}>
              Create another team
            </Link>
          </section>
        </>
      )}
    </main>
  );
}
