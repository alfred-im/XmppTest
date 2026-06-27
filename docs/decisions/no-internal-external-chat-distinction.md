# Nessuna distinzione chat interna / esterna

**Data**: 2026-06-27  
**Status**: ✅ Accettata — **regola vincolante**  
**Categoria**: Chat, UX, client  
**Correlata**: [project-revolution-discovery.md](./project-revolution-discovery.md) (protocollo invisibile in UI), [bridge-stateless.md](./bridge-stateless.md)

---

## Regola

**La distinzione tra chat interna e chat esterna NON ESISTE e NON DEVE ESISTERE.**

È **vietata a qualsiasi livello**: UI, logica client, controller, widget, test di comportamento, documentazione funzionale del prodotto.

Ogni conversazione è **una sola chat**, con lo stesso comportamento — inclusi scroll, aggancio al fondo, elementi UI correlati, composer, indicatori, spunte visuali, e ogni altra feature della vista conversazione.

---

## Cosa significa

### ✅ Unica esperienza

- Un solo percorso di implementazione per tutte le conversazioni
- Stesse regole di scroll e aggancio al fondo per ogni chat
- Stessi componenti e stessi stati UI; nessun ramo «se interna / se esterna»

### ❌ Vietato

- Branch del tipo `if (protocol == 'internal')` / `else` per **comportamento** della chat
- Implementazioni parallele (es. due `ChatPanel`, due logiche di scroll)
- Etichette, badge o sottotitoli che classificano la chat come «interna», «esterna», «Alfred», «in attesa bridge», ecc. nella vista conversazione
- Documentare o progettare feature chat come «solo per interne» o «solo per federate»
- Test che assumono comportamenti diversi per tipo di chat

---

## Protocollo nei dati (non è una distinzione di chat)

Il campo `protocol` su contatto/conversazione resta **metadato di routing invisibile** verso i bridge (XMPP/Matrix): serve alla piattaforma e ai worker, non all'utente e non alla logica di presentazione della chat.

Coerente con [project-revolution-discovery.md](./project-revolution-discovery.md): l'utente vede persone e chat, non protocolli.  
**Il routing federato non giustifica due chat diverse nel client.**

---

## Implicazioni per l'aggancio al fondo

L'aggancio al fondo della conversazione (scroll ancorato, stacco quando si legge lo storico, riaggancio, eventuali controlli UI correlati) si applica **identicamente a tutte le conversazioni**, senza eccezioni.

---

## Violazioni note da eliminare (refactor futuro)

Il client Flutter su `main` contiene ancora ramificazioni su `conversation.protocol` (es. sottotitolo header chat). Sono **debito tecnico** rispetto a questa regola, non pattern da replicare.

---

## Riferimenti

- [project-revolution-discovery.md](./project-revolution-discovery.md) — protocollo invisibile in UI
- [server-as-reception.md](./server-as-reception.md) — semantica spunte lato server (indipendente dalla distinzione chat in UI)
