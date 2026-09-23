import { notFound } from "next/navigation";
import { client } from "@/sanity/client";
import { MESSAGES_QUERY, ROUND_QUERY } from "@/sanity/queries";
import { RoundRoom } from "@/components/RoundRoom";

export default async function RoundPage({ params }: PageProps<"/rounds/[id]">) {
  const { id } = await params;
  const fresh = client.withConfig({ useCdn: false });
  const [round, messages] = await Promise.all([
    fresh.fetch(ROUND_QUERY, { id }, { cache: "no-store" }),
    fresh.fetch(MESSAGES_QUERY, { id }, { cache: "no-store" }),
  ]);

  if (!round) notFound();

  return <RoundRoom initialRound={round} initialMessages={messages} />;
}
