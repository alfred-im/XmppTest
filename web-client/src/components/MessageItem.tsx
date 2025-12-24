import { memo } from 'react'
import { formatDateSeparator, formatMessageTime } from '../utils/date'
import type { Message } from '../services/messages'

interface MessageItemProps {
  message: Message
  showDate: boolean
  allMessages: Message[] // Array completo per cercare marker
}

/**
 * Trova il marker più recente per un messaggio specifico
 * Applica gerarchia: acknowledged > displayed > received
 */
function findLatestMarker(messageId: string, allMessages: Message[]): Message | undefined {
  const markers = allMessages.filter((m) => m.markerFor === messageId)
  
  if (markers.length === 0) return undefined
  
  // Definisci priorità marker: acknowledged (3) > displayed (2) > received (1)
  const priority = (marker: Message): number => {
    if (marker.markerType === 'acknowledged') return 3
    if (marker.markerType === 'displayed') return 2
    if (marker.markerType === 'received') return 1
    return 0
  }
  
  // Ordina per priorità (più alta prima), poi per timestamp (più recente prima)
  return markers.sort((a, b) => {
    const priorityDiff = priority(b) - priority(a)
    if (priorityDiff !== 0) return priorityDiff
    return b.timestamp.getTime() - a.timestamp.getTime()
  })[0]
}

/**
 * Renderizza le spunte in base allo status del messaggio
 */
function renderCheckmarks(status: string) {
  switch (status) {
    case 'pending':
      return <span className="chat-page__checkmark-pending">🕐</span>
    case 'sent':
      return <span className="chat-page__checkmark-single">✓</span>
    case 'displayed':
      return <span className="chat-page__checkmark-double">✓✓</span>
    case 'acknowledged':
      return <span className="chat-page__checkmark-double-blue">✓✓</span>
    case 'failed':
      return <span className="chat-page__checkmark-failed">✗</span>
    default:
      return <span className="chat-page__checkmark-single">✓</span>
  }
}

/**
 * Componente singolo messaggio - memoizzato per evitare re-render inutili.
 * React.memo confronta le props e salta il re-render se non sono cambiate.
 * Questo previene il flash bianco quando la lista messaggi viene aggiornata.
 * 
 * XEP-0333: Gestisce 3 tipi di messaggi:
 * 1. Messaggio testuale (ha body) → renderizza normale
 * 2. Marker (no body, ha markerType) → non renderizza, aggiorna status del messaggio riferito
 * 3. Altro (no body, no markerType) → renderizza per debug
 */
export const MessageItem = memo(function MessageItem({ message, showDate, allMessages }: MessageItemProps) {
  const isMe = message.from === 'me'

  // CASO 1: Messaggio con body → renderizza normale
  if (message.body && message.body.trim().length > 0) {
    // Trova marker per questo messaggio
    const marker = findLatestMarker(message.messageId, allMessages)
    
    // Determina status effettivo (marker ha priorità su status base)
    const effectiveStatus = marker?.markerType || message.status || 'sent'
    
    return (
      <div>
        {showDate && (
          <div className="chat-page__date-separator">
            {formatDateSeparator(message.timestamp)}
          </div>
        )}
        <div className={`chat-page__message ${isMe ? 'chat-page__message--me' : 'chat-page__message--them'}`}>
          <div className="chat-page__message-bubble">
            <p className="chat-page__message-body">{message.body}</p>
            <div className="chat-page__message-meta">
              <span className="chat-page__message-time">
                {formatMessageTime(message.timestamp)}
              </span>
              {isMe && (
                <span className="chat-page__message-status" aria-label={`Messaggio ${effectiveStatus}`}>
                  {renderCheckmarks(effectiveStatus)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // CASO 2: Marker (ha markerType) → non renderizza
  if (message.markerType) {
    return null
  }

  // CASO 3: Altro (no body, no markerType) → renderizza per debug
  return (
    <div>
      {showDate && (
        <div className="chat-page__date-separator">
          {formatDateSeparator(message.timestamp)}
        </div>
      )}
      <div className={`chat-page__message ${isMe ? 'chat-page__message--me' : 'chat-page__message--them'}`}>
        <div className="chat-page__message-bubble" style={{ opacity: 0.5, fontSize: '0.75rem', fontStyle: 'italic' }}>
          <p className="chat-page__message-body">[Messaggio vuoto - ID: {message.messageId.substring(0, 8)}]</p>
          <div className="chat-page__message-meta">
            <span className="chat-page__message-time">
              {formatMessageTime(message.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})
