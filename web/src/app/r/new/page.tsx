import Link from "next/link";
import { getMember } from "@/lib/dal";
import { NewRoomForm } from "@/components/RoomForms";
import { muted } from "@/components/ui";

export default async function NewRoomPage() {
  const member = await getMember();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <Link href="/" className={`text-sm underline ${muted}`}>
          ← Back
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">New temporary chat</h1>
        <p className={`mt-2 ${muted}`}>
          You&apos;ll get a link to share. Anyone with it can join and read the chat. It&apos;s deleted after 24 hours.
        </p>
      </div>
      <NewRoomForm askName={!member?.name} />
    </main>
  );
}
