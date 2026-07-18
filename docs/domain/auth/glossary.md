# Glossario — contesto auth

**Bounded context:** `auth`  
**Ultima revisione:** 2026-07-18  
**Promesse SDD:** [SURF-AUTH](../../specs/surfaces/SURF-AUTH.md), [PROM-MULTI-ACCOUNT](../../specs/promises/product/PROM-MULTI-ACCOUNT.md)

---

## Linguaggio ubiquo

| Termine | Definizione |
|---------|-------------|
| **AuthOverlay** | Strato semi-trasparente sopra `HomeScreen` che ospita `AuthScreen` — mai sostituisce la shell. |
| **AuthScreen** | Card credenziali (login, registrazione, reset password) dentro l'overlay. |
| **Bootstrapping** | Fase avvio app: `AuthController.initialize()` carica manifest e ripristina focus prima di `sessionReady`. |
| **SessionRestore** | `AccountSession.restore()` — ripristina GoTrue da `alfred_auth_{userId}` o refresh token manifest. |
| **EphemeralBootstrap** | Client Supabase effimero (`createBootstrapClient`) per login/sign-up/reset — nessuna persistenza sessione, `autoRefreshToken: false`. |
| **PKCE** | Proof Key for Code Exchange — flusso auth predefinito Supabase; richiede storage code verifier anche su client effimeri. |
| **EphemeralPkceStorage** | `GotrueAsyncStorage` in RAM per il code verifier su `EphemeralBootstrap` (es. `resetPasswordForEmail`). |
| **EmptyLocalStorage** | Storage GoTrue vuoto sul bootstrap — la sessione non viene scritta su disco finché non si adotta il client dedicato. |
| **SessionAdoption** | `openAccountFromAuthResponse` — copia sessione bootstrap sul client dedicato `alfred_auth_{userId}` via `setSession`. |
| **NoSession** | Zero account nel manifest: overlay obbligatorio e non dismissibile (`SURF-AUTH-002`). |
| **SessionActive** | Almeno un account aperto e overlay nascosto — shell utilizzabile. |
| **OverlayVisible** | Overlay mostrato con account già aperti (es. «Aggiungi account»), dismissibile (`SURF-AUTH-003`). |
| **AuthOperation** | Login, registrazione o reset password in corso (`isLoading` sulla card). |
| **AuthRedirectUrl** | URL redirect per conferma email e reset password — GitHub Pages in produzione, origine locale in dev. |
| **FriendlyAuthError** | Messaggio utente derivato da `AuthException` (credenziali, sessione scaduta, username occupato, …). |

---

## Confini

| Contesto | Relazione |
|----------|-----------|
| **multi-account** | Login/sign-up crea voce manifest; `removeAccount` su ultimo account riapre `NoSession`. |
| **navigation** | Shell sempre visibile sotto overlay — nessun routing auth full-screen. |
| **shareable-link** | Con 0 account: overlay obbligatorio; dopo primo login si apre risorsa linkata. |
| **notifications** | `syncPushSubscriptions` dopo bootstrap e login/sign-up riusciti. |

---

## Invarianti

1. `HomeScreen` resta sempre montata — overlay è uno strato, non una route (`SURF-AUTH-001`).
2. Con 0 account l'overlay **non** è dismissibile (`SURF-AUTH-002`, `SURF-AUTH-011`).
3. **Non** chiamare `signOut` sul client `EphemeralBootstrap` dopo `SessionAdoption` — revoca il refresh token appena adottato.
4. Ogni account persistito usa storage dedicato `alfred_auth_{userId}`.
5. Validazione client-side (email, username, display name) prima di chiamate rete.
