# Archivio messaggi conversazione — design

**Stato:** `implemented` (refactoring client)  
**Ultima revisione:** 2026-07-22  
**Promessa:** [PROM-CONVERSATION-SCOPE](../../specs/promises/product/PROM-CONVERSATION-SCOPE.md)

## Scopo

Refactoring del layer lista messaggi chat 1:1: **un modulo**, **un'identità** (`ConversationScope` + `loadSeq`), ciclo di vita esplicito.

## Componenti

| Nome | File | Ruolo |
|------|------|--------|
| **Archivio messaggi** | `client/lib/machines/messaging/conversation_message_store.dart` | Unica mutazione lista DM |
| **Chiave conversazione** | `client/lib/models/conversation_scope.dart` | `ownerUserId`, `peerProfileId`, `sessionEpoch`, `loadSeq` |
| **Navigazione** | `navigation_machine.dart` | `commitScope` / `invalidateCommittedScope` / `reconcileSessionEpoch` |

## Regole

- **R1–R6:** vedi test `conversation_message_store_test.dart`, `multi_account_message_store_test.dart` (INV-R4 `prova-out`).
- Lista vuota in `Loading`; apply/merge solo se scope commesso coincide.
- `isConversationReady` senza side-effect; epoch via `reconcileSessionEpoch`.
- Nessun `isScopeCommitted ?? true`.

## Invalidazione forte (`loadSeq++`)

Switch account, cambio peer, chiusura chat, epoch sessione ricreata.

## Fuori scope v1

Gruppi (`GroupMessagesController`).
