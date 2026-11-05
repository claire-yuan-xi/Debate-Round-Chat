"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import type { MESSAGES_QUERY_RESULT, ROUND_QUERY_RESULT } from "../../sanity.types";
import { endChat } from "@/app/actions/chats";
import { addParticipant, getRoundState, moveRound } from "@/app/actions/rounds";
import { availableTransitions, type WorkflowDefinition } from "@shared/workflow";
import { ChatPanel } from "./ChatPanel";
import { CopyButton } from "./CopyButton";
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
  backHref = "/",
  shareLink,
}: {
  initialRound: Round;
  initialMessages: Message[];
  workflow: WorkflowDefinition | null;
  me: Me;
  /** Guests have no home page to go back to. */
  backHref?: string | null;
  shareLink?: string;
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

  // A chat that's gone takes its floating window with it.
  useEffect(() => {
    if (!round) pipWindow?.close();
  }, [round, pipWindow]);

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
        <p>
          {initialRound.kind === "room"
            ? "This chat has ended."
            : "This chat is gone, or you're no longer in it."}
        </p>
        {backHref && (
          <Link href={backHref} className="underline">
            Back home
          </Link>
        )}
      </main>
    );
  }

  const participants = (round.participants ?? []).filter((p) => p !== null);
  const addable = (round.team?.members ?? []).filter(
    (m): m is { _id: string; name: string | null } => Boolean(m && !participants.some((p) => p._id === m._id)),
  );
  const reopen = round.kind
    ? undefined
    : availableTransitions(workflow, round.workflowState, "person").find(
        (t) => workflow?.states.find((s) => s.id === t.to)?.chatOpen,
      );
  const title =
    round.kind === "direct"
      ? (participants.find((p) => p._id !== me._id)?.name ?? "Direct message")
      : (round.title ?? "");
  const canEnd = round.kind === "room" ? round.createdBy === me._id : !round.kind && round.chatOpen;

  function end() {
    run(async () => {
      const result = await endChat(roundId);
      if (result.ok && round?.kind === "room") setRound(null);
      return result;
    });
  }

  const panel = (
    <ChatPanel
      round={round}
      title={title}
      messages={messages}
      activeTab={activeTab}
      onTabChange={setSelectedTab}
      me={me}
      stopwatch={stopwatch}
      floating={pipWindow !== null}
      onEnd={canEnd ? end : undefined}
      onReopen={reopen && (() => run(() => moveRound(roundId, reopen.id)))}
    />
  );

  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col gap-3 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {backHref ? (
          <Link href={backHref} className={`text-sm hover:underline ${muted}`}>
            ← Home
          </Link>
        ) : (
          <span className="text-sm font-semibold">Sidenotes</span>
        )}
        <div className="flex items-center gap-2">
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

      {round.kind === "room" && (
        <div className={`flex flex-col gap-2 text-sm ${muted}`}>
          <span>
            In this chat: {(round.guests ?? []).map((g) => (g.guestId === me._id ? "you" : g.name)).join(", ")}
          </span>
          {shareLink && (
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-black/[.05] px-2 py-1 dark:bg-white/[.08]">
                {shareLink}
              </code>
              <CopyButton text={shareLink} />
            </div>
          )}
          <span suppressHydrationWarning>
            Anyone with the link can join and read this chat. It&apos;s deleted{" "}
            {round.expiresAt &&
              new Date(round.expiresAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}
            .
          </span>
        </div>
      )}

      {!round.kind && (
      <div className={`flex flex-wrap items-center gap-2 text-sm ${muted}`}>
        <span>
          In this chat: {participants.map((p) => (p._id === me._id ? "you" : (p.name ?? "New member"))).join(", ")}
        </span>
        {addable.length > 0 && (
          <select
            value=""
            disabled={pending}
            onChange={(e) => e.target.value && run(() => addParticipant(roundId, e.target.value))}
            className="rounded-md border border-black/15 bg-transparent px-2 py-0.5 dark:border-white/20"
            aria-label="Add someone to this chat"
          >
            <option value="">+ Add someone</option>
            {addable.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name ?? "New member"}
              </option>
            ))}
          </select>
        )}
      </div>
      )}

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
