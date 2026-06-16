/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Agent } from 'stanza'
import { login as xmppLogin } from '../services/xmpp'
import { flushOutbox } from '../services/outbox-send'
import { switchAccountContext } from '../services/account-session'
import { normalizeJID } from '../utils/jid'
import { useAuth } from './AuthContext'
import { loadCredentials } from '../services/auth-storage'

interface ConnectionContextType {
  client: Agent | null
  isConnected: boolean
  isConnecting: boolean
  jid: string | null
  error: string | null
  connect: (jid: string, password: string) => Promise<{ success: boolean; error?: string }>
  disconnect: () => void
  clearError: () => void
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined)

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const { login: saveAuth, logout: clearAuth } = useAuth()
  const didInitAccountContext = useRef(false)

  if (!didInitAccountContext.current) {
    const savedCredentials = loadCredentials()
    if (savedCredentials) {
      switchAccountContext(normalizeJID(savedCredentials.jid))
    }
    didInitAccountContext.current = true
  }

  const [client, setClient] = useState<Agent | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [jid, setJid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasAttemptedAutoLogin = useRef(false)

  // Auto-login: tenta connessione automatica con credenziali salvate
  useEffect(() => {
    // Esegue solo una volta all'avvio
    if (hasAttemptedAutoLogin.current) return
    hasAttemptedAutoLogin.current = true

    const attemptAutoLogin = async () => {
      console.log('🔄 Controllo credenziali salvate per auto-login...')
      
      const savedCredentials = loadCredentials()
      
      if (!savedCredentials) {
        console.log('❌ Nessuna credenziale salvata, auto-login saltato')
        return
      }

      console.log('✅ Credenziali trovate, tentativo auto-login per:', savedCredentials.jid)
      
      // Tenta auto-login
      const result = await connect(savedCredentials.jid, savedCredentials.password)
      
      if (result.success) {
        console.log('✅ Auto-login completato con successo')
      } else {
        console.log('❌ Auto-login fallito - credenziali non più valide')
      }
    }

    attemptAutoLogin()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Note: connect è stabile (useCallback), non serve nelle deps

  // Handler per disconnessione
  useEffect(() => {
    if (!client || !isConnected) return

    const handleDisconnected = () => {
      setIsConnected(false)
      setClient(null)
      setJid(null)
    }

    client.on('disconnected', handleDisconnected)

    return () => {
      client.off('disconnected', handleDisconnected)
    }
  }, [client, isConnected])

  const connect = useCallback(async (userJid: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedJid = normalizeJID(userJid)
    switchAccountContext(normalizedJid)

    setIsConnecting(true)
    setError(null)

    try {
      const result = await xmppLogin({ jid: userJid, password })

      if (!result.success || !result.client) {
        throw new Error(result.message || 'Login fallito')
      }

      const xmppClient = result.client
      const connectedJid = normalizeJID(result.jid || userJid)
      if (connectedJid !== normalizedJid) {
        switchAccountContext(connectedJid)
      }

      setClient(xmppClient)
      setIsConnected(true)
      setJid(result.jid || userJid)
      
      // CRITICO: Invia presenza XMPP per annunciare che siamo online
      // Senza questo, il server non inoltra i messaggi in tempo reale
      xmppClient.sendPresence()
      console.log('📡 Presenza XMPP inviata - client online')

      await flushOutbox(xmppClient)
      
      // Salva credenziali
      saveAuth(userJid, password)
      
      setIsConnecting(false)
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore di connessione'
      setError(errorMessage)
      clearAuth()
      switchAccountContext(null)
      setIsConnecting(false)
      return { success: false, error: errorMessage }
    }
  }, [saveAuth, clearAuth])

  const disconnect = useCallback(() => {
    switchAccountContext(null)

    if (client) {
      client.disconnect()
    }
    setClient(null)
    setIsConnected(false)
    setJid(null)
    clearAuth()
  }, [client, clearAuth])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <ConnectionContext.Provider
      value={{
        client,
        isConnected,
        isConnecting,
        jid,
        error,
        connect,
        disconnect,
        clearError,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection() {
  const context = useContext(ConnectionContext)
  if (context === undefined) {
    throw new Error('useConnection deve essere usato dentro ConnectionProvider')
  }
  return context
}
