import { Suspense } from "react";
import { useDocument, type DocumentHandle } from "@sanity/sdk-react";
import type { WorkflowEvent } from "../../shared/workflow";
import { WorkflowControls } from "./WorkflowControls";
import { MessageFeed } from "./MessageFeed";

export interface RoundDoc {
  _rev: string;
  title?: string;
  workflowState?: string;
  speeches?: { _key: string; name?: string }[];
  workflowHistory?: WorkflowEvent[];
}

export function RoundDetail({ handle }: { handle: DocumentHandle }) {
  const { data: round } = useDocument<RoundDoc>(handle);
  if (!round) return <p className="muted">This round was deleted.</p>;

  const history = [...(round.workflowHistory ?? [])].reverse();

  return (
    <div className="round-detail">
      <header>
        <h2>{round.title ?? "Untitled round"}</h2>
        <span className={`state state-${round.workflowState}`}>
          {round.workflowState}
        </span>
      </header>

      <section>
        <h3>Workflow</h3>
        <Suspense fallback={<p className="muted">Loading workflow…</p>}>
          <WorkflowControls
            handle={handle}
            currentState={round.workflowState}
          />
        </Suspense>
        <ol className="history">
          {history.map((event) => (
            <li key={event._key}>
              <strong>{event.transition}</strong> {event.from ?? "—"} →{" "}
              {event.to}{" "}
              <span className={`actor actor-${event.actorType}`}>
                {event.actorType}
              </span>{" "}
              {event.actorName} ·{" "}
              <time>{new Date(event.at).toLocaleString()}</time>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3>Messages</h3>
        <Suspense fallback={<p className="muted">Loading messages…</p>}>
          <MessageFeed
            roundId={handle.documentId}
            speeches={round.speeches ?? []}
          />
        </Suspense>
      </section>
    </div>
  );
}
