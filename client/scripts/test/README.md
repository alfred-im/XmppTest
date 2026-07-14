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
| **integration-push** | `bash scripts/test.sh integration-push` | Push VAPID: subscription DB + evento post-recapito ([PROM-PUSH-NOTIFY](../../docs/specs/promises/product/PROM-PUSH-NOTIFY.md), post-implementazione) |
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
| `push-registration.spec.ts` | `e2e` | Registrazione subscription multi-account (post SYS-PUSH) |
| `push-notification-click.spec.ts` | `e2e` | Tap notifica → focus account + chat (post SYS-PUSH) |

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
| `notification_permission_test.dart` | Permesso granted/denied/default |

Default URL: hosted web client `https://alfred-im.github.io/alfred-im/`  
Locale: `ALFRED_BASE_URL=http://localhost:8080/ bash scripts/test.sh e2e-multi`

Account: default `alfredagent1`/`alfredagent2`; per `test1`/`test2` → env `ALFRED_ACCOUNT{1,2}_{EMAIL,PASSWORD,USERNAME}`.

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
