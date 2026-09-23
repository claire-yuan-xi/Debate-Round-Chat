"use client";

import { useEffect, useState } from "react";

export interface Stopwatch {
  elapsedMs: number;
  running: boolean;
  toggle: () => void;
  reset: () => void;
}

export function useStopwatch(): Stopwatch {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [banked, setBanked] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt]);

  const running = startedAt !== null;
  return {
    elapsedMs: banked + (running ? now - startedAt : 0),
    running,
    toggle: () => {
      if (running) {
        setBanked((b) => b + Date.now() - startedAt);
        setStartedAt(null);
      } else {
        setNow(Date.now());
        setStartedAt(Date.now());
      }
    },
    reset: () => {
      setBanked(0);
      setStartedAt(running ? Date.now() : null);
      setNow(Date.now());
    },
  };
}

export function formatElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
