import Link from "next/link";
import { createTeam } from "@/app/actions/teams";
import { requireMember } from "@/lib/dal";
import { field, muted, primaryButton } from "@/components/ui";

export default async function NewTeamPage() {
  await requireMember("/teams/new");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <Link href="/" className={`text-sm underline ${muted}`}>
          ← Back
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Create a team</h1>
        <p className={`mt-2 ${muted}`}>You&apos;ll get an invite link to share. Name your team:</p>
      </div>
      <form action={createTeam} className="flex flex-col gap-3 text-sm">
        <input name="name" required autoFocus maxLength={60} className={field} />
        <button type="submit" className={primaryButton}>
          Create team
        </button>
      </form>
    </main>
  );
}
