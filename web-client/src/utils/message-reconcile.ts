import type { Message } from '../services/conversations-db'
import type { VirtualMessage } from '../types/ui-message'

const MATCH_WINDOW_MS = 10_000

/** True se il messaggio DB corrisponde al virtuale */
export function virtualMatchesDb(virtual: VirtualMessage, db: Message): boolean {
  if (virtual.conversationJid !== db.conversationJid) return false
  if (virtual.body !== db.body) return false
  if (virtual.from !== db.from) return false

  const delta = Math.abs(virtual.timestamp.getTime() - db.timestamp.getTime())
  if (delta > MATCH_WINDOW_MS) return false

  if (virtual.tempId && db.tempId && virtual.tempId === db.tempId) return true
  if (virtual.tempId && db.messageId === virtual.tempId) return true

  return true
}

export function findDbMatch(virtual: VirtualMessage, dbMessages: Message[]): Message | undefined {
  return dbMessages.find((db) => virtualMatchesDb(virtual, db))
}

export function mergeVirtualAndDb(
  virtuals: VirtualMessage[],
  dbMessages: Message[]
): Array<Message | VirtualMessage> {
  const unmatchedVirtuals = virtuals.filter((v) => !findDbMatch(v, dbMessages))
  const merged = [...dbMessages, ...unmatchedVirtuals]
  return merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

export function isVirtualMessage(item: Message | VirtualMessage): item is VirtualMessage {
  return 'virtualId' in item
}

export function getChatItemKey(item: Message | VirtualMessage): string {
  return isVirtualMessage(item) ? item.virtualId : item.messageId
}
