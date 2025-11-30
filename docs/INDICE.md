# 📚 Indice Documentazione Alfred

## Navigazione Rapida

- [🚀 Quick Start](#quick-start)
- [📖 Guide](#guide)
- [🏗️ Architettura](#architettura)
- [🔧 Implementazione](#implementazione)
- [🎨 Design](#design)
- [📝 Decisioni Architetturali](#decisioni-architetturali)
- [🗂️ Archivio](#archivio)

---

## 🚀 Quick Start

Per iniziare rapidamente con Alfred:

1. **[README](../README.md)** - Panoramica del progetto e setup iniziale
2. **[CHANGELOG](../CHANGELOG.md)** - Storia delle modifiche e versioni
3. **[Brand Identity](./design/brand-identity.md)** - Colori e stile
4. **[Architecture Overview](./architecture/README.md)** - Architettura generale

---

## 📖 Guide

### Guide Utente
- Coming soon

### Guide Sviluppatore
- **[Sistema Routing](./guides/routing-system.md)** - Gestione delle rotte e navigazione

---

## 🏗️ Architettura

### Documentazione Architetturale
- **[Panoramica](./architecture/README.md)** - Overview architetturale
- **[Analisi Conversazioni](./architecture/conversations-analysis.md)** - Gestione conversazioni
- **[Strategia MAM Globale](./architecture/mam-global-strategy-explained.md)** - Message Archive Management
- **[Performance MAM Long-term](./architecture/mam-performance-long-term.md)** - Ottimizzazioni MAM
- **[Confronto Strategie](./architecture/strategy-comparison.md)** - Comparazione approcci

---

## 🔧 Implementazione

### Implementazioni Completate
- **[Login System](./implementation/login-system.md)** - Sistema di login con popup
- **[Sync System Complete](./implementation/sync-system-complete.md)** - Sistema di sincronizzazione completo
- **[Scrollable Containers](./implementation/scrollable-containers.md)** - Classe utility per contenitori scrollabili
  - **[Dettagli Tecnici](./implementation/scrollable-containers-implementation.md)** - Implementazione dettagliata

### Fix e Ottimizzazioni
- **[Panoramica Fix](./fixes/README.md)** - Overview fix applicati
- **[Pull-to-Refresh Fix](./fixes/pull-to-refresh-fix.md)** - Correzione pull-to-refresh
- **[Profile Save Error Fix](./fixes/profile-save-error-fix.md)** - Gestione errori salvataggio profilo
- **[Profile Scroll Conflict Fix](./fixes/profile-scroll-conflict-fix.md)** - Risoluzione conflitti scroll
- **[Profile Scroll Fix](./fixes/profile-scroll-fix.md)** - Fix scroll pagina profilo
- **[vCard Photo Base64 Fix](./fixes/vcard-photo-base64-string-fix.md)** - Fix formato foto profilo
- **[vCard Photo Server Issue](./fixes/vcard-photo-server-issue.md)** - Analisi problemi server vCard
- **[Known Issues](./fixes/known-issues.md)** - Problemi noti e soluzioni

---

## 🎨 Design

- **[Design Guidelines](./design/README.md)** - Linee guida design generali
- **[Brand Identity](./design/brand-identity.md)** - Identità visiva e colori
- **[Database Architecture](./design/database-architecture.md)** - Architettura database locale

---

## 📝 Decisioni Architetturali

Documenti che spiegano le scelte architetturali importanti (ADR - Architecture Decision Records):

- **[Panoramica Decisioni](./decisions/README.md)** - Overview decisioni architetturali
- **[No Message Deletion](./decisions/no-message-deletion.md)** - Perché non implementare cancellazione messaggi XMPP

---

## 🗂️ Archivio

Documenti di ricerca e analisi storiche (mantenuti per riferimento):

### XMPP Research
- **[XMPP Deletion Comprehensive Analysis](./archive/xmpp-research/xmpp-deletion-comprehensive-analysis.md)** - Analisi approfondita cancellazione messaggi
- **[XMPP Message Deletion Research](./archive/xmpp-research/xmpp-message-deletion-research.md)** - Ricerca iniziale
- **[XMPP Hide Message History](./archive/xmpp-research/xmpp-hide-message-history.md)** - Opzioni per nascondere messaggi
- **[XMPP Hide Conversation Flag](./archive/xmpp-research/xmpp-hide-conversation-flag.md)** - Flag per conversazioni nascoste
- **[XEP-0424 Support Analysis](./archive/xmpp-research/xep-0424-support-analysis.md)** - Supporto Message Retraction

### Documentazione Storica
- **[Panoramica Archivio](./archive/README.md)** - Overview documenti archiviati
- **[Old Docs](./archive/old-docs/)** - Documenti obsoleti pre-refactoring

---

## 📋 Convenzioni

### Nomenclatura File
- `README.md` - Panoramica di cartella/modulo
- `[nome]-analysis.md` - Analisi approfondita
- `[nome]-guide.md` - Guida pratica
- `[nome]-fix.md` - Documentazione fix/correzione

### Categorie
- **guides/** - Guide pratiche
- **architecture/** - Documentazione architetturale
- **implementation/** - Dettagli implementazione
- **design/** - Design e UI/UX
- **decisions/** - ADR (Architecture Decision Records)
- **fixes/** - Bug fix e ottimizzazioni
- **archive/** - Documenti obsoleti ma conservati

---

## 🔍 Come Navigare

1. **Se sei nuovo**: Inizia dal [README](../README.md) e [Architecture Overview](./architecture/README.md)
2. **Se cerchi guide**: Vai a [📖 Guide](#guide)
3. **Se vuoi capire l'architettura**: Vai a [🏗️ Architettura](#architettura)
4. **Se cerchi dettagli implementativi**: Vai a [🔧 Implementazione](#implementazione)
5. **Se vuoi sapere il "perché"**: Vai a [📝 Decisioni Architetturali](#decisioni-architetturali)

---

---

## 📋 Manutenzione Documentazione

### Dove Trovare
- **Storico completo modifiche**: [CHANGELOG.md](../CHANGELOG.md)
- **Credenziali test**: [TEST_CREDENTIALS.md](../TEST_CREDENTIALS.md)
- **Regole sviluppo**: [.cursor-rules.md](../.cursor-rules.md)
- **Procedura revisione**: [PROCEDURA_REVISIONE_GENERALE.md](../PROCEDURA_REVISIONE_GENERALE.md)

### Come Contribuire
1. Leggi le convenzioni in questa pagina
2. Usa nomenclatura standard per nuovi documenti
3. Aggiorna questo indice quando aggiungi documentazione
4. Mantieni CHANGELOG.md aggiornato per modifiche significative

---

**Ultimo aggiornamento**: 30 Novembre 2025  
**Versione documentazione**: 3.0  
**Documenti obsoleti rimossi**: 17 file consolidati in CHANGELOG.md
