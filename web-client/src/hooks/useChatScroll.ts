import { useRef, useCallback } from 'react'
import { PAGINATION } from '../config/constants'

interface UseChatScrollReturn {
  messagesContainerRef: React.RefObject<HTMLDivElement | null>
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  isAnchored: () => boolean
  handleScroll: () => void
  scrollToBottom: (behavior?: ScrollBehavior) => void
}

/**
 * Custom hook per gestire lo scroll nella chat.
 * 
 * Design: Sistema binario con aggancio.
 * - Il flag isAnchored nasce TRUE (conversazione parte dal fondo)
 * - L'utente scrolla → handleScroll aggiorna isAnchored in base alla posizione
 * - Se sei in fondo (≤ SCROLL_BOTTOM_TOLERANCE px) → agganciato
 * - Se scrolli via → sganciato
 * 
 * Il consumer (ChatPage) usa isAnchored() per decidere se scrollare
 * quando i messaggi cambiano.
 */
export function useChatScroll(): UseChatScrollReturn {
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Flag che traccia se l'utente è "agganciato" al fondo
  // Aggiornato SOLO durante handleScroll
  const isAnchoredRef = useRef(true)

  /**
   * Ritorna true se l'utente è agganciato al fondo
   */
  const isAnchored = useCallback(() => isAnchoredRef.current, [])

  /**
   * Handler per l'evento scroll dell'utente.
   * Questa è l'UNICA cosa che determina se sei agganciato o no.
   */
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // Aggiorna lo stato "agganciato": sei agganciato SOLO se sei veramente in fondo
    isAnchoredRef.current = distanceFromBottom <= PAGINATION.SCROLL_BOTTOM_TOLERANCE
  }, [])

  /**
   * Scrolla al fondo del container (forzato, usato per azioni esplicite come pull-to-refresh)
   */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior })
      isAnchoredRef.current = true
    }
  }, [])

  return {
    messagesContainerRef,
    messagesEndRef,
    isAnchored,
    handleScroll,
    scrollToBottom,
  }
}
