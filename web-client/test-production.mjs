import { chromium } from 'playwright';

async function testProduction() {
  console.log('🌐 Test versione PRODUZIONE su GitHub Pages...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  
  const logs = [];
  const errors = [];
  
  page.on('console', msg => {
    const log = { type: msg.type(), text: msg.text() };
    logs.push(log);
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[${log.type.toUpperCase()}] ${log.text}`);
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('❌ PAGE ERROR:', error.message);
    console.error(error.stack);
  });
  
  try {
    console.log('📱 Navigando a https://alfred-im.github.io/XmppTest/\n');
    
    await page.goto('https://alfred-im.github.io/XmppTest/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    
    // Screenshot iniziale
    await page.screenshot({ path: '/workspace/web-client/prod-1-initial.png' });
    console.log('📸 Screenshot iniziale salvato\n');
    
    // Controlla cosa è visibile
    const bodyText = await page.evaluate(() => document.body.innerText);
    const bgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    
    console.log(`🎨 Colore sfondo: ${bgColor}`);
    console.log(`📄 Testo visibile:\n${bodyText.substring(0, 300)}\n`);
    
    // Controlla se c'è il popup di login
    const hasLoginPopup = await page.locator('input[type="text"], input[type="password"]').count() > 0;
    console.log(`🔐 Popup di login: ${hasLoginPopup ? 'PRESENTE' : 'ASSENTE'}`);
    
    if (hasLoginPopup) {
      console.log('\n🔑 Compilando credenziali...');
      await page.locator('input[type="text"]').first().fill('testardo@conversations.im');
      await page.locator('input[type="password"]').first().fill('FyqnD2YpGScNsuC');
      
      await page.screenshot({ path: '/workspace/web-client/prod-2-before-login.png' });
      
      console.log('🖱️  Click su pulsante login...\n');
      await page.locator('button:has-text("Collegati")').first().click();
      
      // Monitora il processo di caricamento
      console.log('⏳ Monitoraggio caricamento (30 secondi)...\n');
      
      for (let i = 1; i <= 30; i++) {
        await page.waitForTimeout(1000);
        
        // Controlla elementi chiave
        const hasSplash = await page.locator('.splash-screen').count() > 0;
        const splashVisible = hasSplash ? await page.locator('.splash-screen').isVisible() : false;
        const hasConversations = await page.locator('.conversation-item').count();
        const currentBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
        const currentText = await page.evaluate(() => document.body.innerText.substring(0, 150));
        
        // Log solo cambiamenti significativi
        if (i === 1 || i === 5 || i === 10 || i === 15 || i === 20 || i === 30 || splashVisible || hasConversations > 0) {
          console.log(`⏱️  Secondo ${i}:`);
          console.log(`   - Splash: ${splashVisible ? 'VISIBILE' : 'no'}`);
          console.log(`   - Conversazioni: ${hasConversations}`);
          console.log(`   - Sfondo: ${currentBg}`);
          console.log(`   - Testo: ${currentText.replace(/\n/g, ' ').substring(0, 80)}...`);
          
          // Screenshot se è sfondo blu (splash screen)
          if (splashVisible) {
            await page.screenshot({ path: `/workspace/web-client/prod-splash-${i}s.png` });
            console.log(`   📸 Screenshot splash salvato!`);
          }
          
          console.log('');
        }
        
        // Se vediamo conversazioni, fermiamoci
        if (hasConversations > 0) {
          console.log('✅ Conversazioni visualizzate!\n');
          break;
        }
      }
      
      // Screenshot finale
      await page.screenshot({ path: '/workspace/web-client/prod-3-final.png', fullPage: true });
      console.log('📸 Screenshot finale salvato\n');
      
      // Analisi finale
      const finalConversations = await page.locator('.conversation-item').count();
      const finalText = await page.evaluate(() => document.body.innerText);
      const finalBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 RISULTATO FINALE:');
      console.log(`   - Conversazioni: ${finalConversations}`);
      console.log(`   - Errori JS: ${errors.length}`);
      console.log(`   - Sfondo: ${finalBg}`);
      console.log(`\n📄 Contenuto finale:\n${finalText.substring(0, 500)}`);
      
      if (errors.length > 0) {
        console.log('\n❌ ERRORI TROVATI:');
        errors.forEach(err => console.log(`   - ${err}`));
      }
      
      // Log rilevanti
      const relevantLogs = logs.filter(log => 
        log.text.includes('sync') || 
        log.text.includes('error') ||
        log.text.includes('Splash') ||
        log.text.includes('completata')
      );
      
      if (relevantLogs.length > 0) {
        console.log('\n📝 Log rilevanti:');
        relevantLogs.slice(-10).forEach(log => {
          console.log(`   [${log.type}] ${log.text}`);
        });
      }
    }
    
  } catch (error) {
    console.error('\n❌ Errore durante il test:', error.message);
    await page.screenshot({ path: '/workspace/web-client/prod-ERROR.png' });
  } finally {
    await browser.close();
  }
}

testProduction();
