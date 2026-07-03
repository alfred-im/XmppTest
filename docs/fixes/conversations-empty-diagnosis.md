# Diagnosi: «non si legge nulla nelle conversazioni»

**Data**: 2026-06-29 · **aggiornato** 2026-07-03  
**Status**: ✅ **Risolto** — fix #143 (view/logout), #147 (persistenza), #152 (JWT al switch); e2e multi-account OK  
**Categoria**: Messaggistica / auth / multi-account

Documento per AI — storico diagnosi + fix applicati.

---

## Segnalazione originale

Chat/conversazioni senza contenuto leggibile con inbox che mostrava ancora anteprime.

---

## Causa radice confermata

**Disallineamento inbox in memoria vs fetch chat** quando la sessione GoTrue non era valida (refresh revocato, bootstrap pre-#142, switch account con JWT sbagliato pre-#152):

1. `InboxController.peers` restava in RAM con anteprime da sessione precedente valida
2. Apertura chat → `list_peer_messages` senza JWT valido → `200` + `[]` silenzioso
3. UI interpretava `[]` come «chat vuota» invece di errore sessione

RPC senza JWT valido ritorna `[]` **senza errore HTTP** — comportamento server documentato, non bug PostgREST.

---

## Fix applicati (codice su `main`)

| Fix | PR | Implementazione |
|-----|-----|-----------------|
| View per account, logout locale | #143 | `AccountViewState` per `userId`; `close()` senza `signOut` GoTrue |
| JWT prima di load/send | #147 | `AccountSession.hasValidJwt()`; `MessagesController.sessionExpiredMessage` |
| UI errore sessione | #147 | `ChatPanel` mostra `messagesController.error` |
| Inbox al switch web | #152 | Una GoTrue attiva; `setFocus` dispose + restore |
| Persistenza F5 | #147 | Manifest dichiarativo (`persistOpenAccount`) |

**Nota**: non esiste `onSessionEnded` — la gestione passa da `hasValidJwt()` + messaggi espliciti in `MessagesController` / `ChatPanel`.

---

## Verifica attuale

| Layer | Esito |
|-------|--------|
| `verify.sh` | ✅ 70 test (unit/widget) |
| `integration-multi-account.sh` | ✅ API agent1↔agent2 |
| `e2e/multi-account-messages.spec.ts` | ✅ Switch account + ricezione messaggi |

Account debug: **solo** `alfredagent1` / `alfredagent2` — `docs/AGENT_DEBUG_ACCOUNTS.md`.

---

## Checklist diagnosi (se il sintomo ricompare)

1. DevTools → Network → filtrare `rpc`.
2. Aprire chat con storico noto.
3. Controllare `list_peer_messages`:
   - `200` + array con `body` → bug UI client
   - `200` + `[]` → auth/peer sbagliato o JWT assente
   - `401` → sessione morta
4. Confrontare con `list_inbox` nella stessa sessione.
5. Verificare `alfred_focus_user_id` e quale account è in focus.

---

## File rilevanti

- `client/lib/services/message_service.dart` — `fetchPeerMessages`
- `client/lib/providers/messages_controller.dart` — `hasValidJwt` gate, `sessionExpiredMessage`
- `client/lib/widgets/chat_panel.dart` — rendering `error`
- `client/lib/services/account_session.dart` — `hasValidJwt()`

---

## Riferimenti

- `docs/fixes/multi-account-chat-persistence-pr143.md`
- `docs/fixes/multi-account-single-active-gotrue-pr152.md`
- `docs/fixes/auth-bootstrap-gotrue-revoke.md`
- `docs/implementation/multi-account-persistence-redesign.md`
