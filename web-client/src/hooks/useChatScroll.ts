import { useEffect, useRef, useCallback } from 'react'
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
 * 
 * @param options - Opzioni di configurazione
 * @returns Oggetto con refs e funzioni per gestire lo scroll
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
  // Aggiornato SOLO durante l'evento scroll dell'utente
  const isAnchoredRef = useRef(true)
  
  // Per preservare la posizione scroll durante il loadMore
  const lastScrollHeightRef = useRef(0)
  
  // Per tracciare il numero di messaggi e distinguere nuovi messaggi da loadMore
  const prevMessagesLengthRef = useRef(messages.length)

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
   * Handler per l'evento scroll.
   * - Aggiorna lo stato "agganciato" in base alla posizione
   * - Triggera load more quando vicino al top
   */
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // Aggiorna lo stato "agganciato": sei agganciato SOLO se sei veramente in fondo
    isAnchoredRef.current = distanceFromBottom <= PAGINATION.SCROLL_BOTTOM_TOLERANCE

    // Trigger load more se vicino al top (ma non durante loading)
    if (
      scrollTop < PAGINATION.LOAD_MORE_THRESHOLD &&
      hasMoreMessages &&
      !isLoadingMore &&
      onLoadMore
    ) {
      lastScrollHeightRef.current = scrollHeight
      onLoadMore()
    }
  }, [hasMoreMessages, isLoadingMore, onLoadMore])

  /**
   * Effetto per auto-scroll quando arrivano NUOVI messaggi (non caricamento storico)
   * Scrolla al fondo SOLO se l'utente era agganciato
   */
  useEffect(() => {
    const currentLength = messages.length
    const prevLength = prevMessagesLengthRef.current
    
    // Aggiorna il contatore per la prossima volta
    prevMessagesLengthRef.current = currentLength

    // Caso 1: Nuovi messaggi aggiunti in fondo (currentLength > prevLength)
    // Auto-scroll solo se l'utente era agganciato
    if (currentLength > prevLength && isAnchoredRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, [messages.length])

  /**
   * Effetto per preservare la posizione scroll dopo loadMore
   * Quando si caricano messaggi storici (in alto), mantieni la vista sui messaggi che l'utente stava leggendo
   */
  useEffect(() => {
    if (!messagesContainerRef.current || lastScrollHeightRef.current === 0) return
    
    const container = messagesContainerRef.current
    const newScrollHeight = container.scrollHeight
    const heightDifference = newScrollHeight - lastScrollHeightRef.current
    
    // Sposta lo scroll per compensare i nuovi messaggi aggiunti in alto
    container.scrollTop = container.scrollTop + heightDifference
    
    // Reset per la prossima volta
    lastScrollHeightRef.current = 0
  }, [messages.length])

  /**
   * Scroll iniziale al fondo quando il componente monta con messaggi
   */
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      // Usa 'instant' per lo scroll iniziale (senza animazione)
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
      isAnchoredRef.current = true
    }
  }, []) // Solo al mount

  return {
    messagesContainerRef,
    messagesEndRef,
    handleScroll,
    scrollToBottom,
  }
}
