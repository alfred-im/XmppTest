/**
 * Service per tracciare lo stato di sincronizzazione globale
 * Usato per mostrare indicatori UI (spinner, ecc.)
 */

type SyncStatusListener = (isSyncing: boolean) => void

class SyncStatusService {
  private isSyncing = false
  private listeners: Set<SyncStatusListener> = new Set()

  /**
   * Imposta stato di sincronizzazione
   */
  setSyncing(syncing: boolean) {
    if (this.isSyncing !== syncing) {
      this.isSyncing = syncing
      this.notifyListeners()
    }
  }

  /**
   * Ottieni stato corrente
   */
  getIsSyncing(): boolean {
    return this.isSyncing
  }

  /**
   * Registra listener per cambiamenti
   */
  subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener)
    
    // Ritorna funzione per unsubscribe
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Notifica tutti i listener
   */
  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.isSyncing)
      } catch (error) {
        console.error('Errore nel listener sync status:', error)
      }
    })
  }
}

export const syncStatusService = new SyncStatusService()
