# Design - Riferimenti Tecnici

Principi design e decisioni architetturali design-related. Documento per AI.

**Note**: Informazioni brand e architettura database sono state integrate in `PROJECT_MAP.md` nella sezione Design System e Principi Architetturali.

## Principi CSS (Riferimento Rapido)

**Layout**: Prediligere SEMPRE flexbox. Grid solo per layout bidimensionali complessi.

**Utility Classes**: `.scrollable-container` per scroll verticale con touch support (vedi `../implementation/scrollable-containers.md`)

**Colore Primario**: `#2D2926` (Dark Charcoal)

**Typography**: Inter, SF Pro Display, system-ui

**Components**: Radius 8-12px, shadow sottili, transitions 150-300ms

**Breakpoints**: Mobile-first, tablet 768px, desktop 1024px, touch targets min 48px
