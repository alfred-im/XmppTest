# Suite test Alfred (`client/`)

Punto unico per **scoprire** e **lanciare** tutti i test del client.

**Entry point:** dalla cartella `client/`:

```bash
bash scripts/test.sh list      # catalogo completo
bash scripts/test.sh gate        # gate CI (default)
bash scripts/test.sh manual      # tutte le suite manuali
```

---

## Tier 1 — Gate CI (sempre)

Eseguito da `verify.sh` e da GitHub Actions (`deploy-pages.yml`) su ogni PR/push `client/**`.

| Suite | Comando | Cosa verifica |
|-------|---------|---------------|
| **gate** | `bash scripts/test.sh gate` | `flutter pub get` → `flutter analyze` (zero issue) → `flutter test` (esclusi tag `live`) |

Equivalente diretto: `bash scripts/verify.sh`  
Opzione build web: `bash scripts/verify.sh --build`

**Dart:** `client/test/unit/`, `client/test/widget/` (**192** test gate, esclusi tag `live`)

---

## Tier 2 — Manuale / pre-release (non in CI)

Richiedono rete (Supabase live) e/o browser. Non bloccano merge.

| Suite | Comando | Cosa verifica |
|-------|---------|---------------|
| **integration** | `bash scripts/test.sh integration` | Login agent1/agent2 + RPC inbox/peer + **contratto spunte** (✓/✓✓/allow list) |
| **integration-ticks** | `bash scripts/test.sh integration-ticks` | Solo contratto spunte delivery plane (3 fasi) |
| **integration-push** | `bash scripts/test.sh integration-push` | Smoke SQL `push_*` su stack locale; oppure delivery plane live con agent1/2 |
| **e2e-push-local** | `bash scripts/test.sh e2e-push-local` | Playwright push locale: ricezione SW + **tap multi-account** (stack locale) |
| **e2e** | `bash scripts/test.sh e2e` | Tutti i Playwright in `client/e2e/` |
| **e2e-multi** | `bash scripts/test.sh e2e-multi` | Multi-account mobile: persistenza F5 + messaggi (UI + DB) |
| **live** | `bash scripts/test.sh live` | Dart con tag `@Tags(['live'])` (es. password reset PKCE) |
| **manual** | `bash scripts/test.sh manual` | integration → e2e-multi → live (in sequenza) |

### Playwright (`client/e2e/`)

| File | Suite | Note |
|------|-------|------|
| `multi-account-persist.spec.ts` | `e2e-multi` | 2 account, F5, manifest |
| `multi-account-messages.spec.ts` | `e2e-multi` | Scambio messaggi + verifica DB (`list_peer_messages`) |
| `inbox-load.spec.ts` | `e2e` | Inbox senza digitare in ricerca |
| `pages-smoke.spec.ts` | `e2e` | Smoke generico (fragile su canvas Flutter) |
| `push-registration.spec.ts` | `e2e-push-local` | Solo registrazione subscription (subset) |
| `push-full.spec.ts` | `e2e-push-local` | Permesso → subscribe → messaggio → notifica in SW |
| `push-tap-multi-account.spec.ts` | `e2e-push-local` | Due account → tap notifica → focus destinatario + chat |

Helper riusabili: `e2e/helpers/local-multi-account.ts`, `focus.ts`, `push.ts` (`simulateNotificationTap`, `installPushTestEnvironment`).

Lancio: `bash scripts/test.sh e2e-push-local` (avvia Supabase locale, Flutter su `:8080` con VAPID e2e e `ALFRED_DIAGNOSTIC_LOG=true`).  
Per riusare un `flutter run` già avviato sullo stack locale: `E2E_PUSH_REUSE_FLUTTER=1 bash scripts/test.sh e2e-push-local`

#### Log diagnostici push (`ALFRED_DIAGNOSTIC_LOG`)

Strumentazione in `client/lib/utils/diagnostic_log.dart` — **non** inclusa nelle build Pages.

```bash
cd client && flutter run -d web-server --web-port=8080 --web-hostname=0.0.0.0 \
  --dart-define=SUPABASE_URL=http://127.0.0.1:54321 \
  --dart-define=SUPABASE_ANON_KEY=<anon locale> \
  --dart-define=ALFRED_DIAGNOSTIC_LOG=true
```

In DevTools (console pagina), filtrare `[alfred][push]`. Fasi attese su tap riuscito: `window.message` → `open_chat.emit` → `handler.enqueue` → `focus.ok` → `handler.chat_opened`. Uscite `FAIL …` indicano il punto esatto (es. `peer_timeout`, `focus_failed`). Script riproduzione locale: `client/e2e/push-bug-repro.spec.ts` (non in CI).

### SQL smoke push (`supabase/tests/` — post SYS-PUSH)

| File | Verifica |
|------|----------|
| `push_subscriptions_schema_smoke.sql` | DDL, indici, UNIQUE |
| `push_subscriptions_rls_smoke.sql` | RLS cross-user negato |
| `push_delivery_trigger_smoke.sql` | Recapito → push_notify; allow list rifiutata → nessun push |
| `push_multi_device_smoke.sql` | Subscription multiple per user_id |

### Dart unit push (post SYS-PUSH)

| File | Verifica |
|------|----------|
| `push_subscription_service_test.dart` | device_id, upsert, delete on close |
| `push_suppression_test.dart` | Matrice focus × peer × visibility |
| `push_preview_test.dart` | Anteprima testo/media allineata inbox |
| `push_notification_listener_test.dart` | Tap notifica / open_chat → chat peer (mock, gate CI) |
| `notification_permission_test.dart` | Matrice permesso push + subscribe-first |

Default URL: hosted web client `https://alfred-im.github.io/alfred-im/`  
Locale: `ALFRED_BASE_URL=http://localhost:8080/ bash scripts/test.sh e2e-multi`

Account: per `e2e-multi` su live usare env `ALFRED_ACCOUNT{1,2}_{EMAIL,PASSWORD}` — **non** usare `test1`–`test4` negli script agente. Push e2e: solo locale (`e2e-push-local`).

### Utilità ambiente GUI

| Script | Comando |
|--------|---------|
| Diagnostica | `bash scripts/test.sh diagnose` |
| Reset Chrome CDP | `bash scripts/reset-chrome-cdp.sh` |

Prima di test browser: `bash scripts/diagnose-test-env.sh` (o `test.sh diagnose`).

---

## Riferimenti rapidi

| Dove | Ruolo |
|------|-------|
| `scripts/test.sh` | Hub comandi |
| `scripts/verify.sh` | Implementazione gate (usata da CI) |
| `scripts/integration-multi-account.sh` | Integrazione API |
| `scripts/run-e2e-multi-account.sh` | Playwright multi-account |
| `docs/AGENT_DEBUG_ACCOUNTS.md` | Credenziali account agente |
