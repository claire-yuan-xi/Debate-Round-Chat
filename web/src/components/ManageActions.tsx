"use client";

import { useTransition } from "react";
import { deleteGroup, deletePerson, removeTestData } from "@/app/actions/manage";
import { ConfirmButton } from "./ConfirmButton";

const del = "text-sm text-red-600 underline";

function Delete({ question, run }: { question: string; run: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  if (pending) return <span className="text-sm">Deleting…</span>;
  return <ConfirmButton label="Delete" question={question} onConfirm={() => startTransition(run)} className={del} />;
}

export const DeleteGroupButton = ({ id }: { id: string }) => (
  <Delete question="Delete the group and its chats?" run={() => deleteGroup(id)} />
);

export const DeletePersonButton = ({ id }: { id: string }) => (
  <Delete question="Delete this account?" run={() => deletePerson(id)} />
);

export function RemoveTestDataButton() {
  const [pending, startTransition] = useTransition();
  if (pending) return <span className="text-sm">Removing…</span>;
  return (
    <ConfirmButton
      label="Remove test data"
      question="Delete all of this?"
      onConfirm={() => startTransition(removeTestData)}
      className="self-start rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
    />
  );
}
