/**
 * Utility functions per la gestione e normalizzazione dei JID (Jabber Identifiers)
 * 
 * Un JID ha il formato: [local@]domain[/resource]
 * Esempio: user@example.com/resource
 * 
 * Questo file re-esporta i tipi e le funzioni dal nuovo sistema tipizzato
 * e fornisce wrapper per retrocompatibilità con codice esistente
 */

// Re-export tutto dal nuovo sistema tipizzato
export {
  type JID,
  type BareJID,
  type ParsedJID,
  InvalidJIDError,
  createJID,
  createBareJID,
  tryCreateJID,
  tryCreateBareJID,
  isValidJID,
  normalizeJID,
  parseJID,
  getDomain,
  getLocal,
  getResource,
  toBareJID,
  withResource,
  areJIDsEqual,
  isSelfChat,
} from '../types/jid'

// Wrapper per retrocompatibilità con nomi legacy
import {
  normalizeJID as normalizeJIDNew,
  isValidJID as isValidJIDNew,
  parseJID as parseJIDNew,
} from '../types/jid'

/**
 * @deprecated Usa normalizeJID da '../types/jid'
 */
export function normalizeJid(jid: string): string {
  return normalizeJIDNew(jid)
}

/**
 * @deprecated Usa isValidJID da '../types/jid'
 */
export function isValidJid(jid: string): boolean {
  return isValidJIDNew(jid)
}

/**
 * @deprecated Usa parseJID da '../types/jid'
 */
export function parseJid(jid: string): {
  username: string
  domain: string
  resource?: string
} {
  const parsed = parseJIDNew(jid)
  return {
    username: parsed.local || '',
    domain: parsed.domain,
    resource: parsed.resource,
  }
}

/**
 * @deprecated Usa toBareJID da '../types/jid'
 */
export function getBareJid(jid: string): string {
  return normalizeJIDNew(jid)
}
