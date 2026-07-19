# PROM-CONVERSATION-SCOPE — Ambito unico conversazione attiva

| Campo | Valore |
|-------|--------|
| **Promessa ID** | `PROM-CONVERSATION-SCOPE` |
| **Classe** | PRODUCT |
| **Status** | `approved` |
| **Ultima revisione** | 2026-07-19 |

Un solo ambito atomico `(owner_user_id, peer_profile_id, session_epoch)` governa load, realtime, invio e render messaggi. `activePeer` in view-state è un suggerimento UI, non autorità sui messaggi.

---

## Promesse

| ID | Promessa |
|----|----------|
| **PROM-CONVERSATION-SCOPE-001** | `ConversationScope` identifica account + peer + generazione sessione GoTrue (cambia su restore/dispose, non su token refresh) |
| **PROM-CONVERSATION-SCOPE-002** | `AccountManager.commitScope` registra ambito solo se la sessione in RAM corrisponde |
| **PROM-CONVERSATION-SCOPE-003** | Switch focus o chiusura chat invalida l'ambito commesso |
| **PROM-CONVERSATION-SCOPE-004** | Dopo restore focus, `syncCommittedScopeFromViewState` riallinea ambito se c'è un peer ricordato valido |
| **PROM-CONVERSATION-SCOPE-005** | UI chat e `MessagesController` non mostrano messaggi se l'ambito non è commesso e coerente |
| **PROM-CONVERSATION-SCOPE-006** | Fetch/realtime ignorano risultati se l'ambito non è più attivo (generation guard) |
| **PROM-CONVERSATION-SCOPE-007** | Apertura chat (inbox, push, link, compose) passa da navigation che committa scope |

---

## Tracciabilità

| PROM-ID | Verifica |
|---------|----------|
| PROM-CONVERSATION-SCOPE-001–004 | `client/test/unit/conversation_scope_test.dart` |
| PROM-CONVERSATION-SCOPE-005–007 | `client/test/widget/push_notification_listener_test.dart`; `client/test/composition/messaging_session_scope_test.dart` |

Gate: `bash scripts/check-spec-sync.sh` + `cd client && bash scripts/verify.sh`
