import { useState } from "react";
import {
  editDocument,
  useApplyDocumentActions,
  useCurrentUser,
  useDocument,
  type DocumentHandle,
} from "@sanity/sdk-react";
import {
  availableTransitions,
  planTransition,
  ROUND_WORKFLOW_ID,
  stateTitle,
  type WorkflowDefinition,
} from "../../shared/workflow";

interface Props {
  handle: DocumentHandle;
  currentState?: string;
}

/** The same transitions the Studio's "Move round" action offers, as a person. */
export function WorkflowControls({ handle, currentState }: Props) {
  const { data: definition } = useDocument<WorkflowDefinition>({
    documentId: ROUND_WORKFLOW_ID,
    documentType: "workflow",
  });
  const user = useCurrentUser();
  const apply = useApplyDocumentActions();
  const [error, setError] = useState<string | null>(null);

  const transitions = availableTransitions(definition, currentState, "person");

  async function run(transitionId: string) {
    setError(null);
    const plan = planTransition(definition, currentState, transitionId, {
      type: "person",
      name: user?.name ?? user?.email ?? "App user",
    });
    if (!plan.ok) return setError(plan.reason);
    try {
      await apply(
        editDocument(handle, [
          { setIfMissing: plan.patch.setIfMissing },
          { set: plan.patch.set },
          { insert: plan.patch.insert },
        ]),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="workflow-controls">
      {transitions.length === 0 ? (
        <p className="muted">
          Nothing for a person to do from {stateTitle(definition, currentState)}
          .
        </p>
      ) : (
        transitions.map((t) => (
          <button key={t._key} onClick={() => run(t.id)}>
            {t.title} → {stateTitle(definition, t.to)}
          </button>
        ))
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
