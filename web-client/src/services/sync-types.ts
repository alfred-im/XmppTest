/**
 * Opzioni condivise per la sincronizzazione MAM all'avvio.
 * endBefore è il momento T: la sync copre il passato, il listener il futuro.
 */
export interface SyncOptions {
  endBefore: Date
}
