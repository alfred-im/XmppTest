# Fix: Isolamento storage per account XMPP

**Data**: 2026-06-17  
**Status**: ✅ Risolto  
**Categoria**: Architettura / IndexedDB

---

## Problema

Il database locale era **unico e condiviso** tra tutti gli account. Messaggi, conversazioni, metadata di sync e outbox non erano legati al JID dell'utente loggato.

**Sintomo riportato**: uscendo da un account ed entrando in un altro, in memoria (e spesso anche in IndexedDB) comparivano le conversazioni del primo account.

**Cause**:

1. `getDB()` apriva sempre lo stesso IndexedDB (`conversations-db`)
2. Le query filtravano solo per `conversationJid` (contatto), non per account proprietario
3. Al logout non avveniva switch di contesto storage; i React context mantenevano stato del precedente account
4. La sync incrementale riusava token MAM del DB condiviso anche con sessione XMPP di un altro utente

---

## Soluzione

**Un database IndexedDB per account**, senza cancellare lo storico al logout.

### Naming

```
conversations-db-{jid_normalizzato}
```

Esempio: `conversations-db-testardo_conversations_im`  
JID normalizzato con `normalizeJID()`; caratteri `@`, `.`, `/` sostituiti con `_`.

### Componenti coinvolti

| File | Ruolo |
|------|--------|
| `conversations-db.ts` | `setAccountContext()`, `getAccountDbName()`, `getDB()` apre il DB dell'account attivo |
| `account-session.ts` | `switchAccountContext()`, `onAccountChanged()` — switch DB + reset memoria (non wipe) |
| `ConnectionContext.tsx` | Imposta contesto account su auto-login, connect, logout |
| `ConversationsContext.tsx` | Ricarica lista quando cambia `accountJid` o account |
| `VirtualMessagesContext.tsx` | Reset overlay/virtuali su cambio account |
| `useMessages.ts` | Reset e reload messaggi su cambio account |

### Migrazione legacy

Al primo accesso di un account, se esiste il vecchio DB condiviso `conversations-db` (con dati) e il DB dedicato è vuoto, i dati vengono **copiati** nel DB dell'account — non eliminati.

> **Nota**: se il DB legacy conteneva già dati mescolati di più account (stato pre-fix), la migrazione li assegna al primo account che accede. Gli altri account partono con DB pulito.

### Comportamento logout

- ❌ **Non** si cancella IndexedDB
- ✅ Si chiude connessione XMPP e credenziali (`localStorage`)
- ✅ `switchAccountContext(null)` — nessun DB attivo, UI svuotata in memoria
- ✅ Storico dell'account resta nel suo DB dedicato per accessi futuri

### Comportamento login / cambio account

1. `switchAccountContext(normalizeJID(jid))`
2. `getDB()` apre il DB dedicato a quell'account
3. Context React ricaricano da quel DB
4. `AppInitializer` esegue sync (full se DB vuoto, incremental se popolato) **sui token di quell'account**

---

## Documentazione correlata

- `PROJECT_MAP.md` — sezione Database e Storage
- `docs/implementation/sync-system-complete.md` — sezione isolamento account
- `docs/decisions/README.md` — decisione "IndexedDB per account"
