"use client";

import { useState, useTransition, type FormEvent } from "react";
import { requestSignInLink } from "@/app/actions/auth";
import { field, muted, primaryButton } from "./ui";

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestSignInLink(email, next);
      if (result.ok) setSentTo(email.trim());
      else setError(result.error);
    });
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-3">
        <p>
          Check <strong>{sentTo}</strong> for a sign-in link. It works once and expires in 15 minutes.
        </p>
        <p className={`text-sm ${muted}`}>
          Not there? Check spam, or{" "}
          <button onClick={() => setSentTo(null)} className="underline">
            use a different email
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="font-medium">Email</span>
        <input
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
      </label>
      {error && <p className="text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
