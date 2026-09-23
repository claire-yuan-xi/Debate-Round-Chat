"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { joinRound } from "@/app/rounds/[id]/actions";
import { saveChatName, useChatName } from "./chat-name";

export function JoinRound({ roundId, title }: { roundId: string; title: string | null }) {
  const router = useRouter();
  const savedName = useChatName();
  const [name, setName] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nameValue = name ?? savedName;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!nameValue.trim()) return setError("Add your name.");
    setError(null);
    startTransition(async () => {
      const result = await joinRound(roundId, code);
      if (!result.ok) return setError(result.error);
      saveChatName(nameValue.trim());
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← Rounds
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Ask whoever set up the round for the join code. It&apos;s shown at the top of the round in the
          Studio.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Your name</span>
          <input
            value={nameValue}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="nickname"
            className="rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Join code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={12}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABC234"
            className="rounded-lg border border-black/15 bg-transparent px-3 py-2 font-mono text-lg tracking-[0.2em] uppercase dark:border-white/20"
          />
        </label>
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="rounded-lg bg-blue-600 py-2 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Checking…" : "Join chat"}
        </button>
      </form>
    </main>
  );
}
