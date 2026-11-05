import "server-only";
import { client } from "@/sanity/client";

/** Delete a chat and everything said in it, all at once. */
export async function deleteChat(chatId: string) {
  await client.mutate([
    { delete: { query: `*[_type == "message" && round._ref == $id]`, params: { id: chatId } } },
    { delete: { id: chatId } },
  ]);
}
