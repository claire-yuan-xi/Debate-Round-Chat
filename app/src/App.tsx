import { Suspense, useState } from "react";
import { type SanityConfig } from "@sanity/sdk";
import { SanityApp, type DocumentHandle } from "@sanity/sdk-react";
import { RoundList } from "./RoundList";
import { RoundDetail } from "./RoundDetail";
import "./App.css";

const sanityConfigs: SanityConfig[] = [
  { projectId: "jelfmjhs", dataset: "production" },
];

function App() {
  const [selected, setSelected] = useState<DocumentHandle | null>(null);

  return (
    <SanityApp
      config={sanityConfigs}
      fallback={<div className="loading">Loading…</div>}
    >
      <div className="layout">
        <aside className="sidebar">
          <h1>Round Control</h1>
          <Suspense fallback={<p className="muted">Loading rounds…</p>}>
            <RoundList
              selectedId={selected?.documentId}
              onSelect={setSelected}
            />
          </Suspense>
        </aside>
        <main className="detail">
          {selected ? (
            <Suspense fallback={<p className="muted">Loading round…</p>}>
              {/* Rounds skip drafts, so edits go straight to the live document. */}
              <RoundDetail
                key={selected.documentId}
                handle={{ ...selected, liveEdit: true }}
              />
            </Suspense>
          ) : (
            <p className="muted">
              Pick a round to see its workflow and messages as they arrive.
            </p>
          )}
        </main>
      </div>
    </SanityApp>
  );
}

export default App;
