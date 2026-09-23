/**
 * The agent's side of the round workflow. It goes through the same engine as the
 * Studio and the App SDK app, acting as an "agent", so it can't take transitions
 * the workflow reserves for people (like approving a round's setup).
 *
 *   npx sanity exec scripts/agent.ts --with-user-token -- draft "Round 3 – Aff vs. Lincoln" "1AC,CX,1NC,CX,2AC"
 *   npx sanity exec scripts/agent.ts --with-user-token -- move <roundId> <transitionId>
 *   npx sanity exec scripts/agent.ts --with-user-token -- list
 */
import {getCliClient} from 'sanity/cli'
import {
  availableTransitions,
  makeEvent,
  planTransition,
  randomKey,
  ROUND_WORKFLOW_ID,
  type Actor,
  type WorkflowDefinition,
} from '../../shared/workflow'
import {generateJoinCode, roundAccessId} from '../../shared/joinCode'

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

async function draft(title: string, speechList = '') {
  if (!title) throw new Error('Usage: draft "<title>" "<speech1,speech2,...>"')
  const def = await getWorkflow()
  const speeches = speechList
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({_key: randomKey(), _type: 'speech', name}))
  const roundId = crypto.randomUUID()
  // The round and its private join code are created together.
  await client
    .transaction()
    .create({
      _id: roundId,
      _type: 'round',
      title,
      speeches,
      workflowState: def.initialState,
      workflowHistory: [makeEvent('draft', null, def.initialState, actor)],
    })
    .create({
      _id: roundAccessId(roundId),
      _type: 'roundAccess',
      round: {_type: 'reference', _ref: roundId, _weak: true},
      joinCode: generateJoinCode(),
    })
    .commit()
  console.log(`Drafted round ${roundId} (${def.initialState}). A person has to approve it.`)
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

async function list() {
  const def = await getWorkflow()
  const rounds = await client.fetch<{_id: string; title: string; workflowState?: string}[]>(
    `*[_type == "round"] | order(_updatedAt desc){_id, title, workflowState}`,
  )
  for (const r of rounds) {
    const moves = availableTransitions(def, r.workflowState, 'agent').map((t) => t.id)
    console.log(`${r._id}  [${r.workflowState}]  ${r.title}  agent can: ${moves.join(', ') || '—'}`)
  }
}

// `sanity exec` passes everything after `--` through, starting at argv[2].
const [command, ...args] = process.argv.slice(2).filter((arg) => arg !== '--')
const commands: Record<string, (...a: string[]) => Promise<void>> = {draft, move, list}

if (!commands[command]) {
  console.error('Commands: draft "<title>" "<speeches>" | move <roundId> <transitionId> | list')
  process.exit(1)
}
commands[command](...args).catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
