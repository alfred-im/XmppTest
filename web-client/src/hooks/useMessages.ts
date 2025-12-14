import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Agent } from 'stanza'
import {
  loadMessagesForContact,
  sendMessage as sendMessageService,
  getLocalMessages,
  reloadAllMessagesFromServer,
  applySelfChatLogic,
  type Message,
} from '../services/messages'
import { mergeMessages } from '../utils/message'
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
  firstToken: string | undefined
  sendMessage: (body: string) => Promise<{ success: boolean; error?: string }>
  loadMoreMessages: () => Promise<void>
  reloadAllMessages: () => Promise<void>
  setError: (error: string | null) => void
}

/**
 * Custom hook per gestire i messaggi di una conversazione
 * Gestisce caricamento, invio, paginazione e sincronizzazione con il server
 * 
 * @param options - Opzioni di configurazione
 * @param options.jid - JID del contatto per cui gestire i messaggi
 * @param options.client - Client XMPP connesso
 * @param options.isConnected - Flag di connessione
 * @returns Oggetto con stato e funzioni per gestire i messaggi
 * 
 * @example
 * ```tsx
 * const { messages, sendMessage, isLoading } = useMessages({
 *   jid: 'user@example.com',
 *   client,
 *   isConnected: true
 * })
 * ```
 */
export function useMessages({
  jid,
  client,
  isConnected,
}: UseMessagesOptions): UseMessagesReturn {
  const [messagesRaw, setMessagesRaw] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [firstToken, setFirstToken] = useState<string | undefined>(undefined)
  
  const isMountedRef = useRef(true)
  
  // Flag per ignorare notifiche observer durante operazioni di caricamento
  // (evita doppi refresh quando loadMessagesForContact salva nel DB)
  const skipObserverRef = useRef(false)

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
  const safeSetMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    if (isMountedRef.current) {
      setMessagesRaw(updater)
    }
  }, [])

  // Carica messaggi iniziali
  const loadInitialMessages = useCallback(async () => {
    if (!client || !jid) return
    if (!isMountedRef.current) return

    // Ignora notifiche observer durante il caricamento iniziale
    skipObserverRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      // Prima carica dalla cache locale (veloce)
      const normalizedJid = normalizeJID(jid)
      const localMessages = await getLocalMessages(normalizedJid, { limit: PAGINATION.DEFAULT_MESSAGE_LIMIT })
      if (localMessages.length > 0 && isMountedRef.current) {
        safeSetMessages(() => localMessages)
        setIsLoading(false)
      }

      // Poi carica dal server in background
      const result = await loadMessagesForContact(client, jid, {
        maxResults: PAGINATION.DEFAULT_MESSAGE_LIMIT,
      })

      if (!isMountedRef.current) return

      // Merge con messaggi esistenti per evitare sostituzione brusca
      safeSetMessages((prev) => mergeMessages(prev, result.messages))
      setHasMoreMessages(!result.complete)
      setFirstToken(result.firstToken)
    } catch (err) {
      console.error('Errore nel caricamento messaggi:', err)
      if (isMountedRef.current) {
        setError('Impossibile caricare i messaggi')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
      // Riabilita notifiche observer
      skipObserverRef.current = false
    }
  }, [client, jid, safeSetMessages])

  // Carica messaggi iniziali quando cambia jid o client
  useEffect(() => {
    if (client && isConnected && jid) {
      loadInitialMessages()
    }
  }, [client, isConnected, jid, loadInitialMessages])

  // Osserva i cambiamenti del database per questa conversazione (pattern Observer)
  // Quando arriva un messaggio XMPP → viene salvato nel DB → questo listener si attiva → UI aggiornata
  useEffect(() => {
    if (!jid) return

    const normalizedJid: BareJID = normalizeJID(jid)
    
    console.log(`👀 useMessages: registro observer per ${normalizedJid}`)
    
    // Callback chiamato quando il database cambia
    const handleDatabaseChange = async (conversationJid: BareJID) => {
      if (!isMountedRef.current) return
      
      // Ignora notifiche durante il caricamento iniziale (evita doppio refresh)
      if (skipObserverRef.current) {
        console.log(`⏭️ useMessages: ignoro notifica observer durante caricamento iniziale`)
        return
      }

      console.log(`🔄 useMessages: database cambiato per ${conversationJid}, ricarico messaggi...`)
      
      try {
        // Ricarica messaggi dal database locale
        const allMessages = await getLocalMessages(conversationJid)
        
        console.log(`   - Caricati ${allMessages.length} messaggi dal DB`)
        
        if (isMountedRef.current) {
          safeSetMessages(() => allMessages)
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

  // NOTA: L'aggiornamento dei messaggi in tempo reale è gestito interamente
  // dal pattern Observer implementato sopra (messageRepository.observe).
  // Quando MessagingContext riceve un messaggio → salva nel DB → 
  // MessageRepository notifica questo hook → UI si aggiorna.
  // Non serve un handler diretto client.on('message') qui.

  // Carica più messaggi (paginazione)
  const loadMoreMessages = useCallback(async () => {
    if (!client || isLoadingMore || !hasMoreMessages || !firstToken) return
    if (!isMountedRef.current) return

    // Ignora notifiche observer durante loadMore
    skipObserverRef.current = true
    setIsLoadingMore(true)

    try {
      // Usa il token RSM corretto per caricare messaggi PRIMA del primo attuale
      const result = await loadMessagesForContact(client, jid, {
        maxResults: PAGINATION.DEFAULT_MESSAGE_LIMIT,
        beforeToken: firstToken,
      })

      if (!isMountedRef.current) return

      if (result.messages.length > 0) {
        // Merge invece di semplice concatenazione per evitare duplicati
        safeSetMessages((prev) => mergeMessages(result.messages, prev))
        setHasMoreMessages(!result.complete)
        setFirstToken(result.firstToken)
      } else {
        setHasMoreMessages(false)
      }
    } catch (err) {
      console.error('Errore nel caricamento messaggi precedenti:', err)
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false)
      }
      // Riabilita notifiche observer
      skipObserverRef.current = false
    }
  }, [client, jid, isLoadingMore, hasMoreMessages, firstToken, safeSetMessages])

  // Ricarica tutti i messaggi dal server
  const reloadAllMessages = useCallback(async () => {
    if (!client || !jid) return
    if (!isMountedRef.current) return

    setError(null)

    try {
      // Ricarica tutto dal server (salva TUTTI i messaggi nel DB, inclusi ping/token/visualizzazioni)
      const serverMessages = await reloadAllMessagesFromServer(client, jid)

      if (isMountedRef.current) {
        // Filtra solo messaggi con body per la visualizzazione nella UI
        // (i messaggi vuoti rimangono salvati nel DB per altre funzionalità)
        const messagesToShow = serverMessages.filter(msg => msg.body && msg.body.trim().length > 0)
        setMessagesRaw(messagesToShow)
        setHasMoreMessages(false)
        setFirstToken(undefined)
      }
    } catch (err) {
      console.error('Errore nel reload completo messaggi:', err)
      if (isMountedRef.current) {
        setError('Impossibile ricaricare i messaggi')
      }
    }
  }, [client, jid])

  // Invia un messaggio usando il sistema di sincronizzazione
  const sendMessage = useCallback(
    async (body: string): Promise<{ success: boolean; error?: string }> => {
      if (!client || !body.trim()) {
        return { success: false, error: 'Messaggio vuoto o client non disponibile' }
      }

      setError(null)

      try {
        // sendMessageService ora usa il sistema di sincronizzazione:
        // 1. Invia al server
        // 2. Aspetta conferma
        // 3. Sincronizza tutto dal server (scaricando e salvando nel DB)
        const result = await sendMessageService(client, jid, body)

        if (!isMountedRef.current) return { success: false }

        if (result.success) {
          // Dopo la sincronizzazione, ricarica tutti i messaggi dal DB locale
          // (che ora contiene i dati sincronizzati dal server)
          const normalizedJid = normalizeJID(jid)
          const allMessages = await getLocalMessages(normalizedJid)

          if (isMountedRef.current) {
            safeSetMessages(() => allMessages)
          }
        } else {
          setError(result.error || 'Invio fallito')
        }

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
    [client, jid, safeSetMessages]
  )


  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    error,
    firstToken,
    sendMessage,
    loadMoreMessages,
    reloadAllMessages,
    setError,
  }
}
