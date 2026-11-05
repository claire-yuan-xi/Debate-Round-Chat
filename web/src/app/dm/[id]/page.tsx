import { notFound } from "next/navigation";
import { client } from "@/sanity/client";
import { MESSAGES_QUERY, ROUND_QUERY } from "@/sanity/queries";
import { getRoundAccess, requireMember } from "@/lib/dal";
import { RoundRoom } from "@/components/RoundRoom";

export default async function DirectMessagePage({ params }: PageProps<"/dm/[id]">) {
  const { id } = await params;
  const member = await requireMember(`/dm/${id}`);
  // Conversations you're not in look the same as ones that don't exist.
  const access = await getRoundAccess(id, member._id);
  if (access?.kind !== "direct") notFound();

  const [round, messages] = await Promise.all([
    client.fetch(ROUND_QUERY, { id }),
    client.fetch(MESSAGES_QUERY, { id }),
  ]);
  if (!round) notFound();

  return (
    <RoundRoom
      initialRound={round}
      initialMessages={messages}
      workflow={null}
      me={{ _id: member._id, name: member.name ?? "" }}
    />
  );
}
