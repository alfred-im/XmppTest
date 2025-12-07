/**
 * Servizio per la gestione della ricezione messaggi in tempo reale secondo gli standard XMPP
 * 
 * Implementa:
 * - XEP-0184: Message Delivery Receipts (conferme di ricezione)
 * - XEP-0085: Chat State Notifications (indicatori "sta scrivendo...")
 * - XEP-0280: Message Carbons (sincronizzazione multi-dispositivo)
 * - Gestione corretta dei tipi di messaggio XMPP
 */

import type { Agent } from 'stanza'
import type { ReceivedMessage } from 'stanza/protocol'
import { normalizeJid } from '../utils/jid'

/**
 * Stati della chat secondo XEP-0085
 */
export type ChatState = 'active' | 'composing' | 'paused' | 'inactive' | 'gone'

/**
 * Callback per gli stati della chat
 */
export type ChatStateCallback = (jid: string, state: ChatState) => void

/**
 * Callback per i messaggi ricevuti
 */
export type MessageReceivedCallback = (message: ReceivedMessage) => void

/**
 * Callback per le conferme di ricezione
 */
export type ReceiptCallback = (messageId: string, from: string) => void

/**
 * Configurazione del servizio
 */
export interface RealTimeMessagingConfig {
  // Abilita/disabilita funzionalità
  enableReceipts: boolean
  enableChatStates: boolean
  enableCarbons: boolean
  
  // Callbacks
  onMessageReceived?: MessageReceivedCallback
  onChatStateChanged?: ChatStateCallback
  onReceiptReceived?: ReceiptCallback
}

/**
 * Servizio per la gestione della ricezione messaggi in tempo reale
 */
export class RealTimeMessagingService {
  private client: Agent | null = null
  private config: RealTimeMessagingConfig
  private messageHandlers: Set<MessageReceivedCallback> = new Set()
  private chatStateHandlers: Set<ChatStateCallback> = new Set()
  private receiptHandlers: Set<ReceiptCallback> = new Set()
  private isInitialized = false

  constructor(config: Partial<RealTimeMessagingConfig> = {}) {
    this.config = {
      enableReceipts: true,
      enableChatStates: true,
      enableCarbons: true,
      ...config,
    }
  }

  /**
   * Inizializza il servizio con il client XMPP
   */
  async initialize(client: Agent): Promise<void> {
    if (this.isInitialized && this.client === client) {
      return
    }

    this.client = client
    this.isInitialized = true

    // Abilita Message Carbons (XEP-0280) per sincronizzazione multi-dispositivo
    if (this.config.enableCarbons) {
      await this.enableMessageCarbons()
    }

    // Registra i listener per i messaggi
    this.setupMessageListeners()

    console.log('RealTimeMessagingService inizializzato', {
      receipts: this.config.enableReceipts,
      chatStates: this.config.enableChatStates,
      carbons: this.config.enableCarbons,
    })
  }

  /**
   * Disabilita il servizio e rimuove i listener
   */
  destroy(): void {
    if (this.client) {
      this.client.off('message', this.handleMessage)
      this.client.off('chat:state', this.handleChatState)
    }

    this.messageHandlers.clear()
    this.chatStateHandlers.clear()
    this.receiptHandlers.clear()
    this.client = null
    this.isInitialized = false
  }

  /**
   * Abilita Message Carbons (XEP-0280)
   * Permette di ricevere copie dei messaggi inviati/ricevuti su altri dispositivi
   */
  private async enableMessageCarbons(): Promise<void> {
    if (!this.client) return

    try {
      await this.client.enableCarbons()
      console.log('Message Carbons (XEP-0280) abilitati')
    } catch (error) {
      console.warn('Impossibile abilitare Message Carbons:', error)
      // Non è critico, continua senza carbons
    }
  }

  /**
   * Configura i listener per i messaggi in arrivo
   */
  private setupMessageListeners(): void {
    if (!this.client) return

    // Listener principale per i messaggi
    this.client.on('message', this.handleMessage)

    // Listener per gli stati della chat (se supportato dalla libreria)
    if ('on' in this.client) {
      this.client.on('chat:state', this.handleChatState)
    }
  }

  /**
   * Gestisce un messaggio ricevuto
   */
  private handleMessage = async (message: ReceivedMessage): Promise<void> => {
    if (!this.client || !message.from) return

    const fromJid = normalizeJid(message.from)
    const myJid = this.client.jid ? normalizeJid(this.client.jid) : ''

    // 1. Invia conferma di ricezione (XEP-0184) se richiesta
    if (this.config.enableReceipts && this.shouldSendReceipt(message)) {
      await this.sendReceipt(message)
    }

    // 2. Gestisci conferme di ricezione ricevute
    if (this.isReceiptMessage(message)) {
      this.handleReceiptMessage(message)
      return // Le conferme non sono messaggi da mostrare
    }

    // 3. Gestisci Message Carbons (copie da altri dispositivi)
    if (this.isCarbon(message)) {
      // I carbons sono messaggi inviati/ricevuti da altri nostri dispositivi
      // La libreria stanza dovrebbe già normalizzarli, ma verifichiamo
      console.debug('Ricevuto Message Carbon:', message)
    }

    // 4. Filtra messaggi senza body (potrebbero essere solo notifiche di stato)
    if (!message.body || message.body.trim().length === 0) {
      console.debug('Messaggio senza body, ignorato:', message)
      return
    }

    // 5. Verifica il tipo di messaggio (chat, groupchat, error, headline)
    if (!this.isValidChatMessage(message)) {
      console.debug('Messaggio non valido o tipo non supportato:', message)
      return
    }

    // 6. Notifica tutti i callback registrati
    this.messageHandlers.forEach(handler => {
      try {
        handler(message)
      } catch (error) {
        console.error('Errore nel callback messaggio:', error)
      }
    })

    // 7. Callback globale dalla config
    if (this.config.onMessageReceived) {
      try {
        this.config.onMessageReceived(message)
      } catch (error) {
        console.error('Errore nel callback globale messaggio:', error)
      }
    }
  }

  /**
   * Gestisce gli stati della chat (typing indicators)
   */
  private handleChatState = (data: { from: string; state: ChatState }): void => {
    const fromJid = normalizeJid(data.from)
    
    // Notifica tutti i callback registrati
    this.chatStateHandlers.forEach(handler => {
      try {
        handler(fromJid, data.state)
      } catch (error) {
        console.error('Errore nel callback stato chat:', error)
      }
    })

    // Callback globale dalla config
    if (this.config.onChatStateChanged) {
      try {
        this.config.onChatStateChanged(fromJid, data.state)
      } catch (error) {
        console.error('Errore nel callback globale stato chat:', error)
      }
    }
  }

  /**
   * Verifica se il messaggio richiede una conferma di ricezione
   */
  private shouldSendReceipt(message: ReceivedMessage): boolean {
    // Invia conferma solo se:
    // 1. Il messaggio ha un ID
    // 2. Il messaggio richiede esplicitamente una conferma (XEP-0184)
    // 3. Il messaggio è di tipo 'chat' (non groupchat, error, ecc.)
    return !!(
      message.id && 
      message.type === 'chat' &&
      message.requestReceipt
    )
  }

  /**
   * Invia una conferma di ricezione (XEP-0184)
   */
  private async sendReceipt(message: ReceivedMessage): Promise<void> {
    if (!this.client || !message.id || !message.from) return

    try {
      await this.client.sendMessage({
        to: message.from,
        type: 'chat',
        receipt: {
          id: message.id,
          type: 'received',
        },
      })
      console.debug('Conferma di ricezione inviata per messaggio:', message.id)
    } catch (error) {
      console.warn('Errore nell\'invio della conferma di ricezione:', error)
      // Non è critico, continua
    }
  }

  /**
   * Verifica se il messaggio è una conferma di ricezione
   */
  private isReceiptMessage(message: ReceivedMessage): boolean {
    return !!(message.receipt && message.receipt.type === 'received')
  }

  /**
   * Gestisce una conferma di ricezione ricevuta
   */
  private handleReceiptMessage(message: ReceivedMessage): void {
    if (!message.receipt?.id || !message.from) return

    const fromJid = normalizeJid(message.from)
    const receiptId = message.receipt.id

    // Notifica tutti i callback registrati
    this.receiptHandlers.forEach(handler => {
      try {
        handler(receiptId, fromJid)
      } catch (error) {
        console.error('Errore nel callback conferma ricezione:', error)
      }
    })

    // Callback globale dalla config
    if (this.config.onReceiptReceived) {
      try {
        this.config.onReceiptReceived(receiptId, fromJid)
      } catch (error) {
        console.error('Errore nel callback globale conferma ricezione:', error)
      }
    }
  }

  /**
   * Verifica se il messaggio è un Message Carbon
   */
  private isCarbon(message: ReceivedMessage): boolean {
    // I Message Carbons hanno attributi speciali
    // La libreria stanza dovrebbe gestirli automaticamente
    return !!(message as any).carbon
  }

  /**
   * Verifica se il messaggio è un messaggio di chat valido
   */
  private isValidChatMessage(message: ReceivedMessage): boolean {
    // Tipi validi per messaggi di chat
    const validTypes = ['chat', 'normal', undefined]
    return validTypes.includes(message.type)
  }

  /**
   * Registra un callback per i messaggi ricevuti
   */
  onMessage(callback: MessageReceivedCallback): () => void {
    this.messageHandlers.add(callback)
    
    // Ritorna funzione per rimuovere il callback
    return () => {
      this.messageHandlers.delete(callback)
    }
  }

  /**
   * Registra un callback per gli stati della chat
   */
  onChatState(callback: ChatStateCallback): () => void {
    this.chatStateHandlers.add(callback)
    
    return () => {
      this.chatStateHandlers.delete(callback)
    }
  }

  /**
   * Registra un callback per le conferme di ricezione
   */
  onReceipt(callback: ReceiptCallback): () => void {
    this.receiptHandlers.add(callback)
    
    return () => {
      this.receiptHandlers.delete(callback)
    }
  }

  /**
   * Invia un indicatore di stato della chat (typing indicator)
   */
  async sendChatState(to: string, state: ChatState): Promise<void> {
    if (!this.client || !this.config.enableChatStates) return

    try {
      await this.client.sendMessage({
        to: normalizeJid(to),
        type: 'chat',
        chatState: state,
      })
      console.debug('Stato chat inviato:', state, 'a', to)
    } catch (error) {
      console.warn('Errore nell\'invio dello stato chat:', error)
      // Non è critico, continua
    }
  }

  /**
   * Invia un messaggio con richiesta di conferma di ricezione
   */
  async sendMessageWithReceipt(to: string, body: string): Promise<string | undefined> {
    if (!this.client) {
      throw new Error('Client XMPP non disponibile')
    }

    try {
      const result = await this.client.sendMessage({
        to: normalizeJid(to),
        body,
        type: 'chat',
        requestReceipt: this.config.enableReceipts,
      })

      // Restituisci l'ID del messaggio per tracciare la conferma
      return typeof result === 'string' ? result : undefined
    } catch (error) {
      console.error('Errore nell\'invio del messaggio:', error)
      throw error
    }
  }

  /**
   * Verifica se il servizio è inizializzato
   */
  isReady(): boolean {
    return this.isInitialized && this.client !== null
  }
}

/**
 * Istanza singleton del servizio (per uso globale)
 */
export const defaultRealTimeMessagingService = new RealTimeMessagingService()

/**
 * Factory per creare istanze personalizzate del servizio
 */
export function createRealTimeMessagingService(
  config?: Partial<RealTimeMessagingConfig>
): RealTimeMessagingService {
  return new RealTimeMessagingService(config)
}
