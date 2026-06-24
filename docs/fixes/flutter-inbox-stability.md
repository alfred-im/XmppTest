# Fix stabilità inbox Flutter (PR #113 + #114)

**Data**: 2026-06-24  
**Client**: Flutter web (`client/`) + Supabase  
**Documento per AI** — non per utenti.

---

## Sintomo 1 — Inbox bloccata su rotella (PR #113)

**Comportamento**: All'apertura dell'app la lista conversazioni restava in caricamento infinito finché l'utente non navigava su un'altra schermata (es. contatti) e tornava.

**Causa radice**: Race tra `Supabase.initialize` e la prima RPC. Su web, `recoverSession` parte in background; le RPC partivano prima che la sessione fosse idratata.

**Fix**:
- `waitForSupabaseSessionReady()` in `supabase_bootstrap.dart` dopo `Supabase.initialize`
- `AuthController.sessionReady` — i `ProxyProvider` creano `ConversationsController` solo se `sessionReady && userId`
- `ConversationsController`: realtime dopo primo `load()`; timeout 30s; UI errore + Riprova

**File**: `client/lib/services/supabase_bootstrap.dart`, `client/lib/providers/auth_controller.dart`, `client/lib/providers/conversations_controller.dart`, `client/lib/main.dart`

---

## Sintomo 2 — Inbox aggiornata solo dopo interazione (PR #114)

**Comportamento**: Dopo il fix #113, i dati arrivavano dal server ma la UI restava sulla rotella finché l'utente non interagiva (es. digitava nella ricerca).

**Causa radice**: `ProxyProvider` non si sottoscrive a `notifyListeners()` del `ChangeNotifier` figlio. `ConversationsController.load()` completava ma la UI non rebuildava.

**Fix**: Sostituire `ProxyProvider` con **`ChangeNotifierProxyProvider`** per:
- `ConversationsController`
- `ContactsController`
- `ProfileController`

**File**: `client/lib/main.dart`  
**Test**: `client/test/widget/conversations_provider_listen_test.dart`, `client/e2e/inbox-load.spec.ts`

---

## Lezione architetturale

| Pattern | Quando usare |
|---------|--------------|
| `ProxyProvider` | Valori derivati statici, senza `notifyListeners` |
| `ChangeNotifierProxyProvider` | Controller figlio che estende `ChangeNotifier` e deve aggiornare la UI |

---

**Riferimenti**: PR #113, #114; `docs/architecture/alpha-full-stack.md` §2.2–2.3; `docs/architecture/alpha-pr-registry.md`
