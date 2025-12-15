import { ReactNode, useEffect, useState } from 'react'
import { useConnection } from '../contexts/ConnectionContext'
import { SplashScreen } from './SplashScreen'
import { performInitialSync } from '../services/sync-initializer'
import { syncStatusService } from '../services/sync-status'

interface AppInitializerProps {
  children: ReactNode
}

/**
 * Componente wrapper che gestisce la sincronizzazione iniziale
 * - All'avvio: controlla se DB vuoto → full sync o incremental sync
 * - Dopo sync: attiva listener real-time e passa al rendering normale
 * 
 * Questo è l'UNICO punto dove avviene la sincronizzazione.
 * Dopo la sync iniziale, l'app riceve solo messaggi real-time.
 */
export function AppInitializer({ children }: AppInitializerProps) {
  const [syncStatus, setSyncStatus] = useState<'pending' | 'syncing' | 'complete' | 'error'>('pending')
  const [syncMessage, setSyncMessage] = useState('Connessione...')
  const [error, setError] = useState<string | null>(null)
  const { client, isConnected } = useConnection()

  useEffect(() => {
    if (!client || !isConnected) {
      setSyncStatus('pending')
      setSyncMessage('Connessione al server...')
      syncStatusService.setSyncing(false)
      return
    }

    async function initializeApp() {
      setSyncStatus('syncing')
      setSyncMessage('Sincronizzazione...')
      setError(null)
      syncStatusService.setSyncing(true)

      try {
        await performInitialSync(client, (progress) => {
          setSyncMessage(progress.message)
        })

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

  // Mostra splash screen durante sync
  if (syncStatus !== 'complete') {
    return (
      <SplashScreen 
        message={error || syncMessage}
        error={!!error}
      />
    )
  }

  // Sync completata: renderizza app normale
  return <>{children}</>
}
