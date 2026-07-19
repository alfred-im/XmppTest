# Aggancio al fondo conversazione

**Backlog SDD**: `PROM-BOTTOM-ANCHOR` in [registry.md](../specs/registry.md) — non ancora promessa PRODUCT.

---

## Comportamento

| Stato | Condizione | Effetto |
|-------|------------|---------|
| Agganciato | Entro 48 px dal fondo | Nuovi messaggi → auto-scroll |
| Staccato | Scroll verso storico | Nuovi messaggi altrui non spostano la vista |
| Riaggancio | Scroll al fondo o tap pulsante ↓ | Riprende agganciato; badge azzerato |
| Pulsante ↓ | Visibile solo se staccato | Tap → scroll animato al fondo; badge = messaggi arrivati mentre staccato |

Regole:

1. Apertura chat → fondo (agganciato)
2. Messaggio inviato dall'utente → sempre fondo
3. Soglia: `ConversationScrollAnchor.defaultThreshold` = 48 px

---

## Implementazione

`AnchoredMessageList` — `ListView` reverse in `anchored_message_list.dart`.

### Pulsante salta al fondo (`_JumpToBottomButton`)

Quando la lista è **staccata** (`!_isAttached`), compare in basso a destra un FAB circolare con icona `keyboard_arrow_down` (↓). Ogni batch di messaggi in arrivo mentre l'utente legge lo storico incrementa `_pendingBelow`; il badge rosso sul pulsante mostra il conteggio (cap `99+`). Tap su ↓: `animateTo(0)`, `_isAttached = true`, `_pendingBelow = 0`. Riaggancio manuale scrollando al fondo azzera il badge senza animazione dedicata.

File: `anchored_message_list.dart` (`_JumpToBottomButton`, `_onJumpTap`, `didUpdateWidget`)
