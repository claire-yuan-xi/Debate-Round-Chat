"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signInWithToken } from "@/app/actions/auth";
import { primaryButton } from "./ui";

export function VerifyForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-red-600">{error}</p>
        <Link href="/login" className="underline">
          Get a new link
        </Link>
      </div>
    );
  }

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await signInWithToken(token);
          if (!result.ok) setError(result.error);
        })
      }
      className={primaryButton}
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}
