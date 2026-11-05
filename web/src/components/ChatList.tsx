"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { endChat } from "@/app/actions/chats";
import { ConfirmButton } from "./ConfirmButton";
import { card, muted } from "./ui";

export interface ChatRow {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  /** What ending it does. Direct messages can't be ended, so they have none. */
  endQuestion?: string;
}

export function ChatList({ chats }: { chats: ChatRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function end(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await endChat(id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="grid gap-2">
        {chats.map((chat) => (
          <li key={chat.id} className={`${card} flex items-center gap-3 !p-0`}>
            <Link
              href={chat.href}
              className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-xl p-4 hover:bg-black/[.03] dark:hover:bg-white/[.05]"
            >
              <span className="truncate font-medium">{chat.title}</span>
              <span className={`truncate text-sm ${muted}`}>{chat.subtitle}</span>
            </Link>
            {chat.endQuestion && (
              <span className="pr-4">
                <ConfirmButton
                  label="End"
                  question={chat.endQuestion}
                  onConfirm={() => end(chat.id)}
                  className={`text-sm underline ${muted}`}
                />
              </span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
