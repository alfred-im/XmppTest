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
 */
function findLatestMarker(messageId: string, allMessages: Message[]): Message | undefined {
  return allMessages
    .filter((m) => m.markerFor === messageId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
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
 * XEP-0333: Supporta chat markers per spunte lettura
 */
export const MessageItem = memo(function MessageItem({ message, showDate, allMessages }: MessageItemProps) {
  const isMe = message.from === 'me'

  // Safety: non renderizzare messaggi senza body (marker, receipt, chatState)
  if (!message.body || message.body.trim().length === 0) {
    return null
  }

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
})
