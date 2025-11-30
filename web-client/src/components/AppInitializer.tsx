import { useEffect, useState, useRef } from 'react'
import { loadCredentials } from '../services/auth-storage'

/**
 * Componente che gestisce l'inizializzazione automatica dell'app
 * NOTA: L'auto-login è ora gestito direttamente dal XmppMediator
 * Questo componente è mantenuto solo per compatibilità
 */
export function AppInitializer({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

interface AppInitializerWithCallbackProps {
  children: (props: { isInitializing: boolean }) => React.ReactNode
}

/**
 * Versione con callback per gestire lo stato di inizializzazione
 * L'auto-login è gestito dal XmppMediator, questo componente
 * gestisce solo lo stato di inizializzazione per l'UI
 */
export function AppInitializerWithCallback({ children }: AppInitializerWithCallbackProps) {
  const [isInitializing, setIsInitializing] = useState(true)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const initialize = async () => {
      setIsInitializing(true)

      // Controlla se ci sono credenziali salvate
      const saved = loadCredentials()
      
      // Aspetta un attimo per permettere al Mediator di fare auto-login
      if (saved) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      setIsInitializing(false)
    }

    initialize()
  }, [])

  return <>{children({ isInitializing })}</>
}
