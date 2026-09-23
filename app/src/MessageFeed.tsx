import { Suspense } from "react";
import {
  useDocumentProjection,
  useDocuments,
  type DocumentHandle,
} from "@sanity/sdk-react";

interface Props {
  roundId: string;
  speeches: { _key: string; name?: string }[];
}

export function MessageFeed({ roundId, speeches }: Props) {
  const { data, hasMore, loadMore, isPending } = useDocuments({
    documentType: "message",
    filter: "round._ref == $roundId && defined(body) && defined(sentAt)",
    params: { roundId },
    batchSize: 100,
    orderings: [{ field: "sentAt", direction: "desc" }],
  });

  if (data.length === 0)
    return <p className="muted">No messages in this round yet.</p>;

  const speechNames = new Map(
    speeches.map((s) => [s._key, s.name ?? "Untitled speech"]),
  );

  return (
    <>
      <ul className="messages">
        {data.map((handle) => (
          <Suspense
            key={handle.documentId}
            fallback={<li className="message">…</li>}
          >
            <MessageItem handle={handle} speechNames={speechNames} />
          </Suspense>
        ))}
      </ul>
      {hasMore && (
        <button onClick={loadMore} disabled={isPending}>
          Older messages
        </button>
      )}
    </>
  );
}

function MessageItem({
  handle,
  speechNames,
}: {
  handle: DocumentHandle;
  speechNames: Map<string, string>;
}) {
  const { data } = useDocumentProjection<{
    author?: string;
    body?: string;
    sentAt?: string;
    speechKey?: string;
  }>({ ...handle, projection: "{author, body, sentAt, speechKey}" });

  if (!data) return null;
  const tab = data.speechKey
    ? (speechNames.get(data.speechKey) ?? "Removed speech")
    : "General";

  return (
    <li className="message">
      <div className="message-meta">
        <strong>{data.author}</strong>
        <span className="tab">{tab}</span>
        {data.sentAt && (
          <time>{new Date(data.sentAt).toLocaleTimeString()}</time>
        )}
      </div>
      <p>{data.body}</p>
    </li>
  );
}
