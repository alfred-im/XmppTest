import type { BareJID } from '../types/jid'

export type OutboxStatus = 'queued' | 'sending' | 'failed'

export interface OutboxEntry {
  tempId: string
  conversationJid: BareJID
  body: string
  timestamp: Date
  status: OutboxStatus
  stanzaId?: string
  lastError?: string
}
