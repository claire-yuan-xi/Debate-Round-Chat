"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createRound } from "@/app/actions/rounds";
import { field, muted, primaryButton } from "./ui";

interface Team {
  _id: string;
  name: string | null;
  members: ({ _id: string; name: string | null } | null)[] | null;
}

// Speaking order in Public Forum, as a shortcut. Any tabs work the same way.
const PF_SPEECHES = [
  "1st Constructive",
  "2nd Constructive",
  "1st Crossfire",
  "1st Rebuttal",
  "2nd Rebuttal",
  "2nd Crossfire",
  "1st Summary",
  "2nd Summary",
  "Grand Crossfire",
  "1st Final Focus",
  "2nd Final Focus",
];

export function NewRoundForm({ teams, meId }: { teams: Team[]; meId: string }) {
  const [teamId, setTeamId] = useState(teams[0]?._id ?? "");
  const [title, setTitle] = useState("");
  const [teammateIds, setTeammateIds] = useState<string[]>([]);
  const [speeches, setSpeeches] = useState("");
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
        speeches: speeches.split("\n"),
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
          placeholder="e.g. Round 3 – Pro vs. Lincoln"
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

      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between font-medium">
          Tabs, one per line (optional)
          <button type="button" onClick={() => setSpeeches(PF_SPEECHES.join("\n"))} className="text-xs underline">
            Use Public Forum speeches
          </button>
        </span>
        <textarea
          rows={6}
          value={speeches}
          onChange={(e) => setSpeeches(e.target.value)}
          placeholder={"There's always a General tab. You can add more during the round."}
          className={`${field} resize-y`}
        />
      </label>

      {error && <p className="text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Starting…" : "Start round"}
      </button>
    </form>
  );
}
