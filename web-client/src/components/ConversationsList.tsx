import { useXmpp } from '../contexts/XmppContext'
import './ConversationsList.css'

export function ConversationsList() {
  const { conversations, isLoading, error } = useXmpp()

  const formatTimestamp = (date: Date): string => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      // Oggi: mostra solo l'ora
      return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Ieri'
    } else if (days < 7) {
      return `${days} giorni fa`
    } else {
      return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
    }
  }

  const truncateMessage = (body: string, maxLength = 60): string => {
    if (body.length <= maxLength) {
      return body
    }
    return body.substring(0, maxLength) + '...'
  }

  if (isLoading && conversations.length === 0) {
    return (
      <div className="conversations-list">
        <div className="conversations-list__loading">
          <p>Caricamento conversazioni...</p>
        </div>
      </div>
    )
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

  if (conversations.length === 0) {
    return (
      <div className="conversations-list">
        <div className="conversations-list__empty">
          <p>Nessuna conversazione trovata.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="conversations-list">
      <div className="conversations-list__header">
        <h2>Conversazioni</h2>
        {isLoading && <span className="conversations-list__loading-indicator">Aggiornamento...</span>}
      </div>

      <div className="conversations-list__items">
        {conversations.map((conv) => (
          <div key={conv.jid} className="conversation-item">
            <div className="conversation-item__avatar">
              {conv.displayName?.[0]?.toUpperCase() || conv.jid[0]?.toUpperCase()}
            </div>
            <div className="conversation-item__content">
              <div className="conversation-item__header">
                <span className="conversation-item__name">
                  {conv.displayName || conv.jid.split('@')[0]}
                </span>
                <span className="conversation-item__time">
                  {formatTimestamp(conv.lastMessage.timestamp)}
                </span>
              </div>
              <div className="conversation-item__preview">
                <span className={`conversation-item__sender ${conv.lastMessage.from}`}>
                  {conv.lastMessage.from === 'me' ? 'Tu: ' : ''}
                </span>
                <span className="conversation-item__body">
                  {truncateMessage(conv.lastMessage.body)}
                </span>
                {conv.unreadCount > 0 && (
                  <span className="conversation-item__unread">{conv.unreadCount}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
