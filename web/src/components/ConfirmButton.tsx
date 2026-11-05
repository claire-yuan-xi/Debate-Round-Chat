"use client";

import { useState } from "react";

/** A button that asks once, right where it is. window.confirm doesn't work in a floating window. */
export function ConfirmButton({
  label,
  question,
  onConfirm,
  className,
}: {
  label: string;
  question: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={`shrink-0 ${className ?? ""}`}>
        {label}
      </button>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs">
      <span>{question}</span>
      <button
        type="button"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
        className="rounded bg-red-600 px-2 py-0.5 font-medium text-white"
      >
        Yes
      </button>
      <button type="button" onClick={() => setAsking(false)} className="rounded border border-black/15 px-2 py-0.5 dark:border-white/20">
        No
      </button>
    </span>
  );
}
