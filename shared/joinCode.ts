/**
 * Join codes gate each round's chat. A code lives in its own `roundAccess.<roundId>`
 * document: IDs with a dot aren't readable without a token, so the code stays
 * private even though the dataset is public.
 */

// No 0/O or 1/I, so codes are easy to read aloud. 32 characters, so no modulo bias.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const JOIN_CODE_LENGTH = 6

export function generateJoinCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(JOIN_CODE_LENGTH))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

export function roundAccessId(roundId: string): string {
  return `roundAccess.${roundId}`
}
