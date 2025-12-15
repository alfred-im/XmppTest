import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Conversation } from '../services/conversations-db'
import { ConversationRepository } from '../services/repositories'

interface ConversationsContextType {
  conversations: Conversation[]
  isLoading: boolean
  error: string | null
  reloadFromDB: () => Promise<void>
  markAsRead: (jid: string) => Promise<void>
}

const ConversationsContext = createContext<ConversationsContextType | undefined>(undefined)

/**
 * ConversationsProvider - Gestisce stato conversazioni
 * 
 * ARCHITETTURA SEMPLIFICATA:
 * - NON carica più dal server (sync gestita da AppInitializer)
 * - Carica solo da cache locale
 * - Si aggiorna automaticamente quando cambiano i dati (via reloadFromDB)
 * - NO più pull-to-refresh o refreshAll
 */
export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const conversationRepo = new ConversationRepository()

  // Carica conversazioni dalla cache al mount
  useEffect(() => {
    const loadFromCache = async () => {
      setIsLoading(true)
      try {
        const cached = await conversationRepo.getAll()
        setConversations(cached)
      } catch (err) {
        console.error('Errore caricamento cache conversazioni:', err)
        setError(err instanceof Error ? err.message : 'Errore nel caricamento')
      } finally {
        setIsLoading(false)
      }
    }

    loadFromCache()
  }, [])

  // Ricarica conversazioni dal DB (chiamato dopo aggiornamenti)
  const reloadFromDB = useCallback(async () => {
    try {
      const updated = await conversationRepo.getAll()
      setConversations(updated)
    } catch (error) {
      console.error('Errore ricaricamento conversazioni:', error)
    }
  }, [])

  // Marca conversazione come letta
  const markAsRead = useCallback(async (conversationJid: string) => {
    try {
      await conversationRepo.markAsRead(conversationJid)
      await reloadFromDB()
    } catch (error) {
      console.error('Errore marcatura conversazione:', error)
    }
  }, [reloadFromDB])

  return (
    <ConversationsContext.Provider
      value={{
        conversations,
        isLoading,
        error,
        reloadFromDB,
        markAsRead,
      }}
    >
      {children}
    </ConversationsContext.Provider>
  )
}

export function useConversations() {
  const context = useContext(ConversationsContext)
  if (context === undefined) {
    throw new Error('useConversations deve essere usato dentro ConversationsProvider')
  }
  return context
}
