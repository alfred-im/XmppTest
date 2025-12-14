import { memo } from 'react'
import { formatDateSeparator, formatMessageTime } from '../utils/date'
import type { Message } from '../services/messages'

interface MessageItemProps {
  message: Message
  showDate: boolean
}

/**
 * Componente singolo messaggio - memoizzato per evitare re-render inutili.
 * React.memo confronta le props e salta il re-render se non sono cambiate.
 * Questo previene il flash bianco quando la lista messaggi viene aggiornata.
 */
export const MessageItem = memo(function MessageItem({ message, showDate }: MessageItemProps) {
  const isMe = message.from === 'me'

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
              <span className="chat-page__message-status" aria-label={`Messaggio ${message.status}`}>
                {message.status === 'pending' && '🕐'}
                {message.status === 'sent' && '✓'}
                {message.status === 'failed' && '✗'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
