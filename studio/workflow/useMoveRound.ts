import {useState} from 'react'
import {useClient, useCurrentUser} from 'sanity'
import {availableTransitions, planTransition} from '../../shared/workflow'
import {useRoundWorkflow} from './useRoundWorkflow'

/** Everything a person needs to move a round: the allowed transitions and a way to run one. */
export function useMoveRound(
  documentId: string,
  rev: string | undefined,
  currentState: string | null,
) {
  const client = useClient({apiVersion: '2026-09-22'})
  const user = useCurrentUser()
  const definition = useRoundWorkflow()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const transitions = availableTransitions(definition, currentState, 'person')

  async function run(transitionId: string): Promise<boolean> {
    setError(null)
    const plan = planTransition(definition, currentState, transitionId, {
      type: 'person',
      name: user?.name ?? user?.email ?? 'Studio user',
    })
    if (!plan.ok) {
      setError(plan.reason)
      return false
    }
    setBusy(true)
    try {
      let patch = client.patch(documentId)
      if (rev) patch = patch.ifRevisionId(rev)
      await patch
        .setIfMissing(plan.patch.setIfMissing)
        .set(plan.patch.set)
        .insert('after', plan.patch.insert.after, plan.patch.insert.items)
        .commit()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  return {definition, transitions, run, busy, error, clearError: () => setError(null)}
}
