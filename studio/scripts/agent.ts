/**
 * The agent's side of the round workflow. It goes through the same engine as the
 * Studio and the website, acting as an "agent", so it can't take transitions the
 * workflow reserves for people (like reopening a finished round).
 *
 *   npm run agent -- finish-stale 12        finish rounds with no messages in 12 hours
 *   npm run agent -- move <roundId> <transitionId>
 *   npm run agent -- list
 */
import {getCliClient} from 'sanity/cli'
import {
  availableTransitions,
  planTransition,
  ROUND_WORKFLOW_ID,
  type Actor,
  type WorkflowDefinition,
} from '../../shared/workflow'

const client = getCliClient({apiVersion: '2026-09-22'})
const actor: Actor = {type: 'agent', name: process.env.AGENT_NAME ?? 'Claude (agent)'}

async function getWorkflow() {
  const def = await client.fetch<WorkflowDefinition | null>(
    `*[_id == $id][0]{initialState, states, transitions}`,
    {id: ROUND_WORKFLOW_ID},
  )
  if (!def) throw new Error(`Workflow document "${ROUND_WORKFLOW_ID}" not found.`)
  return def
}

async function move(roundId: string, transitionId: string) {
  if (!roundId || !transitionId) throw new Error('Usage: move <roundId> <transitionId>')
  const def = await getWorkflow()
  const round = await client.getDocument<{_rev: string; workflowState?: string}>(roundId)
  if (!round) throw new Error(`Round ${roundId} not found.`)
  const plan = planTransition(def, round.workflowState, transitionId, actor)
  if (!plan.ok) throw new Error(plan.reason)
  await client
    .patch(roundId)
    .ifRevisionId(round._rev)
    .setIfMissing(plan.patch.setIfMissing)
    .set(plan.patch.set)
    .insert('after', plan.patch.insert.after, plan.patch.insert.items)
    .commit()
  console.log(`${plan.transition.title}: round ${roundId} is now ${plan.transition.to}.`)
}

/** Finish rounds that are still open but have been quiet for a while. */
async function finishStale(hours = '12') {
  const cutoff = new Date(Date.now() - Number(hours) * 3600_000).toISOString()
  const def = await getWorkflow()
  const stale = await client.fetch<{_id: string; title: string; workflowState?: string}[]>(
    `*[_type == "round" && workflowState in $open
      && coalesce(*[_type == "message" && round._ref == ^._id] | order(sentAt desc)[0].sentAt, _createdAt) < $cutoff
    ]{_id, title, workflowState}`,
    {open: def.states.filter((s) => s.chatOpen).map((s) => s.id), cutoff},
  )
  for (const round of stale) {
    const finish = availableTransitions(def, round.workflowState, 'agent').find(
      (t) => !def.states.find((s) => s.id === t.to)?.chatOpen,
    )
    if (!finish) continue
    await move(round._id, finish.id)
  }
  if (stale.length === 0) console.log(`No open rounds have been quiet for ${hours} hours.`)
}

async function list() {
  const def = await getWorkflow()
  const rounds = await client.fetch<{_id: string; title: string; workflowState?: string}[]>(
    `*[_type == "round" && !defined(kind)] | order(_updatedAt desc){_id, title, workflowState}`,
  )
  for (const r of rounds) {
    const moves = availableTransitions(def, r.workflowState, 'agent').map((t) => t.id)
    console.log(`${r._id}  [${r.workflowState}]  ${r.title}  agent can: ${moves.join(', ') || '—'}`)
  }
}

// `sanity exec` passes everything after `--` through, starting at argv[2].
const [command, ...args] = process.argv.slice(2).filter((arg) => arg !== '--')
const commands: Record<string, (...a: string[]) => Promise<void>> = {
  'finish-stale': finishStale,
  move,
  list,
}

if (!commands[command]) {
  console.error('Commands: finish-stale [hours] | move <roundId> <transitionId> | list')
  process.exit(1)
}
commands[command](...args).catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
