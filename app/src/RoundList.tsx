import { Suspense } from "react";
import {
  useDocumentProjection,
  useDocuments,
  type DocumentHandle,
} from "@sanity/sdk-react";

interface Props {
  selectedId?: string;
  onSelect: (handle: DocumentHandle) => void;
}

export function RoundList({ selectedId, onSelect }: Props) {
  const { data, hasMore, loadMore, isPending } = useDocuments({
    documentType: "round",
    batchSize: 30,
    orderings: [{ field: "_updatedAt", direction: "desc" }],
  });

  if (data.length === 0) return <p className="muted">No rounds yet.</p>;

  return (
    <>
      <ul className="round-list">
        {data.map((handle) => (
          <Suspense
            key={handle.documentId}
            fallback={<li className="round-item">…</li>}
          >
            <RoundListItem
              handle={handle}
              selected={handle.documentId === selectedId}
              onSelect={onSelect}
            />
          </Suspense>
        ))}
      </ul>
      {hasMore && (
        <button onClick={loadMore} disabled={isPending}>
          Load more
        </button>
      )}
    </>
  );
}

function RoundListItem({
  handle,
  selected,
  onSelect,
}: {
  handle: DocumentHandle;
  selected: boolean;
  onSelect: (handle: DocumentHandle) => void;
}) {
  const { data } = useDocumentProjection<{
    title?: string;
    workflowState?: string;
  }>({
    ...handle,
    projection: "{title, workflowState}",
  });

  return (
    <li>
      <button
        className={`round-item${selected ? " selected" : ""}`}
        onClick={() => onSelect(handle)}
      >
        <span>{data?.title ?? "Untitled round"}</span>
        <span className={`state state-${data?.workflowState}`}>
          {data?.workflowState}
        </span>
      </button>
    </li>
  );
}
