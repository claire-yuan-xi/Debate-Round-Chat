"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { MESSAGES_QUERY_RESULT, ROUND_QUERY_RESULT } from "../../sanity.types";
import { browserClient } from "@/sanity/browser-client";
import { MESSAGES_QUERY, ROUND_QUERY } from "@/sanity/queries";
import { ChatPanel } from "./ChatPanel";
import { saveChatName, useChatName } from "./chat-name";
import { useStopwatch } from "./useStopwatch";

export type Round = NonNullable<ROUND_QUERY_RESULT>;
export type Message = MESSAGES_QUERY_RESULT[number];

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
}: {
  initialRound: Round;
  initialMessages: Message[];
}) {
  const roundId = initialRound._id;
  const [round, setRound] = useState<Round | null>(initialRound);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [pipError, setPipError] = useState<string | null>(null);
  const stopwatch = useStopwatch();
  const author = useChatName();
  const pipSupported = useSyncExternalStore(
    noSubscription,
    () => "documentPictureInPicture" in window,
    () => false,
  );

  // Live updates: refetch whenever the round or one of its messages changes.
  useEffect(() => {
    const params = { id: roundId };
    const refetch = () =>
      Promise.all([
        browserClient.fetch(ROUND_QUERY, params),
        browserClient.fetch(MESSAGES_QUERY, params),
      ]).then(([nextRound, nextMessages]) => {
        setRound(nextRound);
        setMessages(nextMessages);
      });

    const subscription = browserClient
      .listen(
        `*[(_type == "message" && round._ref == $id) || _id == $id || _id == "workflow-round"]`,
        params,
        { includeResult: false, visibility: "query", events: ["welcome", "mutation", "reconnect"] },
      )
      .subscribe({
        next: (event) => {
          if (event.type === "mutation" || event.type === "reconnect") refetch();
        },
        error: (err) => console.error("Live updates stopped", err),
      });
    return () => subscription.unsubscribe();
  }, [roundId]);

  // If the selected speech tab gets removed, fall back to General.
  const activeTab = round?.speeches?.some((s) => s._key === selectedTab) ? selectedTab : null;

  async function popOut() {
    const pip = window.documentPictureInPicture;
    if (!pip) return;
    setPipError(null);
    let win: Window;
    try {
      win = await pip.requestWindow({ width: 380, height: 560 });
    } catch {
      setPipError("This browser wouldn't open a floating window. Try desktop Chrome.");
      return;
    }
    copyStyles(win);
    win.addEventListener("pagehide", () => setPipWindow(null));
    setPipWindow(win);
  }

  if (!round) {
    return <p className="p-8 text-zinc-600">This round was deleted.</p>;
  }

  const panel = (
    <ChatPanel
      round={round}
      messages={messages}
      activeTab={activeTab}
      onTabChange={setSelectedTab}
      author={author}
      onAuthorChange={saveChatName}
      stopwatch={stopwatch}
      floating={pipWindow !== null}
    />
  );

  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← Rounds
        </Link>
        {pipWindow ? (
          <button
            onClick={() => pipWindow.close()}
            className="rounded-full border border-black/15 px-3 py-1 text-sm dark:border-white/20"
          >
            Bring chat back
          </button>
        ) : pipSupported ? (
          <button
            onClick={popOut}
            className="rounded-full bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Pop out chat
          </button>
        ) : (
          <span className="text-xs text-zinc-500">Pop-out needs desktop Chrome or Edge</span>
        )}
      </div>
      {pipError && <p className="mb-2 text-sm text-red-600">{pipError}</p>}
      {pipWindow ? (
        <>
          <p className="text-zinc-600 dark:text-zinc-400">
            The chat is floating in its own window. Keep this tab open.
          </p>
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
