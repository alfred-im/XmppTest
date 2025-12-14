import { useRef, useCallback, useLayoutEffect } from 'react'
import { PAGINATION } from '../config/constants'

interface UseChatScrollOptions {
  messages: unknown[]
  isLoadingMore: boolean
  hasMoreMessages: boolean
  onLoadMore?: () => void
}

interface UseChatScrollReturn {
  messagesContainerRef: React.RefObject<HTMLDivElement | null>
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  handleScroll: () => void
  scrollToBottom: (behavior?: ScrollBehavior) => void
}

/**
 * Custom hook per gestire lo scroll nella chat.
 * 
 * Design: Sistema binario con aggancio esatto.
 * - Se sei in fondo (entro SCROLL_BOTTOM_TOLERANCE pixel) → agganciato → auto-scroll attivo
 * - Se scrolli via anche di 1px oltre la tolleranza → sganciato → auto-scroll disattivato
 * - Per riagganciare: scroll manuale fino in fondo oppure click su "vai in fondo"
 */
export function useChatScroll({
  messages,
  isLoadingMore,
  hasMoreMessages,
  onLoadMore,
}: UseChatScrollOptions): UseChatScrollReturn {
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Flag che traccia se l'utente è "agganciato" al fondo
  const isAnchoredRef = useRef(true)
  
  // Per gestire il loadMore: salva scrollHeight PRIMA del caricamento
  const scrollHeightBeforeLoadRef = useRef(0)
  
  // Per tracciare se è il primo caricamento
  const isFirstLoadRef = useRef(true)
  
  // Per tracciare il numero precedente di messaggi
  const prevMessagesCountRef = useRef(0)

  /**
   * Scrolla al fondo del container
   */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior })
      isAnchoredRef.current = true
    }
  }, [])

  /**
   * Handler per l'evento scroll dell'utente.
   */
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // Aggiorna lo stato "agganciato": sei agganciato SOLO se sei veramente in fondo
    isAnchoredRef.current = distanceFromBottom <= PAGINATION.SCROLL_BOTTOM_TOLERANCE

    // Trigger load more se vicino al top
    if (
      scrollTop < PAGINATION.LOAD_MORE_THRESHOLD &&
      hasMoreMessages &&
      !isLoadingMore &&
      onLoadMore
    ) {
      // Salva scrollHeight PRIMA di caricare nuovi messaggi
      scrollHeightBeforeLoadRef.current = scrollHeight
      onLoadMore()
    }
  }, [hasMoreMessages, isLoadingMore, onLoadMore])

  /**
   * Effetto principale che gestisce lo scroll quando cambiano i messaggi.
   * Usa useLayoutEffect per agire PRIMA del paint del browser.
   */
  useLayoutEffect(() => {
    const container = messagesContainerRef.current
    const endElement = messagesEndRef.current
    const currentCount = messages.length
    const prevCount = prevMessagesCountRef.current
    
    // Aggiorna il contatore
    prevMessagesCountRef.current = currentCount
    
    // Caso 0: Nessun messaggio o container non pronto
    if (currentCount === 0 || !container || !endElement) {
      return
    }
    
    // Caso 1: Primo caricamento - scrolla in fondo istantaneamente
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false
      endElement.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
      isAnchoredRef.current = true
      return
    }
    
    // Caso 2: LoadMore completato - preserva la posizione di lettura
    if (scrollHeightBeforeLoadRef.current > 0) {
      const newScrollHeight = container.scrollHeight
      const heightDifference = newScrollHeight - scrollHeightBeforeLoadRef.current
      container.scrollTop = container.scrollTop + heightDifference
      scrollHeightBeforeLoadRef.current = 0
      return
    }
    
    // Caso 3: Nuovi messaggi arrivati in fondo - auto-scroll solo se agganciato
    if (currentCount > prevCount && isAnchoredRef.current) {
      endElement.scrollIntoView({ behavior: 'smooth' })
    }
    
  }, [messages.length])

  return {
    messagesContainerRef,
    messagesEndRef,
    handleScroll,
    scrollToBottom,
  }
}
