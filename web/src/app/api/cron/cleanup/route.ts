import { client } from "@/sanity/client";
import { EXPIRED_ROOMS_QUERY } from "@/sanity/queries";
import { deleteChat } from "@/lib/rooms";

// Runs daily (see vercel.json). Expired chats already can't be opened, and this only ever
// deletes those, so it's harmless for anyone else to call it and needs no secret.
export const dynamic = "force-dynamic";

export async function GET() {
  const ids = await client.fetch(EXPIRED_ROOMS_QUERY);
  for (const id of ids) await deleteChat(id);
  return Response.json({ deleted: ids.length });
}
