import { notFound } from "next/navigation";
import { client } from "@/sanity/client";
import { MESSAGES_QUERY, ROUND_QUERY, WORKFLOW_QUERY } from "@/sanity/queries";
import { getRoundAccess, requireMember } from "@/lib/dal";
import { RoundRoom } from "@/components/RoundRoom";
import type { WorkflowDefinition } from "@shared/workflow";

export default async function RoundPage({ params }: PageProps<"/rounds/[id]">) {
  const { id } = await params;
  const member = await requireMember(`/rounds/${id}`);
  // Rounds you're not in look the same as rounds that don't exist.
  if (!(await getRoundAccess(id, member._id))) notFound();

  const [round, messages, workflow] = await Promise.all([
    client.fetch(ROUND_QUERY, { id }),
    client.fetch(MESSAGES_QUERY, { id }),
    client.fetch(WORKFLOW_QUERY),
  ]);
  if (!round) notFound();

  return (
    <RoundRoom
      initialRound={round}
      initialMessages={messages}
      workflow={workflow as WorkflowDefinition | null}
      me={{ _id: member._id, name: member.name ?? "" }}
    />
  );
}
