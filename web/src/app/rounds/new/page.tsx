import Link from "next/link";
import { redirect } from "next/navigation";
import { client } from "@/sanity/client";
import { MY_TEAMS_QUERY } from "@/sanity/queries";
import { requireMember } from "@/lib/dal";
import { NewRoundForm } from "@/components/NewRoundForm";
import { muted } from "@/components/ui";

export default async function NewRoundPage() {
  const member = await requireMember("/rounds/new");
  const teams = await client.fetch(MY_TEAMS_QUERY, { memberId: member._id });
  if (teams.length === 0) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/" className={`text-sm underline ${muted}`}>
          ← Back
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">New round</h1>
      </div>
      <NewRoundForm teams={teams} meId={member._id} />
    </main>
  );
}
