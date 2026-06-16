import type { Message } from '../services/conversations-db'
import type { CheckmarkLevel } from '../types/message-states'

function findMarkersFor(messageId: string, allMessages: Message[]) {
  return allMessages.filter((m) => m.markerFor === messageId && m.markerType)
}

/**
 * Risolve il livello spunta UI per un messaggio inviato da me.
 * Priorità: reading > received > sent
 */
export function resolveCheckmarkLevel(
  message: Message,
  allMessages: Message[],
  uiOverlays: { reading: ReadonlySet<string>; received: ReadonlySet<string> }
): CheckmarkLevel {
  if (message.from !== 'me') {
    return 'sent'
  }

  if (message.status === 'pending') return 'pending'
  if (message.status === 'failed') return 'failed'

  const markers = findMarkersFor(message.messageId, allMessages)
  const hasReadingMarker = markers.some(
    (m) => m.markerType === 'displayed' || m.markerType === 'acknowledged'
  )
  const hasReceivedMarker = markers.some((m) => m.markerType === 'received')

  if (hasReadingMarker || uiOverlays.reading.has(message.messageId)) {
    return 'reading'
  }
  if (hasReceivedMarker || uiOverlays.received.has(message.messageId)) {
    return 'received'
  }

  return 'sent'
}
