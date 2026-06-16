import type { BareJID } from './jid'

/** Messaggio mostrato in UI prima della conferma MAM */
export interface VirtualMessage {
  virtualId: string
  conversationJid: BareJID
  body: string
  timestamp: Date
  from: 'me' | 'them'
  /** Per abbinare invio ottimistico al messaggio MAM */
  tempId?: string
  kind: 'outgoing' | 'incoming'
}
