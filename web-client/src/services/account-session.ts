import { setAccountContext } from './conversations-db'
import { resetMamSyncState } from './mam-sync'
import { normalizeJID } from '../utils/jid'

type AccountChangeListener = () => void

const listeners = new Set<AccountChangeListener>()

/**
 * Registra un listener invocato al cambio account attivo.
 * Usato per resettare solo lo stato in memoria (non il database).
 */
export function onAccountChanged(listener: AccountChangeListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notifyAccountChanged(): void {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch (error) {
      console.error('Errore listener cambio account:', error)
    }
  })
}

/**
 * Imposta l'account attivo e apre il relativo database IndexedDB.
 * Ogni account ha il proprio DB: lo storico non viene mai cancellato al logout.
 */
export function switchAccountContext(ownerJid: string | null): void {
  const normalized = ownerJid ? normalizeJID(ownerJid) : null
  resetMamSyncState()
  setAccountContext(normalized)
  notifyAccountChanged()
}
