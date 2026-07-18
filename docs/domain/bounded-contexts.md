# Bounded context — Alfred

**Ultima revisione**: 2026-07-18

Ogni riga è un **contesto delimitato** (DDD): propri glossario, comandi/eventi e diagrammi UML. I contesti comunicano tramite comandi ed eventi espliciti, non logica condivisa implicita nel codice.

| Contesto | Cartella dominio | Cartella UML | Statechart client | Promesse SDD correlate (esempi) |
|----------|------------------|--------------|-------------------|--------------------------------|
| **auth** | [auth/](./auth/) | `docs/model/uml/auth/` | `client/lib/machines/auth/` | SURF-AUTH |
| **multi-account** | [multi-account/](./multi-account/) | `docs/model/uml/multi-account/` | `client/lib/machines/multi-account/` | PROM-MULTI-ACCOUNT |
| **navigation** | [navigation/](./navigation/) | `docs/model/uml/navigation/` | `client/lib/machines/navigation/` | PROM-SHAREABLE-LINK (ingresso) |
| **messaging** | [messaging/](./messaging/) | `docs/model/uml/messaging/` | `client/lib/machines/messaging/` | SYS-MAILBOX, PROM-MESSAGE-STATUS |
| **reception** | [reception/](./reception/) | `docs/model/uml/reception/` | `client/lib/machines/reception/` | SYS-RECEPTION, PROM-RECEPTION-FILTER |
| **delivery** | [delivery/](./delivery/) | `docs/model/uml/delivery/` | no | SYS-DELIVERY |
| **contacts** | [contacts/](./contacts/) | `docs/model/uml/contacts/` | `client/lib/machines/contacts/` | PROM-PERSONAL-CONTACTS, SURF-CONTACTS |
| **groups** | [groups/](./groups/) | `docs/model/uml/groups/` | no (controller) | SYS-GROUP |
| **media** | [media/](./media/) | `docs/model/uml/media/` | no (UI in ChatInputBar) | PROM-CHAT-MEDIA |
| **notifications** | [notifications/](./notifications/) | `docs/model/uml/notifications/` | `client/lib/machines/notifications/` | PROM-PUSH-NOTIFY, SURF-NOTIFICATIONS |
| **shareable-link** | [shareable-link/](./shareable-link/) | `docs/model/uml/shareable-link/` | `client/lib/machines/shareable-link/` | PROM-SHAREABLE-LINK |
| **profile** | [profile/](./profile/) | `docs/model/uml/profile/` | `client/lib/machines/profile/` | PROM-PROFILE-IDENTITY, SURF-PROFILE |
| **federation** | [federation/](./federation/) | `docs/model/uml/federation/` | no | bridge futuri |

## Dipendenze principali (solo riferimento)

```text
notifications ──OpenFromPushTap──► navigation
shareable-link ──OpenFromShareableLink──► navigation
navigation ──FocusAccount──► multi-account
multi-account ──sessione──► auth
messaging ──RPC──► reception, delivery
groups ──broadcast/owner──► delivery, reception
federation ──outbox queued──► delivery (consumer bridge stub)
```

## Stato modellazione

| Stato | Significato |
|-------|-------------|
| `scheletro` | Cartella creata; glossario e UML da compilare |
| `draft` | Modello in bozza |
| `approved` | Modello congelato — si implementa |
| `implemented` | Codice allineato al modello su `main` |

Tutti i contesti sono **`implemented`**.
