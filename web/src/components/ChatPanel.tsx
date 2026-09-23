"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { addSpeechTab, sendMessage } from "@/app/rounds/[id]/actions";
import type { Message, Round } from "./RoundRoom";
import { formatElapsed, type Stopwatch } from "./useStopwatch";

interface Props {
  round: Round;
  messages: Message[];
  activeTab: string | null;
  onTabChange: (key: string | null) => void;
  author: string;
  onAuthorChange: (name: string) => void;
  stopwatch: Stopwatch;
  floating: boolean;
}

export function ChatPanel({
  round,
  messages,
  activeTab,
  onTabChange,
  author,
  onAuthorChange,
  stopwatch,
  floating,
}: Props) {
  const [draft, setDraft] = useState("");
  const [newTab, setNewTab] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);

  const tabKey = (key: string | null | undefined) => key ?? "general";
  const tabs = [{ _key: null, name: "General" }, ...(round.speeches ?? [])];
  const visible = messages.filter((m) => tabKey(m.speechKey) === tabKey(activeTab));

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [visible.length, activeTab]);

  const newestIn = (key: string | null) =>
    messages.findLast((m) => tabKey(m.speechKey) === tabKey(key))?.sentAt ?? "";

  // Leaving a tab marks everything in it as read; the open tab is always read.
  function switchTab(key: string | null) {
    setLastSeen((seen) => ({
      ...seen,
      [tabKey(activeTab)]: newestIn(activeTab),
      [tabKey(key)]: newestIn(key),
    }));
    onTabChange(key);
  }

  const hasUnread = (key: string | null) =>
    messages.some(
      (m) =>
        tabKey(m.speechKey) === tabKey(key) &&
        m.author !== author &&
        (m.sentAt ?? "") > (lastSeen[tabKey(key)] ?? ""),
    );

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, onOk: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onOk();
      else setError(result.error);
    });
  }

  function submitMessage(e?: FormEvent) {
    e?.preventDefault();
    if (!draft.trim() || pending) return;
    const body = draft;
    run(() => sendMessage(round._id, activeTab, author, body), () => setDraft(""));
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) submitMessage();
  }

  function submitTab(e: FormEvent) {
    e.preventDefault();
    if (!newTab?.trim()) return setNewTab(null);
    const name = newTab;
    run(() => addSpeechTab(round._id, name), () => setNewTab(null));
  }

  if (!author) return <NamePrompt onSave={onAuthorChange} />;

  return (
    <div className="flex h-full flex-col bg-white text-sm text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex items-center gap-2 border-b border-black/10 px-3 py-2 dark:border-white/15">
        <h1 className="min-w-0 flex-1 truncate font-semibold" title={round.title ?? ""}>
          {round.title}
        </h1>
        <span className="font-mono text-base tabular-nums">{formatElapsed(stopwatch.elapsedMs)}</span>
        <button
          onClick={stopwatch.toggle}
          className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {stopwatch.running ? "Pause" : "Start"}
        </button>
        <button onClick={stopwatch.reset} className="rounded border border-black/15 px-2 py-0.5 text-xs dark:border-white/20">
          Reset
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-black/10 px-2 py-1.5 dark:border-white/15">
        {tabs.map((tab) => {
          const active = tabKey(tab._key) === tabKey(activeTab);
          return (
            <button
              key={tabKey(tab._key)}
              onClick={() => switchTab(tab._key)}
              className={`relative shrink-0 rounded-full px-3 py-1 ${
                active ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-black/[.05] dark:bg-white/[.08]"
              }`}
            >
              {tab.name}
              {!active && hasUnread(tab._key) && (
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-red-500" aria-label="unread" />
              )}
            </button>
          );
        })}
        {round.chatOpen &&
          (newTab === null ? (
            <button onClick={() => setNewTab("")} className="shrink-0 rounded-full px-3 py-1 text-zinc-500" title="Add a speech tab">
              + Tab
            </button>
          ) : (
            <form onSubmit={submitTab} className="shrink-0">
              <input
                autoFocus
                value={newTab}
                onChange={(e) => setNewTab(e.target.value)}
                onBlur={submitTab}
                placeholder="e.g. 1AR"
                maxLength={40}
                className="w-24 rounded-full border border-black/15 bg-transparent px-3 py-1 dark:border-white/20"
              />
            </form>
          ))}
      </nav>

      <ol ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {visible.length === 0 && <li className="text-zinc-500">No messages in this tab yet.</li>}
        {visible.map((m) => {
          const mine = m.author === author;
          return (
            <li key={m._id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <span className="text-xs text-zinc-500">
                {mine ? "You" : m.author}
                {m.sentAt && ` · ${new Date(m.sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
              </span>
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-1.5 ${
                  mine ? "bg-blue-600 text-white" : "bg-black/[.06] dark:bg-white/[.1]"
                }`}
              >
                {m.body}
              </p>
            </li>
          );
        })}
      </ol>

      {error && <p className="px-3 pb-1 text-xs text-red-600">{error}</p>}

      {round.chatOpen ? (
        <form onSubmit={submitMessage} className="flex gap-2 border-t border-black/10 p-2 dark:border-white/15">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={2000}
            placeholder={`Message ${tabs.find((t) => tabKey(t._key) === tabKey(activeTab))?.name ?? ""}…`}
            className="min-w-0 flex-1 resize-none rounded-lg border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="rounded-lg bg-blue-600 px-3 font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
      ) : (
        <p className="border-t border-black/10 p-3 text-zinc-500 dark:border-white/15">
          Chat is closed while this round is {round.stateTitle ?? round.workflowState}.
        </p>
      )}

      <footer className="flex justify-between px-3 pb-2 text-xs text-zinc-500">
        <span>
          Chatting as <strong>{author}</strong>{" "}
          <button onClick={() => onAuthorChange("")} className="underline">
            change
          </button>
        </span>
        {!floating && <span>Enter sends · Shift+Enter for a new line</span>}
      </footer>
    </div>
  );
}

function NamePrompt({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave(name.trim());
      }}
      className="flex h-full flex-col justify-center gap-3 bg-white p-6 text-sm dark:bg-zinc-950 dark:text-zinc-100"
    >
      <label htmlFor="chat-name" className="font-medium">
        What should your partner see as your name?
      </label>
      <input
        id="chat-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        className="rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
      />
      <button type="submit" className="rounded-lg bg-blue-600 py-2 font-medium text-white">
        Join chat
      </button>
    </form>
  );
}
