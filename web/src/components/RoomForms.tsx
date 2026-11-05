"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { createRoom, joinRoom } from "@/app/actions/chats";
import { field, primaryButton, secondaryButton } from "./ui";

export function NewRoomForm({ askName }: { askName: boolean }) {
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createRoom({ title, name });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 text-sm">
      <label className="flex flex-col gap-1">
        <span className="font-medium">Chat name (optional)</span>
        <input maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
      </label>
      {askName && (
        <label className="flex flex-col gap-1">
          <span className="font-medium">Your name</span>
          <input
            required
            maxLength={40}
            autoComplete="nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </label>
      )}
      {error && <p className="text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Starting…" : "Start chat"}
      </button>
    </form>
  );
}

export function JoinRoomForm({ code, askName }: { code: string; askName: boolean }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await joinRoom(code, name);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 text-sm">
      {askName && (
        <label className="flex flex-col gap-1">
          <span className="font-medium">Your name</span>
          <input
            required
            autoFocus
            maxLength={40}
            autoComplete="nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </label>
      )}
      {error && <p className="text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Joining…" : "Join chat"}
      </button>
    </form>
  );
}

/** One click to a temporary chat, for someone who's already signed in. */
export function LinkChatButton({ hasName }: { hasName: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hasName) {
    return (
      <Link href="/r/new" className={`${secondaryButton} self-start`}>
        Get a link
      </Link>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        className={`${secondaryButton} self-start`}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createRoom({ title: "", name: "" });
            if (!result.ok) setError(result.error);
          });
        }}
      >
        {pending ? "Starting…" : "Get a link"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
