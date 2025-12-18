import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useConnection } from '../contexts/ConnectionContext'
import { useConversations } from '../contexts/ConversationsContext'
import { useMessaging } from '../contexts/MessagingContext'
import { useMessages } from '../hooks/useMessages'
import { useBackButton } from '../hooks/useBackButton'
import { isSameDay } from '../utils/date'
import { MessageItem } from '../components/MessageItem'
import { TEXT_LIMITS, PAGINATION } from '../config/constants'
import './ChatPage.css'

/**
 * Pagina principale per la visualizzazione e gestione di una chat
 * Utilizza custom hooks per separare le responsabilità:
 * - useMessages: gestione stato e operazioni sui messaggi (cache-first + observer)
 * 
 * ARCHITETTURA "SYNC-ONCE + LISTEN":
 * - Messaggi sincronizzati all'avvio (AppInitializer)
 * - Real-time updates via MessagingContext listener
 * - NO pull-to-refresh (rimosso)
 * - NO sync durante utilizzo
 * 
 * SCROLL BEHAVIOR:
 * - Parte sempre dal fondo all'apertura
 * - Auto-scroll solo se utente è "in fondo"
 * - Gestione tastiera virtuale con tracking posizione
 */
export function ChatPage() {
  const { jid: encodedJid } = useParams<{ jid: string }>()
  const navigate = useNavigate()
  const { client, isConnected, jid: myJid } = useConnection()
  const { conversations, markAsRead } = useConversations()
  const { subscribeToMessages } = useMessaging()
  
  const jid = useMemo(() => encodedJid ? decodeURIComponent(encodedJid) : '', [encodedJid])
  const conversation = useMemo(() => conversations.find((c) => c.jid === jid), [conversations, jid])
  
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const wasAtBottomRef = useRef(true) // Track if user was at bottom before new message

  // Validate JID format - redirect if empty or malformed
  // NON validiamo rigorosamente perché se il JID arriva dalla lista conversazioni,
  // significa che è nel database e quindi il server l'ha accettato
  useEffect(() => {
    if (!jid || jid.trim().length === 0) {
      console.error('JID vuoto')
      navigate('/conversations', { replace: true })
    }
  }, [jid, navigate])

  // Gestione back button
  useBackButton()

  // Custom hook per gestione messaggi
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    error,
    sendMessage: sendMessageHook,
    loadMoreMessages,
    setError,
  } = useMessages({
    jid,
    client,
    isConnected,
  })

  // Helper function per verificare se scroll è in fondo
  const isAtBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return true
    
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    return scrollBottom <= PAGINATION.SCROLL_BOTTOM_THRESHOLD
  }, [])

  // Handler scroll per trigger loadMore quando vicino al top
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    
    // Aggiorna il flag "era in fondo" ogni volta che l'utente scrolla
    wasAtBottomRef.current = isAtBottom()
    
    // Load more quando vicino al top
    if (
      container.scrollTop < PAGINATION.LOAD_MORE_THRESHOLD &&
      hasMoreMessages &&
      !isLoadingMore
    ) {
      loadMoreMessages()
    }
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages, isAtBottom])

  // Pull-to-refresh rimosso con architettura "sync-once + listen"
  // Messaggi sincronizzati all'avvio, poi solo real-time listener

  // Handle virtual keyboard on mobile - adjust layout and scroll
  useEffect(() => {
    if (!window.visualViewport) return

    const handleResize = () => {
      const container = messagesContainerRef.current
      if (!container) return

      const viewport = window.visualViewport!
      const keyboardHeight = window.innerHeight - viewport.height
      
      // Controlla se l'utente era in fondo PRIMA dell'apertura della tastiera
      const wasAtBottom = wasAtBottomRef.current
      
      // Aggiorna layout del container
      const inputHeight = 68
      if (keyboardHeight > 50) {
        // Tastiera aperta
        container.style.bottom = `${inputHeight}px`
        container.style.paddingBottom = `${keyboardHeight}px`
        
        // Se l'utente era in fondo, scrolla per mantenere la vista sugli ultimi messaggi
        if (wasAtBottom) {
          requestAnimationFrame(() => {
            container.scrollTo({ top: container.scrollHeight, behavior: 'auto' })
          })
        }
        // Se NON era in fondo, non fare nulla (mantieni la posizione di lettura)
      } else {
        // Tastiera chiusa
        container.style.bottom = '68px'
        container.style.paddingBottom = '1rem'
        
        // Se l'utente era in fondo, mantieni in fondo anche dopo la chiusura
        if (wasAtBottom) {
          requestAnimationFrame(() => {
            container.scrollTo({ top: container.scrollHeight, behavior: 'auto' })
          })
        }
        // Se NON era in fondo, non fare nulla
      }
    }

    window.visualViewport.addEventListener('resize', handleResize)
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [])

  // Subscribe a messaggi real-time
  useEffect(() => {
    if (!jid || !myJid) return

    const unsubscribe = subscribeToMessages(async (message) => {
      // Controlla se il messaggio è per questa conversazione
      const myBareJid = myJid.split('/')[0].toLowerCase()
      const from = message.from?.split('/')[0].toLowerCase() || ''
      const to = message.to?.split('/')[0].toLowerCase() || ''
      const contactJid = from === myBareJid ? to : from

      if (contactJid === jid.toLowerCase()) {
        // Aggiorna messaggi (gestito internamente da useMessages tramite subscribe)
        // Marca come letta
        markAsRead(jid)
      }
    })

    return unsubscribe
  }, [jid, myJid, subscribeToMessages, markAsRead])

  // Marca conversazione come letta quando si apre
  useEffect(() => {
    if (jid && client && isConnected) {
      markAsRead(jid)
    }
  }, [jid, client, isConnected, markAsRead])

  // XEP-0333: Invia marker 'displayed' per messaggi non marcati
  useEffect(() => {
    if (!client || !isConnected || !jid || messages.length === 0) return

    // Trova messaggi da loro che non hanno ancora un marker displayed
    const unmarkedMessages = messages.filter((msg) => {
      // Solo messaggi da loro (non miei)
      if (msg.from !== 'them') return false
      // Solo messaggi con body (non marker stessi)
      if (!msg.body || msg.markerType) return false
      // Verifica se esiste già un marker per questo messaggio
      const hasMarker = messages.some(
        (m) =>
          m.markerType === 'displayed' &&
          m.markerFor === msg.messageId
      )
      return !hasMarker
    })

    // Invia marker per ogni messaggio non marcato
    unmarkedMessages.forEach((msg) => {
      try {
        client.markDisplayed({
          id: msg.messageId,
          from: jid,
          type: 'chat',
        })
        console.log('📤 Marker displayed inviato per messaggio:', msg.messageId)
      } catch (error) {
        console.error('❌ Errore invio marker displayed:', error)
      }
    })
  }, [client, isConnected, jid, messages])

  // Auto-focus su input quando la chat si carica
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isLoading])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return

    const adjustHeight = () => {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, TEXT_LIMITS.MAX_TEXTAREA_HEIGHT) + 'px'
    }

    textarea.addEventListener('input', adjustHeight)
    return () => textarea.removeEventListener('input', adjustHeight)
  }, [])

  // Scroll iniziale al bottom quando la chat si carica
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || isLoading || messages.length === 0) return

    // Scroll immediato al bottom all'apertura della chat
    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: 'auto' })
      wasAtBottomRef.current = true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, jid]) // Si attiva quando finisce il caricamento iniziale o cambia chat (messages.length è solo guardia)

  // Auto-scroll al bottom quando arrivano nuovi messaggi (se l'utente era in fondo)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || messages.length === 0) return

    // Se l'utente era in fondo prima del nuovo messaggio, scrolla al bottom
    if (wasAtBottomRef.current) {
      // Usa requestAnimationFrame per assicurarsi che il DOM sia aggiornato
      requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: 'auto' })
        // Aggiorna il flag dopo lo scroll
        wasAtBottomRef.current = true
      })
    }
  }, [messages.length]) // Si attiva quando cambia il numero di messaggi

  // Mantieni in fondo quando il contenuto cambia (immagini/avatar che caricano)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || messages.length === 0) return

    // Observer per rilevare cambiamenti nel contenuto (immagini che caricano)
    const resizeObserver = new ResizeObserver(() => {
      // Solo se l'utente era/è in fondo, mantieni in fondo
      if (wasAtBottomRef.current) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'auto' })
      }
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [messages.length])

  // Handler per invio messaggio
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isSending) return

    const messageText = inputValue.trim()
    setInputValue('')
    setIsSending(true)
    setError(null)

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    try {
      const result = await sendMessageHook(messageText)

      if (!result.success) {
        // Ripristina il messaggio in caso di errore
        setInputValue(messageText)
      }
    } catch (err) {
      console.error('Errore nell\'invio:', err)
      setError('Errore nell\'invio del messaggio')
      // Ripristina il messaggio in caso di errore
      setInputValue(messageText)
    } finally {
      setIsSending(false)
    }
  }, [inputValue, isSending, sendMessageHook, setError])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const getContactName = useCallback(() => {
    return conversation?.displayName || jid.split('@')[0] || 'Chat'
  }, [conversation, jid])

  // Renderizza i messaggi usando componenti memoizzati
  // MessageItem è wrappato con React.memo, quindi React riusa i componenti
  // esistenti e non ricrea tutto da zero quando la lista cambia
  // Filtra marker dalla vista (MessageItem li usa per status ma non li renderizza)
  const visibleMessages = messages.filter((m) => !m.markerType)
  const renderedMessages = visibleMessages.map((message, index) => {
    const showDate = index === 0 || !isSameDay(visibleMessages[index - 1].timestamp, message.timestamp)
    return (
      <MessageItem
        key={message.messageId}
        message={message}
        showDate={showDate}
        allMessages={messages}
      />
    )
  })

  return (
    <div id="main-content" className="chat-page" role="main" tabIndex={-1}>
      {/* Header */}
      <header className="chat-page__header">
        <button 
          className="chat-page__back-btn"
          onClick={() => navigate('/conversations')}
          aria-label="Torna alla lista conversazioni"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="chat-page__contact-avatar">
          {conversation?.avatarData && conversation?.avatarType ? (
            <img 
              src={`data:${conversation.avatarType};base64,${conversation.avatarData}`}
              alt={`Avatar di ${getContactName()}`}
              className="chat-page__avatar-img"
            />
          ) : (
            <span className="chat-page__avatar-initials">
              {getContactName().slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="chat-page__contact-info">
          <h1 className="chat-page__contact-name">{getContactName()}</h1>
          <p className="chat-page__contact-status" aria-live="polite">Online</p>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="chat-page__error-banner" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Chiudi messaggio di errore">✕</button>
        </div>
      )}

      {/* Messages Area */}
      <main 
        className="chat-page__messages scrollable-container"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Messaggi della conversazione"
      >
        {isLoadingMore && (
          <div className="chat-page__load-more" aria-live="polite">
            <div className="chat-page__spinner" aria-hidden="true"></div>
            <span>Caricamento...</span>
          </div>
        )}

        {isLoading && messages.length === 0 ? (
          <div className="chat-page__loading" role="status" aria-live="polite">
            <div className="chat-page__spinner" aria-hidden="true"></div>
            <p>Caricamento messaggi...</p>
          </div>
        ) : error && messages.length === 0 ? (
          <div className="chat-page__error" role="alert">
            <p>{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-page__empty">
            <p>Nessun messaggio. Inizia la conversazione!</p>
          </div>
        ) : (
          renderedMessages
        )}
      </main>

      {/* Input Area */}
      <footer className="chat-page__input-area" role="complementary">
        <textarea
          ref={inputRef}
          className="chat-page__input"
          placeholder="Scrivi un messaggio..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isSending}
          aria-label="Campo di testo per scrivere un messaggio"
          aria-describedby="send-button"
        />
        <button
          id="send-button"
          className="chat-page__send-btn"
          onClick={handleSend}
          disabled={!inputValue.trim() || isSending}
          aria-label={isSending ? 'Invio in corso...' : 'Invia messaggio'}
          aria-disabled={!inputValue.trim() || isSending}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </footer>
    </div>
  )
}
