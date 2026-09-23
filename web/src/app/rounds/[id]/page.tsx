import { notFound } from "next/navigation";
import { client } from "@/sanity/client";
import { MESSAGES_QUERY, ROUND_QUERY } from "@/sanity/queries";
import { hasRoundAccess } from "@/lib/round-access";
import { JoinRound } from "@/components/JoinRound";
import { RoundRoom } from "@/components/RoundRoom";

export default async function RoundPage({ params }: PageProps<"/rounds/[id]">) {
  const { id } = await params;
  const fresh = client.withConfig({ useCdn: false });
  const round = await fresh.fetch(ROUND_QUERY, { id }, { cache: "no-store" });

  if (!round) notFound();
  if (!(await hasRoundAccess(id))) return <JoinRound roundId={id} title={round.title} />;

  const messages = await fresh.fetch(MESSAGES_QUERY, { id }, { cache: "no-store" });
  return <RoundRoom initialRound={round} initialMessages={messages} />;
}
