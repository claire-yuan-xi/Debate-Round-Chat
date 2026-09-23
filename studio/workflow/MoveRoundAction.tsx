import {useState} from 'react'
import {Box, Button, Stack, Text} from '@sanity/ui'
import {TransferIcon} from '@sanity/icons/Transfer'
import type {DocumentActionComponent} from 'sanity'
import {stateTitle} from '../../shared/workflow'
import {useMoveRound} from './useMoveRound'

/**
 * Lists the transitions a person can take from the round's current state.
 * Studio keeps actions for live-edit documents in the footer's "⋯" menu, so the
 * same buttons also appear in the form through WorkflowStateInput.
 */
export const MoveRoundAction: DocumentActionComponent = (props) => {
  const doc = props.published ?? props.draft
  const currentState = (doc?.workflowState as string | undefined) ?? null
  const {definition, transitions, run, busy, error, clearError} = useMoveRound(
    props.id,
    doc?._rev,
    currentState,
  )
  const [open, setOpen] = useState(false)

  return {
    label: 'Move round',
    icon: TransferIcon,
    disabled: !doc || !definition || transitions.length === 0,
    title: doc
      ? `Currently ${stateTitle(definition, currentState)}`
      : 'Save the round before moving it',
    onHandle: () => {
      clearError()
      setOpen(true)
    },
    dialog: open && {
      type: 'popover',
      onClose: () => setOpen(false),
      content: (
        <Box padding={2} style={{minWidth: 220}}>
          <Stack gap={2}>
            <Text size={1} muted>
              Currently {stateTitle(definition, currentState)}
            </Text>
            {transitions.map((t) => (
              <Button
                key={t._key}
                mode="ghost"
                text={`${t.title} → ${stateTitle(definition, t.to)}`}
                disabled={busy}
                onClick={async () => {
                  if (await run(t.id)) setOpen(false)
                }}
              />
            ))}
            {error && (
              <Text size={1} style={{color: 'var(--card-badge-critical-fg-color, #c00)'}}>
                {error}
              </Text>
            )}
          </Stack>
        </Box>
      ),
    },
  }
}
MoveRoundAction.displayName = 'MoveRoundAction'
