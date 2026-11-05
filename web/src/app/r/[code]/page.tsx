import Link from "next/link";
import { client } from "@/sanity/client";
import { MESSAGES_QUERY, ROOM_BY_CODE_QUERY, ROUND_QUERY } from "@/sanity/queries";
import { getChatAccess, getMember } from "@/lib/dal";
import { JoinRoomForm } from "@/components/RoomForms";
import { RoundRoom } from "@/components/RoundRoom";
import { muted } from "@/components/ui";

export default async function RoomPage({ params }: PageProps<"/r/[code]">) {
  const { code } = await params;
  const room = await client.fetch(ROOM_BY_CODE_QUERY, { code });
  const member = await getMember();

  if (!room) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-3 px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">This chat has ended</h1>
        <p className={muted}>Temporary chats are deleted after 24 hours, or sooner if whoever started one ends it.</p>
        <Link href="/r/new" className="underline">
          Start a new one
        </Link>
      </main>
    );
  }

  const access = await getChatAccess(room._id);
  if (!access) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Join {room.title}</h1>
          <p className={`mt-2 ${muted}`}>
            Everyone in the chat will see the name you use, and you&apos;ll see what&apos;s been said so far.
          </p>
        </div>
        <JoinRoomForm code={code} askName={!member?.name} />
      </main>
    );
  }

  const [round, messages] = await Promise.all([
    client.fetch(ROUND_QUERY, { id: room._id }),
    client.fetch(MESSAGES_QUERY, { id: room._id }),
  ]);
  if (!round) return null;

  return (
    <RoundRoom
      initialRound={round}
      initialMessages={messages}
      workflow={null}
      me={access.me}
      backHref={member ? "/" : null}
      shareLink={`${process.env.APP_URL}/r/${code}`}
    />
  );
}
