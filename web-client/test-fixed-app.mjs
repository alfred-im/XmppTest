import { chromium } from 'playwright';

async function testFixedApp() {
  console.log('🚀 Test app corretta...');
  
  const browser = await chromium.launch({
    headless: true
  });
  
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }
  });
  
  const page = await context.newPage();
  
  // Raccogli messaggi console
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    logs.push({ type, text });
    console.log(`[${type.toUpperCase()}]`, text);
  });
  
  page.on('pageerror', error => {
    console.error('❌ PAGE ERROR:', error.message);
  });
  
  try {
    console.log('📱 Navigazione e pulizia database...');
    
    await page.goto('http://localhost:5173/XmppTest/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Aspetta che la pagina sia caricata
    await page.waitForTimeout(2000);
    
    // Pulisci il database via IndexedDB
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const dbs = ['conversations-db', 'messages-db', 'metadata-db', 'vcard-db'];
        let deleted = 0;
        
        dbs.forEach(dbName => {
          const req = indexedDB.deleteDatabase(dbName);
          req.onsuccess = () => {
            console.log(`🗑️ Database ${dbName} eliminato`);
            deleted++;
            if (deleted === dbs.length) resolve();
          };
          req.onerror = () => {
            console.log(`⚠️ Errore eliminazione ${dbName}`);
            deleted++;
            if (deleted === dbs.length) resolve();
          };
        });
      });
    });
    
    console.log('✅ Database pulito, ricarico pagina...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log('🔑 Compilazione form di login...');
    const usernameInput = await page.locator('input[type="text"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const submitButton = await page.locator('button:has-text("Collegati")').first();
    
    await usernameInput.fill('testardo@conversations.im');
    await passwordInput.fill('FyqnD2YpGScNsuC');
    
    await page.screenshot({ path: '/workspace/web-client/test-fixed-1-before-login.png' });
    
    console.log('🖱️  Click su Collegati...');
    await submitButton.click();
    
    // Aspetta la sync completa
    console.log('⏳ Attesa sync (max 20 secondi)...');
    
    // Aspetta che il messaggio "Conversazioni ricaricate dal DB" appaia nei log
    let syncCompleted = false;
    for (let i = 0; i < 40 && !syncCompleted; i++) {
      await page.waitForTimeout(500);
      syncCompleted = logs.some(log => log.text.includes('Conversazioni ricaricate dal DB'));
    }
    
    if (syncCompleted) {
      console.log('✅ Sync completata!');
    } else {
      console.log('⚠️ Timeout sync (forse è comunque completata)');
    }
    
    // Aspetta ancora un po' per il rendering
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/workspace/web-client/test-fixed-2-after-sync.png' });
    
    // Controlla se ci sono conversazioni nella UI
    const conversationItems = await page.locator('.conversation-item, [class*="conversation"]').count();
    const noConversationsText = await page.locator('text="Nessuna conversazione"').count();
    
    console.log('\n📊 Risultati:');
    console.log(`- Elementi conversazione trovati: ${conversationItems}`);
    console.log(`- Testo "Nessuna conversazione": ${noConversationsText > 0 ? 'Sì' : 'No'}`);
    
    // Controlla i log per confermare che le conversazioni siano state salvate
    const syncLogs = logs.filter(log => 
      log.text.includes('Full sync completata') || 
      log.text.includes('conversazioni') ||
      log.text.includes('Conversazioni ricaricate')
    );
    
    console.log('\n📝 Log rilevanti:');
    syncLogs.forEach(log => {
      console.log(`  - ${log.text}`);
    });
    
    // Screenshot finale
    await page.screenshot({ path: '/workspace/web-client/test-fixed-3-final.png', fullPage: true });
    
    if (conversationItems > 0) {
      console.log('\n✅ TEST PASSATO: Le conversazioni vengono visualizzate!');
      return true;
    } else if (noConversationsText > 0) {
      console.log('\n❌ TEST FALLITO: Nessuna conversazione visualizzata');
      return false;
    } else {
      console.log('\n⚠️ TEST INCERTO: Non riesco a determinare lo stato');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testFixedApp().then(passed => {
  process.exit(passed ? 0 : 1);
});
