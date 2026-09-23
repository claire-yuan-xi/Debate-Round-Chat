import {useCallback, useEffect, useState} from 'react'
import {Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {CopyIcon} from '@sanity/icons/Copy'
import {RefreshIcon} from '@sanity/icons/Refresh'
import {useClient, useFormValue} from 'sanity'
import {generateJoinCode, roundAccessId} from '../../shared/joinCode'

/** Shows the round's private join code, creating one the first time the round is saved. */
export function JoinCodePanel() {
  const client = useClient({apiVersion: '2026-09-22'})
  const roundId = useFormValue(['_id']) as string | undefined
  const saved = Boolean(useFormValue(['_rev']))
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const accessId = roundId ? roundAccessId(roundId) : null

  const load = useCallback(async () => {
    if (!roundId || !accessId) return
    try {
      await client.createIfNotExists({
        _id: accessId,
        _type: 'roundAccess',
        round: {_type: 'reference', _ref: roundId, _weak: true},
        joinCode: generateJoinCode(),
      })
      setCode(await client.fetch<string | null>(`*[_id == $id][0].joinCode`, {id: accessId}))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [client, roundId, accessId])

  useEffect(() => {
    if (saved) load()
  }, [saved, load])

  async function regenerate() {
    if (!accessId) return
    setError(null)
    try {
      const next = generateJoinCode()
      await client.patch(accessId).set({joinCode: next}).commit()
      setCode(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function copy() {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card padding={3} radius={2} border tone="primary">
      <Stack gap={3}>
        <Text size={1} weight="semibold">
          Join code
        </Text>
        {!saved ? (
          <Text size={1} muted>
            Give the round a title, and a join code will appear here.
          </Text>
        ) : (
          <Flex align="center" gap={2} wrap="wrap">
            <Text size={4} weight="bold" style={{fontFamily: 'monospace', letterSpacing: '0.2em'}}>
              {code ?? '······'}
            </Text>
            <Button
              mode="ghost"
              icon={CopyIcon}
              text={copied ? 'Copied' : 'Copy'}
              onClick={copy}
              disabled={!code}
            />
            <Button
              mode="ghost"
              tone="critical"
              icon={RefreshIcon}
              text="New code"
              onClick={regenerate}
              disabled={!code}
            />
          </Flex>
        )}
        <Text size={1} muted>
          Partners type this code to open the chat. A new code signs everyone out of this round.
        </Text>
        {error && (
          <Text size={1} style={{color: 'var(--card-badge-critical-fg-color, #c00)'}}>
            {error}
          </Text>
        )}
      </Stack>
    </Card>
  )
}
