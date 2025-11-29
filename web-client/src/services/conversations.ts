import type { Agent } from 'stanza'
import type { MAMResult, ReceivedMessage } from 'stanza/protocol'
import { saveConversations, updateConversation, getMetadata, saveMetadata, getConversations, removeConversations, type Conversation } from './conversations-db'

// Re-export per comodità
export type { Conversation } from './conversations-db'
export { getConversations } from './conversations-db'

/**
 * Normalizza un JID rimuovendo la resource
 */
function normalizeJid(jid: string): string {
  return jid.split('/')[0].toLowerCase()
}

/**
 * Estrae il JID del contatto da un messaggio MAM
 */
function extractContactJid(msg: MAMResult, myJid: string): string {
  const myBareJid = normalizeJid(myJid)
  const from = msg.item.message?.from || ''
  const to = msg.item.message?.to || ''

  // Se il messaggio è da me, il contatto è il destinatario
  if (from.startsWith(myBareJid)) {
    return normalizeJid(to)
  }
  // Se il messaggio è a me, il contatto è il mittente
  return normalizeJid(from)
}

/**
 * Estrae il corpo del messaggio
 */
function extractMessageBody(msg: MAMResult): string {
  return msg.item.message?.body || ''
}

/**
 * Estrae il timestamp del messaggio
 */
function extractTimestamp(msg: MAMResult): Date {
  const delay = msg.item.message?.delay
  if (delay && typeof delay === 'object' && 'stamp' in delay) {
    const stamp = (delay as { stamp?: string }).stamp
    if (stamp) {
      return new Date(stamp)
    }
  }
  // Fallback: usa data corrente se non disponibile
  return new Date()
}

/**
 * Raggruppa messaggi per contatto e estrae l'ultimo messaggio per ogni contatto
 */
function groupMessagesByContact(messages: MAMResult[], myJid: string): Map<string, MAMResult> {
  const groups = new Map<string, MAMResult[]>()

  // Filtra solo messaggi di tipo chat (non groupchat) e con body
  const chatMessages = messages.filter((msg) => {
    const type = msg.item.message?.type
    const body = msg.item.message?.body
    return (!type || type === 'chat') && body && body.trim().length > 0
  })

  // Raggruppa per contatto
  for (const msg of chatMessages) {
    const contactJid = extractContactJid(msg, myJid)
    if (!contactJid || contactJid === normalizeJid(myJid)) {
      continue // Skip messaggi a se stesso o senza contatto valido
    }

    if (!groups.has(contactJid)) {
      groups.set(contactJid, [])
    }
    groups.get(contactJid)!.push(msg)
  }

  // Per ogni gruppo, prendi il messaggio più recente
  const lastMessages = new Map<string, MAMResult>()
  for (const [contactJid, msgs] of groups.entries()) {
    // Ordina per timestamp (più recente prima)
    const sorted = msgs.sort((a, b) => {
      const timeA = extractTimestamp(a).getTime()
      const timeB = extractTimestamp(b).getTime()
      return timeB - timeA
    })
    lastMessages.set(contactJid, sorted[0])
  }

  return lastMessages
}


/**
 * Carica conversazioni dal server usando MAM
 */
export async function loadConversationsFromServer(
  client: Agent,
  options: {
    startDate?: Date
    endDate?: Date
    maxResults?: number
    afterToken?: string
  } = {}
): Promise<{ conversations: Conversation[]; nextToken?: string; complete: boolean }> {
  const { startDate, endDate, maxResults = 100, afterToken } = options

  // Query MAM
  const result = await client.searchHistory({
    start: startDate,
    end: endDate,
    paging: {
      max: maxResults,
      after: afterToken,
    },
  })

  if (!result.results || result.results.length === 0) {
    return {
      conversations: [],
      nextToken: result.paging?.last,
      complete: result.complete ?? true,
    }
  }

  // Raggruppa per contatto
  const lastMessages = groupMessagesByContact(result.results, client.jid || '')

  // Converti in conversazioni
  const conversations: Conversation[] = []
  for (const [contactJid, msg] of lastMessages.entries()) {
    // Correggo extractSender per usare myJid corretto
    const myBareJid = normalizeJid(client.jid || '')
    const from = msg.item.message?.from || ''
    const sender: 'me' | 'them' = from.startsWith(myBareJid) ? 'me' : 'them'

    conversations.push({
      jid: contactJid,
      lastMessage: {
        body: extractMessageBody(msg),
        timestamp: extractTimestamp(msg),
        from: sender,
        messageId: msg.id,
      },
      unreadCount: 0,
      updatedAt: new Date(),
    })
  }

  // Ordina per timestamp (più recenti prima)
  conversations.sort(
    (a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime()
  )

  return {
    conversations,
    nextToken: result.paging?.last,
    complete: result.complete ?? true,
  }
}

/**
 * Carica conversazioni con supporto per aggiornamenti incrementali basati su data
 * IMPORTANTE: Rimuove conversazioni che non sono più presenti nei risultati del server
 */
export async function loadConversations(
  client: Agent,
  options: {
    incremental?: boolean // Se true, carica solo messaggi dopo lastSync
    limit?: number // Limite conversazioni da caricare
    removeMissing?: boolean // Se true, rimuove conversazioni non più presenti nei risultati
  } = {}
): Promise<{ conversations: Conversation[]; nextToken?: string }> {
  const { incremental = false, limit, removeMissing = true } = options

  let startDate: Date | undefined
  let endDate = new Date()

  if (incremental) {
    // Carica solo messaggi dopo l'ultima sincronizzazione
    const metadata = await getMetadata()
    if (metadata?.lastSync) {
      startDate = metadata.lastSync
    }
  }

  // Carica conversazioni esistenti dal database
  const existingConversations = await getConversations()
  const existingJids = new Set(existingConversations.map((c) => c.jid))

  // Carica dal server
  const result = await loadConversationsFromServer(client, {
    startDate,
    endDate,
    maxResults: limit ? limit * 3 : 100, // Carica più messaggi per avere conversazioni complete
  })

  // JID trovati nella query corrente
  const foundJids = new Set(result.conversations.map((c) => c.jid))

  // Se removeMissing è true e non è incrementale, rimuovi conversazioni non più presenti
  if (removeMissing && !incremental) {
    const jidsToRemove = Array.from(existingJids).filter((jid) => !foundJids.has(jid))
    if (jidsToRemove.length > 0) {
      console.debug(`Rimozione ${jidsToRemove.length} conversazioni non più presenti nel server`)
      await removeConversations(jidsToRemove)
    }
  }

  // Merge intelligente: aggiorna conversazioni esistenti o aggiungi nuove
  const conversationMap = new Map<string, Conversation>()
  
  // Prima aggiungi quelle esistenti (per mantenere unreadCount)
  for (const conv of existingConversations) {
    conversationMap.set(conv.jid, conv)
  }
  
  // Poi aggiorna/aggiungi con quelle dal server (sovrascrive se timestamp più recente)
  for (const newConv of result.conversations) {
    const existing = conversationMap.get(newConv.jid)
    if (!existing) {
      // Nuova conversazione
      conversationMap.set(newConv.jid, newConv)
    } else {
      // Conversazione esistente: aggiorna solo se nuovo messaggio è più recente
      const newTimestamp = newConv.lastMessage.timestamp.getTime()
      const oldTimestamp = existing.lastMessage.timestamp.getTime()
      
      if (newTimestamp > oldTimestamp) {
        // Aggiorna mantenendo unreadCount esistente (a meno che non sia un nuovo messaggio ricevuto)
        conversationMap.set(newConv.jid, {
          ...newConv,
          unreadCount: existing.unreadCount, // Mantieni unreadCount esistente
        })
      }
    }
  }

  // Filtra: se removeMissing e non incrementale, rimuovi quelle non trovate
  const finalConversations = removeMissing && !incremental
    ? Array.from(conversationMap.values()).filter((c) => foundJids.has(c.jid))
    : Array.from(conversationMap.values())

  // Ordina per timestamp (più recenti prima)
  finalConversations.sort(
    (a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime()
  )

  // Salva in database locale
  if (finalConversations.length > 0) {
    await saveConversations(finalConversations)
  }

  // Aggiorna metadata
  await saveMetadata({
    lastSync: endDate,
    lastRSMToken: result.nextToken,
  })

  // Se c'è un limite, applica
  const limitedConversations = limit ? finalConversations.slice(0, limit) : finalConversations

  return {
    conversations: limitedConversations,
    nextToken: result.nextToken,
  }
}

/**
 * Carica più conversazioni (per paginazione)
 */
export async function loadMoreConversations(
  client: Agent,
  lastToken: string,
  limit = 20
): Promise<{ conversations: Conversation[]; nextToken?: string; hasMore: boolean }> {
  const result = await loadConversationsFromServer(client, {
    maxResults: limit * 2, // Carica più messaggi per avere conversazioni complete
    afterToken: lastToken,
  })

  if (result.conversations.length > 0) {
    await saveConversations(result.conversations)
  }

  const allConversations = await getConversations()

  return {
    conversations: allConversations.slice(0, limit),
    nextToken: result.nextToken,
    hasMore: !result.complete && !!result.nextToken,
  }
}

/**
 * Arricchisce conversazioni con dati dal roster (nomi contatti)
 */
export async function enrichWithRoster(
  client: Agent,
  conversations: Conversation[]
): Promise<Conversation[]> {
  try {
    const rosterResult = await client.getRoster()
    // RosterResult ha una proprietà 'roster' che contiene gli items
    const rosterItems = (rosterResult as any).roster?.items || []
    const rosterMap = new Map(
      rosterItems.map((item: any) => [normalizeJid(item.jid), item])
    )

    return conversations.map((conv) => {
      const rosterItem = rosterMap.get(conv.jid)
      return {
        ...conv,
        displayName: (rosterItem as any)?.name || conv.displayName,
      }
    })
  } catch (error) {
    console.error('Errore nel recupero roster:', error)
    return conversations
  }
}

/**
 * Aggiorna una conversazione quando arriva un nuovo messaggio
 */
export async function updateConversationOnNewMessage(
  message: ReceivedMessage,
  myJid: string
): Promise<void> {
  const myBareJid = normalizeJid(myJid)
  const from = message.from || ''
  const to = message.to || ''

  // Determina il JID del contatto
  const contactJid = from.startsWith(myBareJid) ? normalizeJid(to) : normalizeJid(from)

  if (!contactJid || contactJid === myBareJid) {
    return // Skip messaggi a se stesso
  }

  // Estrai timestamp
  const delay = message.delay
  let timestamp = new Date()
  if (delay && typeof delay === 'object' && 'stamp' in delay) {
    const stamp = (delay as { stamp?: string }).stamp
    if (stamp) {
      timestamp = new Date(stamp)
    }
  }

  // Aggiorna conversazione
  await updateConversation(contactJid, {
    jid: contactJid,
    lastMessage: {
      body: message.body || '',
      timestamp,
      from: from.startsWith(myBareJid) ? 'me' : 'them',
      messageId: message.id || `${Date.now()}`,
    },
    unreadCount: from.startsWith(myBareJid) ? 0 : 1, // Incrementa se è un messaggio ricevuto
  })
}
