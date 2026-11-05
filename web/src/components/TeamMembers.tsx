"use client";

import { useTransition } from "react";
import { openDirectMessage } from "@/app/actions/chats";
import { leaveTeam, removeTeammate } from "@/app/actions/teams";
import { muted } from "./ui";

interface Props {
  teamId: string;
  teamName: string;
  meId: string;
  members: { _id: string; name: string | null }[];
}

/** The group's member list, with Message and Remove next to each person and Leave group for yourself. */
export function TeamMembers({ teamId, teamName, meId, members }: Props) {
  const [pending, startTransition] = useTransition();

  const confirmThen = (question: string, action: () => Promise<void>) => {
    if (window.confirm(question)) startTransition(action);
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {members.map((m) => (
          <li key={m._id} className="flex items-center gap-1.5">
            <span>{m._id === meId ? `${m.name ?? "You"} (you)` : (m.name ?? "New member")}</span>
            {m._id !== meId && (
              <button
                disabled={pending}
                onClick={() => startTransition(() => openDirectMessage(m._id))}
                className={`text-xs underline ${muted}`}
              >
                message
              </button>
            )}
            {m._id !== meId && (
              <button
                disabled={pending}
                onClick={() =>
                  confirmThen(
                    `Remove ${m.name ?? "this person"} from ${teamName}? They'll lose access to the group's chats.`,
                    () => removeTeammate(teamId, m._id),
                  )
                }
                className={`text-xs underline ${muted}`}
              >
                remove
              </button>
            )}
          </li>
        ))}
      </ul>
      <button
        disabled={pending}
        onClick={() =>
          confirmThen(`Leave ${teamName}? You'll lose access to its chats.`, () => leaveTeam(teamId))
        }
        className={`self-start text-xs underline ${muted}`}
      >
        Leave group
      </button>
    </div>
  );
}
