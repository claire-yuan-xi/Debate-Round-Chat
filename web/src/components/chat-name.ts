"use client";

import { useSyncExternalStore } from "react";

const NAME_KEY = "round-chat-name";
const NAME_EVENT = "round-chat-name-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(NAME_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(NAME_EVENT, onChange);
  };
}

function read() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/** The name this browser chats as, remembered across rounds. */
export function useChatName() {
  return useSyncExternalStore(subscribe, read, () => "");
}

export function saveChatName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {}
  window.dispatchEvent(new Event(NAME_EVENT));
}
