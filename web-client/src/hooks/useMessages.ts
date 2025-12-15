import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Agent } from 'stanza'
import {
  sendMessage as sendMessageService,
  applySelfChatLogic,
  type Message,
} from '../services/messages'
import { PAGINATION } from '../config/constants'
import { normalizeJID } from '../utils/jid'
import type { BareJID } from '../types/jid'
import { messageRepository } from '../services/repositories'

interface UseMessagesOptions {
  jid: string
  client: Agent | null
  isConnected: boolean
}

interface UseMessagesReturn {
  messages: Message[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMoreMessages: boolean
  error: string | null
  sendMessage: (body: string) => Promise<{ success: boolean; error?: string }>
  loadMoreMessages: () => Promise<void>
  setError: (error: string | null) => void
}

/**
 * Custom hook per gestire i messaggi di una conversazione
 * 
 * ARCHITETTURA SEMPLIFICATA:
 * - Carica SOLO da cache locale (sync gestita da AppInitializer)
 * - Usa Observer pattern per aggiornamenti real-time
 * - Paginazione SOLO da cache (scroll up per messaggi vecchi)
 * - NO più sync dal server durante utilizzo
 * 
 * @param options - Opzioni di configurazione
 * @param options.jid - JID del contatto per cui gestire i messaggi
 * @param options.client - Client XMPP connesso
 * @param options.isConnected - Flag di connessione
 * @returns Oggetto con stato e funzioni per gestire i messaggi
 */
export function useMessages({
  jid,
  client,
}: UseMessagesOptions): UseMessagesReturn {
  const [messagesRaw, setMessagesRaw] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const isMountedRef = useRef(true)

  // Applica logica self-chat ai messaggi per visualizzazione corretta
  const messages = useMemo(() => {
    if (!client?.jid || !jid) return messagesRaw
    
    const myBareJid = normalizeJID(client.jid)
    const contactBareJid = normalizeJID(jid)
    const isSelfChat = myBareJid === contactBareJid
    
    return applySelfChatLogic(messagesRaw, isSelfChat)
  }, [messagesRaw, jid, client?.jid])

  // Cleanup al unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Helper: Update messages in modo safe
  const safeSetMessages = useCallback((messages: Message[]) => {
    if (isMountedRef.current) {
      setMessagesRaw(messages)
    }
  }, [])

  // Carica messaggi dalla cache locale
  const loadFromCache = useCallback(async () => {
    if (!jid) return

    setIsLoading(true)
    setError(null)

    try {
      const normalizedJid: BareJID = normalizeJID(jid)
      
      // Carica ultimi N messaggi dalla cache
      const cached = await messageRepository.getForConversation(normalizedJid, {
        limit: PAGINATION.DEFAULT_MESSAGE_LIMIT,
      })

      if (isMountedRef.current) {
        safeSetMessages(cached)
        // Se abbiamo meno messaggi del limit, non ci sono altri messaggi
        setHasMoreMessages(cached.length >= PAGINATION.DEFAULT_MESSAGE_LIMIT)
      }
    } catch (err) {
      console.error('Errore caricamento messaggi da cache:', err)
      if (isMountedRef.current) {
        setError('Impossibile caricare i messaggi')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [jid, safeSetMessages])

  // Carica messaggi iniziali quando cambia jid
  useEffect(() => {
    if (jid) {
      loadFromCache()
    }
  }, [jid, loadFromCache])

  // Observer per aggiornamenti real-time dal database
  // Quando MessagingContext salva un messaggio → Observer notifica → UI aggiornata
  useEffect(() => {
    if (!jid) return

    const normalizedJid: BareJID = normalizeJID(jid)
    
    console.log(`👀 useMessages: registro observer per ${normalizedJid}`)
    
    // Callback chiamato quando il database cambia
    const handleDatabaseChange = async () => {
      if (!isMountedRef.current) return

      console.log(`🔄 useMessages: database cambiato, ricarico messaggi...`)
      
      try {
        // Ricarica tutti i messaggi della conversazione dalla cache
        const updated = await messageRepository.getForConversation(normalizedJid)
        
        console.log(`   - Caricati ${updated.length} messaggi dal DB`)
        
        if (isMountedRef.current) {
          safeSetMessages(updated)
        }
      } catch (err) {
        console.error('Errore nel ricaricamento messaggi dopo cambio DB:', err)
      }
    }

    // Registra observer sul repository
    const unsubscribe = messageRepository.observe(normalizedJid, handleDatabaseChange)
    
    console.log(`✓ useMessages: observer registrato per ${normalizedJid}`)

    // Cleanup: rimuove observer quando componente unmonta o jid cambia
    return () => {
      console.log(`🗑️ useMessages: rimuovo observer per ${normalizedJid}`)
      unsubscribe()
    }
  }, [jid, safeSetMessages])

  // Carica più messaggi (paginazione dalla cache locale)
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages || messagesRaw.length === 0) return
    if (!isMountedRef.current) return

    setIsLoadingMore(true)

    try {
      const normalizedJid: BareJID = normalizeJID(jid)
      const oldestMessage = messagesRaw[0]

      // Carica messaggi più vecchi del primo attuale (dalla cache)
          const olderMessages = await messageRepository.getForConversation(normalizedJid, {
        before: oldestMessage.timestamp,
        limit: PAGINATION.DEFAULT_MESSAGE_LIMIT,
      })

      if (!isMountedRef.current) return

      if (olderMessages.length > 0) {
        // Aggiungi messaggi più vecchi all'inizio
        safeSetMessages([...olderMessages, ...messagesRaw])
        // Se abbiamo meno messaggi del limit, non ci sono altri messaggi
        setHasMoreMessages(olderMessages.length >= PAGINATION.DEFAULT_MESSAGE_LIMIT)
      } else {
        setHasMoreMessages(false)
      }
    } catch (err) {
      console.error('Errore nel caricamento messaggi precedenti:', err)
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false)
      }
    }
  }, [jid, isLoadingMore, hasMoreMessages, messagesRaw, safeSetMessages])

  // Invia un messaggio (semplificato: no sync, solo save)
  const sendMessage = useCallback(
    async (body: string): Promise<{ success: boolean; error?: string }> => {
      if (!client || !body.trim()) {
        return { success: false, error: 'Messaggio vuoto o client non disponibile' }
      }

      setError(null)

      try {
        // sendMessageService ora NON fa sync, solo invia e salva nel DB
        const result = await sendMessageService(client, jid, body)

        if (!isMountedRef.current) return { success: false }

        if (!result.success) {
          setError(result.error || 'Invio fallito')
        }

        // L'observer del messageRepository notificherà automaticamente la UI

        return result
      } catch (err) {
        console.error('Errore nell\'invio:', err)
        const errorMsg = err instanceof Error ? err.message : 'Errore nell\'invio del messaggio'
        if (isMountedRef.current) {
          setError(errorMsg)
        }
        return { success: false, error: errorMsg }
      }
    },
    [client, jid]
  )

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    error,
    sendMessage,
    loadMoreMessages,
    setError,
  }
}
