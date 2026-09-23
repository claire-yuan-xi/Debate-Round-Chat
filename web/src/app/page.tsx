import Link from "next/link";
import { client } from "@/sanity/client";
import { OPEN_ROUNDS_QUERY } from "@/sanity/queries";

export default async function Home() {
  const rounds = await client
    .withConfig({ useCdn: false })
    .fetch(OPEN_ROUNDS_QUERY, {}, { cache: "no-store" });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Round chat</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Pick your round, then pop the chat out so it floats over your other tabs.
      </p>
      {rounds.length === 0 ? (
        <p className="mt-8 text-zinc-600 dark:text-zinc-400">
          No rounds are open for chat. A round has to be approved in the Studio or Round Control first.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3">
          {rounds.map((round) => (
            <li key={round._id}>
              <Link
                href={`/rounds/${round._id}`}
                className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 hover:bg-black/[.03] dark:border-white/15 dark:hover:bg-white/[.05]"
              >
                <span className="font-medium">{round.title}</span>
                <span className="text-sm text-zinc-500">{round.stateTitle}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
