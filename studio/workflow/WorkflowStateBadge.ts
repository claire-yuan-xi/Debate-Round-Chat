import type {DocumentBadgeComponent, DocumentBadgeDescription} from 'sanity'
import {stateTitle} from '../../shared/workflow'
import {useRoundWorkflow} from './useRoundWorkflow'

const COLORS: Record<string, DocumentBadgeDescription['color']> = {
  draft: 'warning',
  ready: 'primary',
  live: 'success',
}

export const WorkflowStateBadge: DocumentBadgeComponent = (props) => {
  const definition = useRoundWorkflow()
  const state = (props.published ?? props.draft)?.workflowState as string | undefined
  if (!state) return null
  return {label: stateTitle(definition, state), color: COLORS[state]}
}
