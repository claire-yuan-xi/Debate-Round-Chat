import { client } from "@/sanity/client";
import { getChatAccess } from "@/lib/dal";

// A stream of "something changed" pings for one round. The browser refetches through
// a server action, so the private dataset is never exposed. EventSource reconnects on
// its own when the platform closes a long-running stream.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request, ctx: RouteContext<"/api/rounds/[id]/events">) {
  const { id } = await ctx.params;
  if (!(await getChatAccess(id))) return new Response("Not in this chat", { status: 403 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // The browser already went away.
        }
      };
      write("event: ready\ndata: {}\n\n");

      const subscription = client
        .listen(
          `*[(_type == "message" && round._ref == $id) || _id == $id || _id == "workflow-round"]`,
          { id },
          { includeResult: false, visibility: "query", events: ["mutation", "reconnect"] },
        )
        .subscribe({
          next: () => write("event: change\ndata: {}\n\n"),
          error: () => controller.close(),
        });
      const keepAlive = setInterval(() => write(": ping\n\n"), 25_000);

      request.signal.addEventListener("abort", () => {
        subscription.unsubscribe();
        clearInterval(keepAlive);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
