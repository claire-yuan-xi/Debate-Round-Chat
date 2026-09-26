import Link from "next/link";
import { client } from "@/sanity/client";
import { TEAM_BY_INVITE_QUERY } from "@/sanity/queries";
import { requireMember } from "@/lib/dal";
import { joinTeam } from "@/app/actions/teams";
import { muted, primaryButton } from "@/components/ui";

export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  await requireMember(`/join/${code}`);
  const team = await client.fetch(TEAM_BY_INVITE_QUERY, { code });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      {team ? (
        <>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Join {team.name}</h1>
            <p className={`mt-2 ${muted}`}>
              {team.memberCount} {team.memberCount === 1 ? "person is" : "people are"} on this team.
            </p>
          </div>
          <form action={joinTeam.bind(null, code)}>
            <button type="submit" className={primaryButton}>
              Join team
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">This invite link doesn&apos;t work</h1>
          <p className={muted}>Someone may have made a new one. Ask a teammate for the current link.</p>
          <Link href="/" className="underline">
            Go home
          </Link>
        </>
      )}
    </main>
  );
}
