/**
 * Servizio per gestire la persistenza delle credenziali per auto-login.
 * Usa localStorage per salvare JID e password tra sessioni browser.
 * Le credenziali persistono anche dopo chiusura browser per auto-login.
 * 
 * NOTA SICUREZZA: Le credenziali sono salvate in localStorage in plain text.
 * Questo è un compromesso per abilitare auto-login. Per maggiore sicurezza,
 * considerare l'uso di encryption o token-based authentication.
 */

import { STORAGE_KEYS } from '../config/constants'

const STORAGE_KEY_JID = STORAGE_KEYS.JID
const STORAGE_KEY_PASSWORD = STORAGE_KEYS.PASSWORD

export interface SavedCredentials {
  jid: string
  password: string
}

/**
 * Salva le credenziali in localStorage per auto-login
 */
export function saveCredentials(jid: string, password: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_JID, jid)
    localStorage.setItem(STORAGE_KEY_PASSWORD, password)
  } catch (error) {
    console.error('Errore nel salvataggio delle credenziali:', error)
  }
}

/**
 * Carica le credenziali salvate da localStorage
 */
export function loadCredentials(): SavedCredentials | null {
  try {
    const jid = localStorage.getItem(STORAGE_KEY_JID)
    const password = localStorage.getItem(STORAGE_KEY_PASSWORD)
    
    if (jid && password) {
      return { jid, password }
    }
    return null
  } catch (error) {
    console.error('Errore nel caricamento delle credenziali:', error)
    return null
  }
}

/**
 * Cancella le credenziali salvate
 */
export function clearCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_JID)
    localStorage.removeItem(STORAGE_KEY_PASSWORD)
  } catch (error) {
    console.error('Errore nella cancellazione delle credenziali:', error)
  }
}

/**
 * Verifica se ci sono credenziali salvate
 */
export function hasSavedCredentials(): boolean {
  try {
    const jid = localStorage.getItem(STORAGE_KEY_JID)
    const password = localStorage.getItem(STORAGE_KEY_PASSWORD)
    return !!(jid && password)
  } catch (error) {
    console.error('Errore nella verifica delle credenziali:', error)
    return false
  }
}
