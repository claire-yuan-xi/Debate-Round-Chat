"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createRound } from "@/app/actions/rounds";
import { field, muted, primaryButton } from "./ui";

interface Team {
  _id: string;
  name: string | null;
  members: ({ _id: string; name: string | null } | null)[] | null;
}

export function NewRoundForm({ teams, meId }: { teams: Team[]; meId: string }) {
  const [teamId, setTeamId] = useState(teams[0]?._id ?? "");
  const [title, setTitle] = useState("");
  const [teammateIds, setTeammateIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const team = teams.find((t) => t._id === teamId);
  const teammates = (team?.members ?? []).filter((m): m is { _id: string; name: string | null } =>
    Boolean(m && m._id !== meId),
  );

  function toggle(id: string) {
    setTeammateIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createRound({
        teamId,
        title,
        teammateIds,
        speeches: [],
      });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 text-sm">
      <label className="flex flex-col gap-1">
        <span className="font-medium">Round name</span>
        <input
          required
          autoFocus
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={field}
        />
      </label>

      {teams.length > 1 && (
        <label className="flex flex-col gap-1">
          <span className="font-medium">Team</span>
          <select
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setTeammateIds([]);
            }}
            className={field}
          >
            {teams.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Who&apos;s in this round with you?</legend>
        {teammates.length === 0 ? (
          <p className={muted}>
            Nobody else is on this team yet. Share the invite link from the home page. You can add people to the round
            later too.
          </p>
        ) : (
          teammates.map((m) => (
            <label key={m._id} className="flex items-center gap-2">
              <input type="checkbox" checked={teammateIds.includes(m._id)} onChange={() => toggle(m._id)} />
              {m.name ?? "New member"}
            </label>
          ))
        )}
        <p className={`text-xs ${muted}`}>Only the people in a round can see it.</p>
      </fieldset>

      {error && <p className="text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Starting…" : "Start round"}
      </button>
    </form>
  );
}
