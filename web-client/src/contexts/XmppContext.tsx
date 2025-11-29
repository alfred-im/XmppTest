import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Agent } from 'stanza'
import type { ReceivedMessage } from 'stanza/protocol'
import { login, type XmppResult } from '../services/xmpp'
import {
  loadAllConversations,
  enrichWithRoster,
  updateConversationOnNewMessage,
} from '../services/conversations'
import { getConversations, type Conversation } from '../services/conversations-db'

interface XmppContextType {
  client: Agent | null
  isConnected: boolean
  jid: string | null
  conversations: Conversation[]
  isLoading: boolean
  error: string | null
  connect: (jid: string, password: string) => Promise<void>
  disconnect: () => void
  refreshConversations: () => Promise<void>
}

const XmppContext = createContext<XmppContextType | undefined>(undefined)

export function XmppProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<Agent | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [jid, setJid] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carica conversazioni dal database locale all'avvio
  useEffect(() => {
    const loadCachedConversations = async () => {
      try {
        const cached = await getConversations()
        setConversations(cached)
      } catch (err) {
        console.error('Errore nel caricamento cache:', err)
      }
    }
    loadCachedConversations()
  }, [])

  // Gestione eventi real-time quando client è connesso
  useEffect(() => {
    if (!client || !isConnected) {
      return
    }

    const handleMessage = async (message: ReceivedMessage) => {
      if (!jid) return

      // Aggiorna conversazione nel database
      if (jid) {
        await updateConversationOnNewMessage(message, jid)
      }

      // Ricarica conversazioni dal database
      const updated = await getConversations()
      setConversations(updated)
    }

    const handleDisconnected = () => {
      setIsConnected(false)
      setClient(null)
      setJid(null)
    }

    client.on('message', handleMessage)
    client.on('disconnected', handleDisconnected)

    return () => {
      client.off('message', handleMessage)
      client.off('disconnected', handleDisconnected)
    }
  }, [client, isConnected, jid])

  const connect = async (jid: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result: XmppResult = await login({ jid, password })

      if (!result.success || !result.client) {
        throw new Error(result.message || 'Login fallito')
      }

      setClient(result.client)
      setIsConnected(true)
      setJid(result.jid || jid)

      // Carica TUTTE le conversazioni dal server (storico completo)
      const loaded = await loadAllConversations(result.client)

      // Arricchisci con dati roster
      const enriched = await enrichWithRoster(result.client, loaded)
      setConversations(enriched)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore di connessione'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const disconnect = () => {
    if (client) {
      client.disconnect()
    }
    setClient(null)
    setIsConnected(false)
    setJid(null)
    setConversations([])
  }

  const refreshConversations = async () => {
    if (!client || !isConnected) {
      return
    }

    setIsLoading(true)
    try {
      // Ricarica TUTTE le conversazioni dal server (storico completo)
      const loaded = await loadAllConversations(client)

      // Arricchisci con dati roster
      const enriched = await enrichWithRoster(client, loaded)
      
      setConversations(enriched)
    } catch (err) {
      console.error('Errore nel refresh conversazioni:', err)
      setError(err instanceof Error ? err.message : 'Errore nel refresh')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <XmppContext.Provider
      value={{
        client,
        isConnected,
        jid,
        conversations,
        isLoading,
        error,
        connect,
        disconnect,
        refreshConversations,
      }}
    >
      {children}
    </XmppContext.Provider>
  )
}

export function useXmpp() {
  const context = useContext(XmppContext)
  if (context === undefined) {
    throw new Error('useXmpp deve essere usato dentro XmppProvider')
  }
  return context
}
