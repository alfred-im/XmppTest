# Multi-account: sessioni Supabase parallele

**Stato**: 🟢 Vincolante (client Alpha)  
**Data**: 2026-06-29

## Contesto

Il client trattava il multi-account come **un account attivo** + **token salvati** (`setSession` al cambio). Il modello prodotto è diverso: l’app è un **client di messaggistica**; gli account Alfred sono **credenziali aperte in parallelo**, non «entrate nell’applicazione».

## Decisione

### Modello mentale

| Concetto | Significato |
|----------|-------------|
| **Sezione app** | Shell Alfred (layout inbox/chat). Nessun `auth.uid()` «utente app». |
| **Account aperto** | Identità messaggistica con sessione Supabase **viva** + realtime inbox |
| **Focus** | Quale account mostra inbox/chat — **solo UI** |
| **Lista account** | Elenco account **autenticati** (non «salvati» in attesa) |

Stati ammessi:

- **0 account aperti** → shell + overlay credenziali (obbligatorio, non chiudibile)
- **≥1 account aperti** → shell piena; tutti in ascolto realtime inbox; uno in focus
- **Mai** «account in lista ma non autenticato»

### Implementazione client

- `AccountManager`: N `AccountSession`, ciascuna con `SupabaseClient` dedicato (`SharedPreferencesLocalStorage` con chiave per `userId`)
- `AccountSession`: client + servizi + `InboxController` sempre attivo
- Cambio focus: **nessun** `setSession` tra account
- Aggiungi account / primo avvio: overlay semi-trasparente su shell (login + registrazione insieme)
- Rimuovi account: chiude sessione di quell’identità; se lista vuota → overlay auto

### Backend

Invariato: ogni account Alfred = utente GoTrue + `profiles`. Nessun nuovo livello identità server.

## Conseguenze

- Refactor servizi: RPC/realtime/storage passano `SupabaseClient` per account
- `SavedAccount` → `OpenAccount` (stesso payload storage, semantica «aperto»)
- Rimosso gate `AppShell` auth vs home
- Badge / notifiche su account non in focus: possibile perché ogni sessione ha realtime inbox

## Riferimenti

- `client/lib/services/account_manager.dart`
- `client/lib/services/account_session.dart`
- `PROJECT_MAP.md` § multi-account
