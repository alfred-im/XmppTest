/**
 * Repository Layer
 * 
 * Separazione tra data access e business logic.
 * Ogni repository garantisce:
 * - Transazioni atomiche
 * - Gestione errori centralizzata
 * - De-duplicazione automatica
 * - Retry logic (futuro)
 */

export { ConversationRepository } from './ConversationRepository'
export { MessageRepository } from './MessageRepository'
export { VCardRepository } from './VCardRepository'
export { MetadataRepository } from './MetadataRepository'
export type { SyncMetadata } from './MetadataRepository'

/**
 * Istanze singleton dei repository per observer pattern
 * MessageRepository usa eventi per notificare cambiamenti real-time
 */
import { MessageRepository } from './MessageRepository'
import { ConversationRepository } from './ConversationRepository'
import { MetadataRepository } from './MetadataRepository'
import { VCardRepository } from './VCardRepository'

export const messageRepository = new MessageRepository()
export const conversationRepository = new ConversationRepository()
export const metadataRepository = new MetadataRepository()
export const vcardRepository = new VCardRepository()
