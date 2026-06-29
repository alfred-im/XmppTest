# Diagnosi: «non si legge nulla nelle conversazioni»

**Data**: 2026-06-29  
**Status**: 🟡 Non riprodotto in test controllati — checklist per utente  
**Categoria**: Messaggistica / auth

Documento per AI.

---

## Segnalazione utente

Chat/conversazioni senza contenuto leggibile. Richiesta: **solo diagnosi**, no fix non concordati.

---

## Cosa è stato verificato (senza modificare codice produzione messaggi)

| Layer | Esito |
|-------|--------|
| DB live `messages` tra test1/test2/test3 | Body presenti (`ciao!`, `prova!`, …), `marker_type` null |
| RPC `list_peer_messages` con JWT test1 valido | Array con messaggi e `body` non vuoto |
| RPC `list_inbox` | Anteprime corrette (`ciao!`, `a te!`) |
| RPC senza JWT / JWT invalido | `[]` **senza errore HTTP** — silenzioso |
| Alpha + localhost con test1 (browser agente) | Testo leggibile in inbox e bolle chat |
| Widget test `MessageBubble` | Testo renderizzato con tema `Inter` |

---

## Ipotesi più probabile se l'utente vede chat vuota

**Sessione non autenticata o refresh revocato** → RPC ritorna `[]` → UI mostra lista vuota **senza messaggio di errore** (`ChatPanel` non espone `MessagesController.error`).

Fattori che revocano sessione:

- Bug bootstrap `signOut()` post-login (main pre-#142)
- Logout API/test su stesso account
- Refresh token scaduto/revocato in `restore()`

**Meno probabile**: testo invisibile (font/colori) — non osservato nei test.

---

## Checklist manuale (utente)

1. DevTools → Network → filtrare `rpc`.
2. Aprire chat con storico noto.
3. Controllare `list_peer_messages`:
   - `200` + array con `body` → bug UI client
   - `200` + `[]` → auth/peer sbagliato
   - `401` → sessione morta
4. Confrontare con `list_inbox` nella stessa sessione.

Riportare: URL (Alpha/localhost), account, esito inbox vs chat, snippet risposta RPC.

---

## File rilevanti

- `client/lib/services/message_service.dart` — `fetchPeerMessages`
- `client/lib/widgets/chat_panel.dart` — non mostra errori load
- `supabase/migrations/20260627230000_messages_only_inbox.sql` — `list_peer_messages`

---

## Riferimenti

- `docs/fixes/auth-bootstrap-gotrue-revoke.md`
- `docs/AGENT_DEBUG_ACCOUNTS.md`
