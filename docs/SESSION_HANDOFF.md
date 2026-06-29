# Handoff sessione — 2026-06-29

Documento per AI — stato al passaggio a nuova chat. **Leggere prima di qualsiasi task.**

---

## Branch e PR

| Item | Stato |
|------|--------|
| Branch lavoro | `cursor/debug-add-account-session-bb4e` |
| PR | #142 (draft) — auth bootstrap + PKCE + doc |
| `main` | Ha PR #140 (multi-account), #141 (fast path parziale, **ancora con `signOut` bootstrap**) |
| Alpha live | https://alfred-im.github.io/XmppTest/ — ultimo `deploy-alpha` riuscito, **non** necessariamente `main` |

**Prossimo passo operativo**: merge #142 su `main`, push, attendere deploy-alpha.

---

## Fix in PR #142 (da mergiare)

1. **Rimosso** `bootstrap.auth.signOut()` dopo login/signup → non revoca refresh token condiviso.
2. **`EphemeralPkceStorage`** su bootstrap → recupero password PKCE senza crash null.
3. Test live `password_reset_live_test.dart` (tag `live`).
4. Doc: account agente, regole debug, deploy Alpha, handoff.

---

## Topic aperti (nessun fix senza accordo utente)

| Topic | Doc |
|-------|-----|
| Logout solo dispositivo corrente | `docs/decisions/single-device-logout-open.md` |
| Chat vuota / illeggibile | `docs/fixes/conversations-empty-diagnosis.md` — non riprodotto; checklist utente |
| Rate limit email Supabase (~2/h SMTP integrato) | Config dashboard / SMTP custom — non fatto |

---

## Regole operative agente

- **Non toccare** password/dati `test1`/`test2`/`test3` — solo `alfredagent1`/`alfredagent2`.
- **Non fare** `POST /auth/v1/logout` su account utente (revoca globale).
- Debug = trovare causa; fix strutturali solo se utente dice esplicitamente procedere.
- `.cursor-rules.md`: NON sviluppare senza comando esplicito; eccezione documentazione/handoff su richiesta merge.

---

## Incidenti sessione

1. Password test1/test2 sovrascritte per errore → ripristinate dall'utente a `FyqnD2YpGScNsuC` (2026-06-29).
2. Test curl logout test1 → logout globale utente (spiegato: revoca refresh GoTrue).

---

## Verifica pre-merge

```bash
cd client && bash scripts/verify.sh
```

---

## Indice doc aggiornato

Vedi `docs/INDICE.md` — voci fix auth, handoff, single-device logout.
