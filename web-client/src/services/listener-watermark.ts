import { metadataRepository } from './repositories'
import type { SyncMetadata } from './repositories/MetadataRepository'
import { normalizeJID } from '../utils/jid'

/**
 * Avanza il watermark di sync per una conversazione quando il listener
 * salva un messaggio (in entrata o in uscita).
 *
 * Al rientro, MAM userà questo timestamp come `start` e non riscaricherà
 * messaggi già coperti dal listener nella sessione precedente.
 */
export async function advanceListenerWatermark(
  conversationJid: string,
  timestamp: Date = new Date()
): Promise<void> {
  const jid = normalizeJID(conversationJid)
  const metadata = await metadataRepository.get()
  const existingIso = metadata?.listenerCoveredUntil?.[jid]
  const coveredUntil = existingIso
    ? new Date(Math.max(new Date(existingIso).getTime(), timestamp.getTime()))
    : timestamp

  const next: SyncMetadata = {
    lastSync: new Date(),
    ...metadata,
    listenerCoveredUntil: {
      ...metadata?.listenerCoveredUntil,
      [jid]: coveredUntil.toISOString(),
    },
  }

  await metadataRepository.save(next)
  console.log(`🕐 Watermark listener aggiornato per ${jid}: ${coveredUntil.toISOString()}`)
}

/**
 * Restituisce il timestamp fino al quale il listener ha già coperto i messaggi.
 */
export function getListenerWatermark(
  metadata: SyncMetadata | null,
  conversationJid: string
): Date | undefined {
  const iso = metadata?.listenerCoveredUntil?.[normalizeJID(conversationJid)]
  return iso ? new Date(iso) : undefined
}
