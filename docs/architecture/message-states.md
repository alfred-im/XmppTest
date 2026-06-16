# Stati del messaggio — Policy di sviluppo

**Versione**: 1.0  
**Data**: 2026-06-16  
**Stato**: Policy attiva per implementazione

---

## Principio fondamentale

Ogni flusso ha **due fasi**:

1. **`ui`** — aggiornamento grafico immediato (campanello / azione utente)
2. **`synced`** — dato autoritativo da MAM nel database locale

Il listener real-time **non scrive il corpo dei messaggi nel DB**.  
Solo **MAM** persiste messaggi e marker nel database messaggi.

---

## Tre flussi paralleli

| Flusso | `ui` (campanello / azione) | `synced` (MAM → DB) |
|--------|----------------------------|---------------------|
| **Invio** | Messaggio mostrato in chat; outbox se offline | MAM conferma e salva |
| **Ricezione** | Campanello → messaggio in UI | MAM scarica e salva |
| **Lettura** | Campanello marker → spunta in UI | MAM allinea marker nel DB |

`none` su un asse = quell’asse non si applica al messaggio (es. ricezione su messaggio inviato da te).

### Invio (messaggi tuoi)

```
queued → ui → synced
   ↑ send_failed / offline (outbox persistito)
```

- **`queued`**: in outbox IndexedDB; sopravvive a disconnessione
- **`ui`**: visibile in chat prima di MAM
- **`synced`**: presente nel DB da MAM

### Ricezione (messaggi in arrivo)

```
ui → synced
```

### Lettura (spunte su messaggi inviati da te)

```
ui → synced
```

---

## Spunte in UI (solo grafica)

Tre livelli visivi, **indipendenti** dagli stati DB:

| Livello UI | Aspetto | Significato |
|------------|---------|-------------|
| **Inviato** | ✓ grigia | Messaggio accettato dal server |
| **Ricevuto** | ✓✓ grigie | Arrivato sul dispositivo dell’altro |
| **Lettura** | ✓✓ blu | L’altro ha visto / letto il messaggio |

### Mapping protocollo XMPP → UI

| Marker XMPP (DB) | Stato UI spunta |
|------------------|-----------------|
| — (solo `status: sent`) | ✓ grigia |
| `received` | ✓✓ grigie |
| `displayed` | ✓✓ blu (lettura) |
| `acknowledged` | ✓✓ blu (lettura) |

`displayed` e `acknowledged` sono **distinti nel DB** ma **un solo stato grafico “lettura”** (✓✓ blu).

### Stato implementazione spunte

| Funzionalità | Stato |
|--------------|-------|
| ✓ grigia (inviato) | ✅ Implementato |
| ✓✓ blu (lettura da `displayed` / `acknowledged`) | ✅ Parziale — da unificare in un solo stato UI `reading` |
| ✓✓ grigie (ricevuto, `received`) | ⏳ **Da implementare** (listener + UI + sync MAM) |
| Modello `ui` → `synced` per lettura | ⏳ **Da implementare** (overlay UI + MAM, no salvataggio marker dal listener) |

---

## Dove vive ogni dato

| Layer | Contenuto |
|-------|-----------|
| **Outbox** (IndexedDB) | Messaggi in uscita: `queued`, `sending`, `failed` |
| **UI virtuale** (React) | Messaggi e overlay spunte in fase `ui` |
| **DB messaggi** (IndexedDB) | Solo dati `synced` da MAM |
| **Metadata sync** | Watermark / token per query MAM |

---

## Trigger sync MAM (campanello)

All’evento real-time (messaggio, marker):

1. Aggiorna UI (`ui`)
2. Schedula fetch MAM con `start = ora − 2 secondi` (debounce per conversazione)
3. MAM salva nel DB → `synced`
4. UI sostituisce / rimuove il virtuale; overlay spunte allineati al DB

---

## Riferimenti

- [sync-system-complete.md](../implementation/sync-system-complete.md) — Sync-once + listen
- [chat-markers-xep-0333.md](../implementation/chat-markers-xep-0333.md) — Marker XEP-0333 (da allineare a questa policy)
