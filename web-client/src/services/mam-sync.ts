import type { Agent } from 'stanza'
import { loadMessagesForContact } from './messages'
import { advanceListenerWatermark } from './listener-watermark'
import { conversationRepository, metadataRepository } from './repositories'
import { normalizeJID } from '../utils/jid'

const DEBOUNCE_MS = 300
const MAM_LOOKBACK_MS = 2000
const MAX_RETRIES = 3

const timers = new Map<string, ReturnType<typeof setTimeout>>()
const inflight = new Set<string>()

function mamStartReference(): Date {
  const now = Date.now()
  return new Date(Math.floor(now / 1000) * 1000 - MAM_LOOKBACK_MS)
}

/**
 * Schedula sync MAM per una conversazione (debounce).
 * Unico writer autoritativo nel DB messaggi dopo campanello real-time.
 */
export function scheduleConversationMamSync(
  client: Agent,
  conversationJid: string,
  reason: string
): void {
  const jid = normalizeJID(conversationJid)
  const existing = timers.get(jid)
  if (existing) clearTimeout(existing)

  timers.set(
    jid,
    setTimeout(() => {
      timers.delete(jid)
      void runConversationMamSync(client, jid, reason)
    }, DEBOUNCE_MS)
  )
}

async function runConversationMamSync(
  client: Agent,
  conversationJid: string,
  reason: string,
  attempt = 0
): Promise<void> {
  const jid = normalizeJID(conversationJid)
  if (inflight.has(jid)) return
  inflight.add(jid)

  try {
    console.log(`🔄 MAM sync (${reason}) per ${jid}, tentativo ${attempt + 1}`)
    const startAfter = mamStartReference()
    const metadata = await metadataRepository.get()
    const afterToken = metadata?.conversationTokens?.[jid]

    const result = await loadMessagesForContact(client, jid, {
      maxResults: 50,
      afterToken,
      startAfter,
    })

    if (result.messages.length === 0 && attempt < MAX_RETRIES) {
      inflight.delete(jid)
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
      return runConversationMamSync(client, jid, reason, attempt + 1)
    }

    if (result.messages.length > 0) {
      const last = result.messages[result.messages.length - 1]
      await conversationRepository.update(jid, {
        jid,
        lastMessage: {
          body: last.body,
          timestamp: last.timestamp,
          from: last.from,
          messageId: last.messageId,
        },
        updatedAt: last.timestamp,
      })
      await advanceListenerWatermark(jid, last.timestamp)

      if (result.lastToken) {
        const current = await metadataRepository.get()
        await metadataRepository.save({
          lastSync: new Date(),
          ...current,
          conversationTokens: {
            ...current?.conversationTokens,
            [jid]: result.lastToken,
          },
        } as Parameters<typeof metadataRepository.save>[0])
      }
    }

    console.log(`✅ MAM sync completata per ${jid}: ${result.messages.length} messaggi`)
  } catch (error) {
    console.error(`❌ MAM sync fallita per ${jid}:`, error)
  } finally {
    inflight.delete(jid)
  }
}
