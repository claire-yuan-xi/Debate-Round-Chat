import {Badge, Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {useFormValue, type StringInputProps} from 'sanity'
import {stateTitle} from '../../shared/workflow'
import {useMoveRound} from './useMoveRound'

/** Shows the round's workflow state with a button for each move a person can make. */
export function WorkflowStateInput(props: StringInputProps) {
  const documentId = useFormValue(['_id']) as string | undefined
  const rev = useFormValue(['_rev']) as string | undefined
  const currentState = props.value ?? null
  const {definition, transitions, run, busy, error} = useMoveRound(
    documentId ?? '',
    rev,
    currentState,
  )

  return (
    <Card padding={3} radius={2} border>
      <Stack gap={3}>
        <Flex align="center" gap={2}>
          <Text size={1} muted>
            Currently
          </Text>
          <Badge>{stateTitle(definition, currentState)}</Badge>
        </Flex>
        {!rev ? (
          <Text size={1} muted>
            Give the round a title first, then you can move it.
          </Text>
        ) : transitions.length === 0 ? (
          <Text size={1} muted>
            No moves a person can make from here.
          </Text>
        ) : (
          <Flex gap={2} wrap="wrap">
            {transitions.map((t) => (
              <Button
                key={t._key}
                tone="primary"
                text={`${t.title} → ${stateTitle(definition, t.to)}`}
                disabled={busy}
                onClick={() => run(t.id)}
              />
            ))}
          </Flex>
        )}
        {error && (
          <Text size={1} style={{color: 'var(--card-badge-critical-fg-color, #c00)'}}>
            {error}
          </Text>
        )}
      </Stack>
    </Card>
  )
}
