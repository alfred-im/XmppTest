# Principio: Non Toccare Mai la Fonte

**Data**: 2025-12-22  
**Status**: Regola Maestra  
**Categoria**: Architettura

---

## Principio Fondamentale

**NON SI TOCCA MAI LA FONTE DEI DATI**

La "fonte" include:
- Database locale (IndexedDB)
- Dati sincronizzati dal server
- Messaggi salvati da MAM
- Repository layer
- Sync layer

---

## Cosa Significa

### ✅ Permesso:
- Leggere dati
- **Filtrare** in fase di lettura/rendering
- **Trasformare** per visualizzazione UI
- Aggiungere logica di presentazione

### ❌ Vietato:
- Modificare dati salvati
- Eliminare messaggi dal database
- "Pulire" o "normalizzare" dati sincronizzati
- Cambiare struttura dati alla fonte

---

## Razionale

1. **Server as Source of Truth**: Il server XMPP è l'unica fonte di verità
2. **Sync Integrity**: La sincronizzazione deve riflettere fedelmente il server
3. **Multi-device**: Altri device devono vedere gli stessi dati
4. **Debugging**: Dati originali devono essere disponibili per analisi
5. **Rollback**: Modifiche UI non devono compromettere dati

---

## Esempi

### ❌ SBAGLIATO:
```
Problema: Messaggi vuoti nella chat
Soluzione sbagliata: Filtrare messaggi vuoti prima di salvarli nel DB
```

### ✅ CORRETTO:
```
Problema: Messaggi vuoti nella chat
Soluzione corretta: Filtrare messaggi vuoti nel rendering della UI
```

---

## Corollari

- **UI Layer è Stateless**: La UI legge e presenta, non modifica
- **Filtri in Read, Mai in Write**: Filtri applicati quando si leggono dati
- **Repository Restituisce Tutto**: I repository non fanno pre-filtering
- **Rendering Fa le Scelte**: La UI decide cosa mostrare

---

## Eccezioni

Nessuna eccezione. Questa è una regola assoluta.

Se pensi serva modificare la fonte, stai sbagliando approccio.
