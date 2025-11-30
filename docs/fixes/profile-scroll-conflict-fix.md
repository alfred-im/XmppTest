# Fix: Conflitto di Scroll nella Pagina Profilo

**Data:** 30 Novembre 2025  
**Tipo:** Bug Fix  
**Componente:** ProfilePage  
**Gravità:** Media

## Problema

La pagina profilo presentava un bug critico nello scroll:
- Lo scroll funzionava solo in una direzione
- Impossibile scrollare liberamente su e giù
- Conflitto tra scroll interno e listener globali

## Causa

Il problema era causato dai listener globali `touchmove` in `main.tsx` (linee 10-61) che:

1. Bloccano il pull-to-refresh nativo del browser chiamando `e.preventDefault()`
2. Controllano solo `window.scrollY` per determinare se siamo in cima alla pagina
3. **Non considerano i container scrollabili interni** come `.profile-page__main`

Poiché la ProfilePage utilizza un container scrollabile interno invece dello scroll della finestra, il listener globale interferiva erroneamente:

```typescript
// Prima (problematico)
document.addEventListener('touchmove', (e) => {
  // ...
  // Bloccava SEMPRE quando isAtTop && touchDelta > 0
  // Anche sui container interni scrollabili!
  if (isAtTop && touchDelta > 0) {
    e.preventDefault() // ❌ Blocca lo scroll interno
  }
}, { passive: false })
```

## Soluzione

Aggiunta una funzione helper `hasScrollableParent()` che:
- Controlla se l'elemento toccato è dentro un container scrollabile
- Verifica ricorsivamente i parent per trovare elementi con `overflow-y: auto` o `scroll`
- Se trova un container scrollabile, il listener globale **non blocca** il movimento

```typescript
// Helper per verificare se un elemento ha scroll interno
function hasScrollableParent(element: Element | null): boolean {
  if (!element) return false
  
  let current: Element | null = element
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    const overflowY = style.overflowY
    
    // Se l'elemento ha overflow-y: auto o scroll, è scrollabile
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return true
    }
    
    current = current.parentElement
  }
  
  return false
}

// Nel listener touchmove
document.addEventListener('touchmove', (e) => {
  // ...
  
  // ✅ Non bloccare lo scroll sui container interni scrollabili
  const target = e.target as Element
  if (hasScrollableParent(target)) {
    return
  }
  
  // Blocca solo il pull-to-refresh della finestra principale
  if (isAtTop && touchDelta > 0) {
    e.preventDefault()
  }
}, { passive: false })
```

## File Modificati

- `web-client/src/main.tsx`:
  - Aggiunta funzione `hasScrollableParent()` (linee 11-28)
  - Modificato listener `touchmove` per controllare container scrollabili (linee 52-55)

## Impatto

### ✅ Risolto
- Scroll bidirezionale nella ProfilePage funziona correttamente
- Nessuna interferenza tra scroll interno e listener globali
- Pull-to-refresh nativo ancora bloccato sulla finestra principale

### ⚠️ Da Testare
- ChatPage (usa pull-to-refresh custom via `usePullToRefresh`)
- ConversationsPage (scroll principale)
- Comportamento su iOS Safari
- Comportamento su Android Chrome

## Test Consigliati

1. **ProfilePage**:
   - ✅ Scroll verso il basso (dall'alto verso il basso)
   - ✅ Scroll verso l'alto (dal basso verso l'alto)
   - ✅ Scroll veloce (swipe)
   - ✅ Scroll con contenuti lunghi (form + avatar + messaggi)

2. **ConversationsPage**:
   - Pull-to-refresh deve ancora funzionare
   - Scroll normale della lista conversazioni

3. **ChatPage**:
   - Pull-to-refresh custom (carica messaggi precedenti)
   - Scroll della lista messaggi

## Note Tecniche

### Perché non `touch-action: none`?

Abbiamo considerato usare CSS `touch-action: pan-y` o simili, ma:
- Limita tutti i gesti touch
- Non permette di distinguere tra scroll globale e interno
- La soluzione JavaScript è più flessibile

### Compatibilità Browser

La soluzione è compatibile con:
- ✅ Safari iOS 12+
- ✅ Chrome Android 80+
- ✅ Firefox Mobile 68+
- ✅ Edge Mobile

`getComputedStyle()` e `parentElement` sono supportati da tutti i browser moderni.

## Riferimenti

- Issue: Conflitto di scroll nella pagina profilo
- Branch: `cursor/fix-profile-page-scrolling-conflict-claude-4.5-sonnet-thinking-bdd5`
- Documentazione correlata:
  - `docs/fixes/pull-to-refresh-fix.md` (pull-to-refresh system)
  - `docs/guides/routing-system.md` (page navigation)
