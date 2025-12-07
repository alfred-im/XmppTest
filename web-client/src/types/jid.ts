/**
 * Tipo opaco per JID validati
 * Un JID (Jabber ID) ha il formato: [local@]domain[/resource]
 * 
 * Esempi validi:
 * - user@example.com
 * - user@example.com/resource
 * - example.com (domain only)
 * 
 * Questo tipo garantisce che ogni JID sia stato validato alla creazione
 */

// Tipo opaco: una stringa che è stata validata come JID
export type JID = string & { readonly __brand: 'JID' }

// Tipo opaco per JID normalizzato (bare JID senza resource)
export type BareJID = string & { readonly __brand: 'BareJID' }

/**
 * Errore lanciato quando un JID non è valido
 */
export class InvalidJIDError extends Error {
  constructor(jid: string, reason?: string) {
    super(reason ? `JID non valido "${jid}": ${reason}` : `JID non valido: "${jid}"`)
    this.name = 'InvalidJIDError'
  }
}

/**
 * Componenti di un JID parsato
 */
export interface ParsedJID {
  local?: string    // parte prima di @
  domain: string    // dominio (obbligatorio)
  resource?: string // parte dopo /
  bare: BareJID     // JID senza resource (local@domain o domain)
  full: JID         // JID completo
}

/**
 * Regex per validare un JID secondo RFC 6122
 * Semplificata ma corretta per i casi comuni
 */
const JID_REGEX = /^(?:([^@/<>'\"]+)@)?([^@/<>'\"]+)(?:\/(.+))?$/

/**
 * Valida il formato di un JID
 * @throws {InvalidJIDError} Se il JID non è valido
 */
function validateJIDFormat(jid: string): void {
  if (!jid || typeof jid !== 'string') {
    throw new InvalidJIDError(jid, 'JID vuoto o non stringa')
  }

  if (jid.trim() !== jid) {
    throw new InvalidJIDError(jid, 'JID contiene spazi all\'inizio o alla fine')
  }

  if (!JID_REGEX.test(jid)) {
    throw new InvalidJIDError(jid, 'Formato non valido')
  }

  const [, local, domain, resource] = JID_REGEX.exec(jid)!

  // Verifica dominio (obbligatorio)
  if (!domain || domain.length === 0) {
    throw new InvalidJIDError(jid, 'Dominio mancante')
  }

  // Verifica che il dominio contenga almeno un punto o sia "localhost"
  if (domain !== 'localhost' && !domain.includes('.')) {
    throw new InvalidJIDError(jid, 'Dominio non valido (deve contenere un punto)')
  }

  // Verifica lunghezze (RFC 6122)
  if (local && local.length > 1023) {
    throw new InvalidJIDError(jid, 'Parte locale troppo lunga (max 1023)')
  }

  if (domain.length > 1023) {
    throw new InvalidJIDError(jid, 'Dominio troppo lungo (max 1023)')
  }

  if (resource && resource.length > 1023) {
    throw new InvalidJIDError(jid, 'Resource troppo lunga (max 1023)')
  }
}

/**
 * Crea un JID validato da una stringa
 * @throws {InvalidJIDError} Se il JID non è valido
 */
export function createJID(jid: string): JID {
  validateJIDFormat(jid)
  return jid as JID
}

/**
 * Crea un BareJID (senza resource) da una stringa
 * @throws {InvalidJIDError} Se il JID non è valido
 */
export function createBareJID(jid: string): BareJID {
  validateJIDFormat(jid)
  
  // Rimuovi resource se presente
  const bareJid = jid.split('/')[0]
  return bareJid as BareJID
}

/**
 * Tenta di creare un JID, ritorna null se non valido invece di lanciare eccezione
 */
export function tryCreateJID(jid: string): JID | null {
  try {
    return createJID(jid)
  } catch {
    return null
  }
}

/**
 * Tenta di creare un BareJID, ritorna null se non valido invece di lanciare eccezione
 */
export function tryCreateBareJID(jid: string): BareJID | null {
  try {
    return createBareJID(jid)
  } catch {
    return null
  }
}

/**
 * Verifica se una stringa è un JID valido senza lanciare eccezioni
 */
export function isValidJID(jid: string): jid is JID {
  try {
    validateJIDFormat(jid)
    return true
  } catch {
    return false
  }
}

/**
 * Normalizza un JID rimuovendo la resource e convertendo in lowercase
 * @throws {InvalidJIDError} Se il JID non è valido
 */
export function normalizeJID(jid: string | JID): BareJID {
  // Se è già un JID validato, trust it
  const jidStr = jid as string
  
  // Rimuovi resource (tutto dopo /)
  const bareJid = jidStr.split('/')[0]
  
  // Valida il formato
  validateJIDFormat(bareJid)
  
  // Converti in lowercase (RFC 6122: dominio e local sono case-insensitive)
  return bareJid.toLowerCase() as BareJID
}

/**
 * Parsa un JID nei suoi componenti
 * @throws {InvalidJIDError} Se il JID non è valido
 */
export function parseJID(jid: string | JID): ParsedJID {
  const jidStr = jid as string
  validateJIDFormat(jidStr)

  const match = JID_REGEX.exec(jidStr)!
  const [, local, domain, resource] = match

  const bare = (local ? `${local}@${domain}` : domain).toLowerCase() as BareJID
  const full = jidStr as JID

  return {
    local: local?.toLowerCase(),
    domain: domain.toLowerCase(),
    resource,
    bare,
    full,
  }
}

/**
 * Estrae il dominio da un JID
 * @throws {InvalidJIDError} Se il JID non è valido
 */
export function getDomain(jid: string | JID): string {
  const parsed = parseJID(jid)
  return parsed.domain
}

/**
 * Estrae la parte locale (username) da un JID
 * @throws {InvalidJIDError} Se il JID non è valido
 */
export function getLocal(jid: string | JID): string | undefined {
  const parsed = parseJID(jid)
  return parsed.local
}

/**
 * Estrae la resource da un JID
 * @throws {InvalidJIDError} Se il JID non è valido
 */
export function getResource(jid: string | JID): string | undefined {
  const parsed = parseJID(jid)
  return parsed.resource
}

/**
 * Converte un JID in bare JID (rimuove resource)
 * @throws {InvalidJIDError} Se il JID non è valido
 */
export function toBareJID(jid: string | JID): BareJID {
  return normalizeJID(jid)
}

/**
 * Aggiunge una resource a un bare JID
 * @throws {InvalidJIDError} Se il JID non è valido o la resource non è valida
 */
export function withResource(jid: string | JID, resource: string): JID {
  const bare = toBareJID(jid)
  
  if (!resource || resource.trim() !== resource) {
    throw new InvalidJIDError(`${bare}/${resource}`, 'Resource non valida')
  }
  
  const fullJid = `${bare}/${resource}`
  return createJID(fullJid)
}

/**
 * Confronta due JID per uguaglianza (case-insensitive, ignora resource)
 */
export function areJIDsEqual(jid1: string | JID, jid2: string | JID): boolean {
  try {
    const bare1 = toBareJID(jid1)
    const bare2 = toBareJID(jid2)
    return bare1 === bare2
  } catch {
    return false
  }
}

/**
 * Verifica se un JID è un self-chat (stesso utente)
 */
export function isSelfChat(myJid: string | JID, contactJid: string | JID): boolean {
  return areJIDsEqual(myJid, contactJid)
}
