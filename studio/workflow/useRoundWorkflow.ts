import {useEffect, useState} from 'react'
import {useClient} from 'sanity'
import {ROUND_WORKFLOW_ID, type WorkflowDefinition} from '../../shared/workflow'

const QUERY = `*[_id == $id][0]{initialState, states, transitions}`

/** The round workflow definition, kept up to date as it's edited. */
export function useRoundWorkflow(): WorkflowDefinition | null {
  const client = useClient({apiVersion: '2026-09-22'})
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null)

  useEffect(() => {
    const params = {id: ROUND_WORKFLOW_ID}
    const load = () => client.fetch<WorkflowDefinition | null>(QUERY, params).then(setDefinition)
    load()
    const subscription = client
      .listen(`*[_id == $id]`, params, {includeResult: false, visibility: 'query'})
      .subscribe(() => load())
    return () => subscription.unsubscribe()
  }, [client])

  return definition
}
