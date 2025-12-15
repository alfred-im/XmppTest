import type { Agent } from 'stanza'
import { downloadAllConversations, enrichWithRoster } from './conversations'
import { getVCardsForJids } from './vcard'

// Import singleton instances from repositories
import { conversationRepository, metadataRepository } from './repositories'

interface SyncProgress {
  phase: 'check' | 'full' | 'incremental' | 'vcard' | 'complete'
  message: string
  current?: number
  total?: number
}

type ProgressCallback = (progress: SyncProgress) => void

// Use singleton instances
const conversationRepo = conversationRepository
const metadataRepo = metadataRepository

/**
 * Controlla se il database è vuoto
 */
async function isDatabaseEmpty(): Promise<boolean> {
  const conversations = await conversationRepo.getAll()
  return conversations.length === 0
}

/**
 * Esegue full sync: scarica tutto lo storico
 */
async function performFullSync(
  client: Agent,
  onProgress: ProgressCallback
): Promise<void> {
  onProgress({ phase: 'full', message: 'Scaricamento conversazioni...' })

  // 1. Scarica tutte le conversazioni (con saveMessages=true per scaricare anche i messaggi)
  const { conversations, lastToken } = await downloadAllConversations(client, true)

  onProgress({
    phase: 'full',
    message: `Salvate ${conversations.length} conversazioni...`,
  })

  // 2. Salva conversazioni
  await conversationRepo.saveAll(conversations)

  // 3. Scarica vCard per tutti i contatti
  onProgress({ phase: 'vcard', message: 'Caricamento profili contatti...' })
  const jids = conversations.map((c) => c.jid)
  if (jids.length > 0) {
    await getVCardsForJids(client, jids, true)

    // 4. Arricchisci conversazioni con vCard
    const enriched = await enrichWithRoster(client, conversations, true)
    await conversationRepo.saveAll(enriched)
  }

  // 5. Salva metadata con marker
  await metadataRepo.save({
    lastSync: new Date(),
    lastRSMToken: lastToken,
    isInitialSyncComplete: true,
    initialSyncCompletedAt: new Date(),
  })

  console.log(`✅ Full sync completata: ${conversations.length} conversazioni`)
}

/**
 * Esegue incremental sync: scarica solo messaggi nuovi dopo marker
 */
async function performIncrementalSync(
  client: Agent,
  onProgress: ProgressCallback
): Promise<void> {
  onProgress({ phase: 'incremental', message: 'Controllo nuovi messaggi...' })

  const metadata = await metadataRepo.get()
  if (!metadata?.lastRSMToken) {
    console.warn('⚠️ Nessun marker trovato, eseguo full sync')
    return performFullSync(client, onProgress)
  }

  // 1. Carica conversazioni esistenti
  const conversations = await conversationRepo.getAll()

  onProgress({
    phase: 'incremental',
    message: `Controllo aggiornamenti per ${conversations.length} conversazioni...`,
  })

  // 2. Per ogni conversazione, scarica solo i nuovi messaggi
  let totalNewMessages = 0
  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i]
    const conversationToken = metadata.conversationTokens?.[conv.jid]

    onProgress({
      phase: 'incremental',
      message: `Sincronizzazione ${i + 1}/${conversations.length}...`,
      current: i + 1,
      total: conversations.length,
    })

    if (conversationToken) {
      try {
        // Usa loadMessagesForContact con afterToken per incremental
        const { loadMessagesForContact } = await import('./messages')
        const result = await loadMessagesForContact(client, conv.jid, {
          afterToken: conversationToken,
          maxResults: 100, // Assume max 100 nuovi messaggi per conversazione
        })

        if (result.messages.length > 0) {
          totalNewMessages += result.messages.length

          // Aggiorna lastMessage della conversazione se necessario
          const lastMessage = result.messages[result.messages.length - 1]
          await conversationRepo.update(conv.jid, {
            lastMessage: {
              body: lastMessage.body,
              timestamp: lastMessage.timestamp,
              from: lastMessage.from,
              messageId: lastMessage.messageId,
            },
            updatedAt: lastMessage.timestamp,
          })

          // Aggiorna token per questa conversazione
          if (result.lastToken) {
            const currentMetadata = await metadataRepo.get()
            await metadataRepo.save({
              ...currentMetadata!,
              conversationTokens: {
                ...currentMetadata?.conversationTokens,
                [conv.jid]: result.lastToken
              }
            })
          }
        }
      } catch (error) {
        console.error(`Errore sync incrementale per ${conv.jid}:`, error)
        // Continua con le altre conversazioni
      }
    }
  }

  // 3. Aggiorna metadata globale
  await metadataRepo.updateLastSync()

  console.log(`✅ Incremental sync completata: ${totalNewMessages} nuovi messaggi`)
}

/**
 * Funzione principale: esegue sync iniziale (full o incremental)
 * Questo è l'UNICO punto dove avviene la sincronizzazione.
 */
export async function performInitialSync(
  client: Agent,
  onProgress: ProgressCallback = () => {}
): Promise<void> {
  try {
    onProgress({ phase: 'check', message: 'Controllo stato database...' })

    // 1. Controlla se DB è vuoto
    const isEmpty = await isDatabaseEmpty()

    if (isEmpty) {
      // DB vuoto: full sync
      console.log('🔄 Database vuoto, eseguo full sync...')
      await performFullSync(client, onProgress)
    } else {
      // DB popolato: incremental sync
      console.log('📬 Database popolato, eseguo incremental sync...')
      await performIncrementalSync(client, onProgress)
    }

    onProgress({ phase: 'complete', message: 'Sincronizzazione completata' })
  } catch (error) {
    console.error('❌ Errore durante sync iniziale:', error)
    throw error
  }
}

/**
 * Esporta anche metadataRepo per uso esterno (es: svuota DB)
 */
export { metadataRepo }
