import { useEffect, useState, useRef, type ReactNode } from 'react'
import { useConnection } from '../contexts/ConnectionContext'
import { SplashScreen } from './SplashScreen'
import { performInitialSync } from '../services/sync-initializer'
import { syncStatusService } from '../services/sync-status'

interface AppInitializerProps {
  children: ReactNode
}

/**
 * Componente wrapper che gestisce la sincronizzazione iniziale
 * - Se non connesso: mostra i children (per permettere login via LoginPopup)
 * - Dopo connessione: esegue sync (full o incremental)
 * - Durante sync: mostra SplashScreen sopra i children
 * - Dopo sync: mostra children normalmente
 * 
 * Questo è l'UNICO punto dove avviene la sincronizzazione.
 * Dopo la sync iniziale, l'app riceve solo messaggi real-time.
 */
export function AppInitializer({ children }: AppInitializerProps) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'complete' | 'error'>('idle')
  const [syncMessage, setSyncMessage] = useState('Sincronizzazione...')
  const [error, setError] = useState<string | null>(null)
  const { client, isConnected } = useConnection()
  const hasSyncedRef = useRef(false)

  useEffect(() => {
    // Se non connesso, non fare nulla
    if (!client || !isConnected) {
      syncStatusService.setSyncing(false)
      return
    }

    // Se già sincronizzato in questa sessione, non risincronizzare
    if (hasSyncedRef.current) {
      return
    }

    async function initializeApp() {
      setSyncStatus('syncing')
      setSyncMessage('Sincronizzazione...')
      setError(null)
      syncStatusService.setSyncing(true)

      try {
        if (client) {
          await performInitialSync(client, (progress) => {
            setSyncMessage(progress.message)
          })
        }

        hasSyncedRef.current = true
        setSyncStatus('complete')
        syncStatusService.setSyncing(false)
        console.log('✅ Sync completata, app pronta')
      } catch (err) {
        console.error('❌ Errore sync iniziale:', err)
        setSyncStatus('error')
        syncStatusService.setSyncing(false)
        setError(err instanceof Error ? err.message : 'Errore durante la sincronizzazione')
      }
    }

    initializeApp()
  }, [client, isConnected])

  // Se non connesso: mostra children (LoginPopup può apparire)
  if (!isConnected) {
    return <>{children}</>
  }

  // Se connesso e sync in corso: mostra splash screen
  if (syncStatus === 'syncing') {
    return (
      <SplashScreen 
        message={syncMessage}
        error={false}
      />
    )
  }

  // Se errore durante sync: mostra errore
  if (syncStatus === 'error') {
    return (
      <SplashScreen 
        message={error || 'Errore durante la sincronizzazione'}
        error={true}
      />
    )
  }

  // Sync completata o idle: renderizza app normale
  return <>{children}</>
}
