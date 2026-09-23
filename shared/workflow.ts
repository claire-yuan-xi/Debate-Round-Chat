/**
 * Round workflow engine, shared by the Studio, the App SDK app and the agent script.
 *
 * The states and transitions themselves live in Sanity as the `workflow-round`
 * document. This module only reads that definition and turns a requested
 * transition into a patch, so every caller moves a round through the same rules.
 */

export type ActorType = 'agent' | 'person'

export const ROUND_WORKFLOW_ID = 'workflow-round'

export interface WorkflowStateDef {
  _key: string
  id: string
  title: string
  chatOpen?: boolean
}

export interface WorkflowTransitionDef {
  _key: string
  id: string
  title: string
  from: string
  to: string
  actors: ActorType[]
}

export interface WorkflowDefinition {
  initialState: string
  states: WorkflowStateDef[]
  transitions: WorkflowTransitionDef[]
}

export interface Actor {
  type: ActorType
  name: string
}

export interface WorkflowEvent {
  _key: string
  _type: 'workflowEvent'
  transition: string
  from: string | null
  to: string
  actorType: ActorType
  actorName: string
  at: string
}

export function randomKey(): string {
  return Math.random().toString(36).slice(2, 12)
}

export function stateTitle(
  def: WorkflowDefinition | null | undefined,
  id: string | null | undefined,
) {
  return def?.states?.find((s) => s.id === id)?.title ?? id ?? 'Unknown'
}

/** Transitions the given actor may take from the round's current state. */
export function availableTransitions(
  def: WorkflowDefinition | null | undefined,
  currentState: string | null | undefined,
  actorType: ActorType,
): WorkflowTransitionDef[] {
  if (!def?.transitions) return []
  const state = currentState ?? def.initialState
  return def.transitions.filter((t) => t.from === state && t.actors?.includes(actorType))
}

export function makeEvent(
  transition: string,
  from: string | null,
  to: string,
  actor: Actor,
): WorkflowEvent {
  return {
    _key: randomKey(),
    _type: 'workflowEvent',
    transition,
    from,
    to,
    actorType: actor.type,
    actorName: actor.name,
    at: new Date().toISOString(),
  }
}

export type TransitionPlan =
  | {
      ok: true
      transition: WorkflowTransitionDef
      patch: {
        set: {workflowState: string}
        setIfMissing: {workflowHistory: []}
        insert: {after: string; items: WorkflowEvent[]}
      }
    }
  | {ok: false; reason: string}

/**
 * Validate a transition against the workflow definition and build the patch
 * that applies it. Callers apply the patch with whatever client they have.
 */
export function planTransition(
  def: WorkflowDefinition | null | undefined,
  currentState: string | null | undefined,
  transitionId: string,
  actor: Actor,
): TransitionPlan {
  if (!def) return {ok: false, reason: 'The round workflow definition is missing.'}
  const state = currentState ?? def.initialState
  const transition = def.transitions?.find((t) => t.id === transitionId)
  if (!transition) return {ok: false, reason: `Unknown transition "${transitionId}".`}
  if (transition.from !== state) {
    return {
      ok: false,
      reason: `"${transition.title}" moves a round from ${stateTitle(def, transition.from)}, but this round is ${stateTitle(def, state)}.`,
    }
  }
  if (!transition.actors?.includes(actor.type)) {
    const who = actor.type === 'agent' ? 'an agent' : 'a person'
    return {
      ok: false,
      reason: `"${transition.title}" can't be done by ${who}.`,
    }
  }
  return {
    ok: true,
    transition,
    patch: {
      set: {workflowState: transition.to},
      setIfMissing: {workflowHistory: []},
      insert: {
        after: 'workflowHistory[-1]',
        items: [makeEvent(transition.id, state, transition.to, actor)],
      },
    },
  }
}
