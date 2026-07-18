# Contesto: notifications

**Stato modellazione:** `draft`

Vedi [bounded-contexts.md](../bounded-contexts.md) e [metodo dominio](../README.md).

## Artefatti

| File | Stato |
|------|-------|
| [glossary.md](./glossary.md) | compilato |
| [commands-and-events.md](./commands-and-events.md) | compilato |
| [UML client state](../../model/uml/notifications/notifications-client-state.puml) | compilato |
| [UML SW state](../../model/uml/notifications/notifications-sw-state.puml) | compilato |
| Sequenze `seq-*.puml` | compilate |
| [statechart](../../../client/lib/machines/notifications/) | draft (non ancora cablato su tutti gli ingressi legacy) |

## Adapter verso navigation

Tap notifica → comando `OpenFromPushTap` → contesto `navigation` (`seq-notification-click.puml`).

## SDD (confine prodotto, non duplicazione)

[PROM-PUSH-NOTIFY](../../specs/promises/product/PROM-PUSH-NOTIFY.md) · [SURF-NOTIFICATIONS](../../specs/surfaces/SURF-NOTIFICATIONS.md) · [SYS-PUSH](../../specs/promises/system/SYS-PUSH.md)
