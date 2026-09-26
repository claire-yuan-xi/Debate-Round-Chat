"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import type { MESSAGES_QUERY_RESULT, ROUND_QUERY_RESULT } from "../../sanity.types";
import { addParticipant, getRoundState, moveRound } from "@/app/actions/rounds";
import { availableTransitions, stateTitle, type WorkflowDefinition } from "@shared/workflow";
import { ChatPanel } from "./ChatPanel";
import { useStopwatch } from "./useStopwatch";
import { muted, secondaryButton } from "./ui";

export type Round = NonNullable<ROUND_QUERY_RESULT>;
export type Message = MESSAGES_QUERY_RESULT[number];
export interface Me {
  _id: string;
  name: string;
}

const noSubscription = () => () => {};

/** Copy the page's styles into the floating window so the chat looks the same there. */
function copyStyles(target: Window) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = target.document.createElement("style");
      style.textContent = Array.from(sheet.cssRules, (rule) => rule.cssText).join("\n");
      target.document.head.appendChild(style);
    } catch {
      if (sheet.href) {
        const link = target.document.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        target.document.head.appendChild(link);
      }
    }
  }
  target.document.documentElement.className = document.documentElement.className;
  target.document.body.className = "h-full";
}

export function RoundRoom({
  initialRound,
  initialMessages,
  workflow,
  me,
}: {
  initialRound: Round;
  initialMessages: Message[];
  workflow: WorkflowDefinition | null;
  me: Me;
}) {
  const roundId = initialRound._id;
  const [round, setRound] = useState<Round | null>(initialRound);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const stopwatch = useStopwatch();
  const pipSupported = useSyncExternalStore(
    noSubscription,
    () => "documentPictureInPicture" in window,
    () => false,
  );

  // Live updates: the server pings on every change, and we refetch through a server action.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const state = await getRoundState(roundId);
        if (cancelled) return;
        setRound(state?.round ?? null);
        if (state) setMessages(state.messages);
      }, 100);
    };
    const source = new EventSource(`/api/rounds/${roundId}/events`);
    // "ready" arrives on every (re)connect, so anything missed while offline is caught up.
    source.addEventListener("ready", refresh);
    source.addEventListener("change", refresh);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      source.close();
    };
  }, [roundId]);

  // If the selected tab gets removed, fall back to General.
  const activeTab = round?.speeches?.some((s) => s._key === selectedTab) ? selectedTab : null;

  async function popOut() {
    const pip = window.documentPictureInPicture;
    if (!pip) return;
    setError(null);
    let win: Window;
    try {
      win = await pip.requestWindow({ width: 380, height: 560 });
    } catch {
      setError("This browser wouldn't open a floating window. Try desktop Chrome.");
      return;
    }
    copyStyles(win);
    win.addEventListener("pagehide", () => setPipWindow(null));
    setPipWindow(win);
  }

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  if (!round) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-3 px-4 py-16">
        <p>This round is gone, or you&apos;re no longer in it.</p>
        <Link href="/" className="underline">
          Back to your rounds
        </Link>
      </main>
    );
  }

  const participants = (round.participants ?? []).filter((p) => p !== null);
  const addable = (round.team?.members ?? []).filter(
    (m): m is { _id: string; name: string | null } => Boolean(m && !participants.some((p) => p._id === m._id)),
  );
  const moves = availableTransitions(workflow, round.workflowState, "person");

  const panel = (
    <ChatPanel
      round={round}
      messages={messages}
      activeTab={activeTab}
      onTabChange={setSelectedTab}
      me={me}
      stopwatch={stopwatch}
      floating={pipWindow !== null}
    />
  );

  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col gap-3 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className={`text-sm hover:underline ${muted}`}>
          ← Rounds
        </Link>
        <div className="flex items-center gap-2">
          {moves.map((move) => (
            <button
              key={move._key}
              disabled={pending}
              onClick={() => run(() => moveRound(roundId, move.id))}
              className={secondaryButton}
              title={`Moves the round to ${stateTitle(workflow, move.to)}`}
            >
              {move.title}
            </button>
          ))}
          {pipWindow ? (
            <button onClick={() => pipWindow.close()} className={secondaryButton}>
              Bring chat back
            </button>
          ) : pipSupported ? (
            <button
              onClick={popOut}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Pop out chat
            </button>
          ) : (
            <span className="text-xs text-zinc-500">Pop-out needs desktop Chrome or Edge</span>
          )}
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-2 text-sm ${muted}`}>
        <span>
          In this round: {participants.map((p) => (p._id === me._id ? "you" : (p.name ?? "New member"))).join(", ")}
        </span>
        {addable.length > 0 && (
          <select
            value=""
            disabled={pending}
            onChange={(e) => e.target.value && run(() => addParticipant(roundId, e.target.value))}
            className="rounded-md border border-black/15 bg-transparent px-2 py-0.5 dark:border-white/20"
            aria-label="Add a teammate to this round"
          >
            <option value="">+ Add teammate</option>
            {addable.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name ?? "New member"}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {pipWindow ? (
        <>
          <p className={muted}>The chat is floating in its own window. Keep this tab open.</p>
          {createPortal(panel, pipWindow.document.body)}
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-black/10 dark:border-white/15">
          {panel}
        </div>
      )}
    </main>
  );
}
