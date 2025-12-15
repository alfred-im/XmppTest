import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConversations } from '../contexts/ConversationsContext'
import { truncateMessage, getInitials } from '../utils/message'
import { formatConversationTimestamp } from '../utils/date'
import './ConversationsList.css'

/**
 * ConversationsList Component
 * 
 * ARCHITETTURA "SYNC-ONCE + LISTEN":
 * - Mostra conversazioni dalla cache locale
 * - Pull-to-refresh RIMOSSO (sync solo all'avvio)
 * - Updates automatici via ConversationsContext
 */
export function ConversationsList() {
  const navigate = useNavigate()
  const { conversations, isLoading, error } = useConversations()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleConversationClick = (jid: string) => {
    navigate(`/chat/${encodeURIComponent(jid)}`)
  }

  if (error && conversations.length === 0) {
    return (
      <div className="conversations-list">
        <div className="conversations-list__error">
          <p>Errore: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="conversations-list">
      <div
        ref={scrollContainerRef}
        className="conversations-list__items scrollable-container"
        role="list"
        aria-label="Lista conversazioni"
      >
        {isLoading && conversations.length === 0 ? (
          <div className="conversations-list__loading" role="status" aria-live="polite">
            <div className="conversations-list__spinner" aria-hidden="true"></div>
            <p>Caricamento conversazioni...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="conversations-list__empty" role="status">
            <p>Nessuna conversazione</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div 
              key={conv.jid} 
              className="conversation-item"
              role="listitem"
              onClick={() => handleConversationClick(conv.jid)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleConversationClick(conv.jid)
                }
              }}
              tabIndex={0}
              aria-label={`Conversazione con ${conv.displayName || conv.jid}. ${conv.unreadCount > 0 ? `${conv.unreadCount} messaggi non letti.` : ''} Ultimo messaggio: ${conv.lastMessage.body}`}
            >
              <div className="conversation-item__avatar">
                {conv.avatarData && conv.avatarType ? (
                  <img 
                    src={`data:${conv.avatarType};base64,${conv.avatarData}`}
                    alt={`Avatar di ${conv.displayName || conv.jid}`}
                    className="conversation-item__avatar-img"
                  />
                ) : (
                  <span className="conversation-item__avatar-initials">
                    {getInitials(conv.jid, conv.displayName)}
                  </span>
                )}
              </div>
              <div className="conversation-item__content">
                <div className="conversation-item__header">
                  <span className="conversation-item__name">
                    {conv.displayName || conv.jid}
                  </span>
                  <time 
                    className="conversation-item__time"
                    dateTime={conv.lastMessage.timestamp.toISOString()}
                  >
                    {formatConversationTimestamp(conv.lastMessage.timestamp)}
                  </time>
                </div>
                <div className="conversation-item__preview">
                  <span className={`conversation-item__sender ${conv.lastMessage.from}`} aria-hidden="true">
                    {conv.lastMessage.from === 'me' ? 'Tu: ' : ''}
                  </span>
                  <span className="conversation-item__body">
                    {truncateMessage(conv.lastMessage.body, 50)}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span 
                      className="conversation-item__unread"
                      aria-label={`${conv.unreadCount} messaggi non letti`}
                    >
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
