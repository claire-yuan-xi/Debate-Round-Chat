"use client";

import { useState, useTransition, type FormEvent } from "react";
import { openDirectMessage } from "@/app/actions/chats";
import { createRound } from "@/app/actions/rounds";
import { field, muted, primaryButton } from "./ui";

interface Group {
  _id: string;
  name: string | null;
  members: ({ _id: string; name: string | null } | null)[] | null;
}

/** Pick people and go: one person makes a direct message, more than one makes a group chat. */
export function NewChatForm({ groups, meId }: { groups: Group[]; meId: string }) {
  const [groupId, setGroupId] = useState(groups[0]?._id ?? "");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const group = groups.find((g) => g._id === groupId);
  const people = (group?.members ?? []).filter((m): m is { _id: string; name: string | null } =>
    Boolean(m && m._id !== meId),
  );

  function toggle(id: string) {
    setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      if (selected.length === 1) return openDirectMessage(selected[0]);
      const result = await createRound({ teamId: groupId, title, teammateIds: selected, speeches: [] });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 text-sm">
      {groups.length > 1 && (
        <label className="flex flex-col gap-1">
          <span className="font-medium">Group</span>
          <select
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              setSelected([]);
            }}
            className={field}
          >
            {groups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Who do you want to chat with?</legend>
        {people.length === 0 ? (
          <p className={muted}>Nobody else is in this group yet. Send them the invite link from the home page.</p>
        ) : (
          people.map((m) => (
            <label key={m._id} className="flex items-center gap-2">
              <input type="checkbox" checked={selected.includes(m._id)} onChange={() => toggle(m._id)} />
              {m.name ?? "New member"}
            </label>
          ))
        )}
        <p className={`text-xs ${muted}`}>Only the people in a chat can see it.</p>
      </fieldset>

      {selected.length > 1 && (
        <label className="flex flex-col gap-1">
          <span className="font-medium">Chat name (optional)</span>
          <input maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        </label>
      )}

      {error && <p className="text-red-600">{error}</p>}
      <button type="submit" disabled={pending || selected.length === 0} className={primaryButton}>
        {pending ? "Starting…" : "Start chat"}
      </button>
    </form>
  );
}
