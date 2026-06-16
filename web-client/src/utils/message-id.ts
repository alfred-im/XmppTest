import type { MAMResult } from 'stanza/protocol'

type StanzaWithId = {
  originId?: string
  id?: string
}

/**
 * ID canonico del messaggio per marker, dedup e UI.
 * Priorità: origin-id (XEP-0359) > id stanza > archive UID MAM.
 */
export function extractCanonicalMessageIdFromStanza(
  stanza?: StanzaWithId
): string | undefined {
  if (!stanza) return undefined
  const originId = stanza.originId?.trim()
  if (originId) return originId
  const stanzaId = stanza.id?.trim()
  if (stanzaId) return stanzaId
  return undefined
}

export function extractCanonicalMessageIdFromMam(
  result: MAMResult,
  fallback?: string
): string {
  const fromStanza = extractCanonicalMessageIdFromStanza(result.item?.message)
  if (fromStanza) return fromStanza
  if (result.id) return result.id
  return fallback ?? `mam_${Date.now()}`
}
