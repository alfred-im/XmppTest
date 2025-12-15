import { chromium } from 'playwright';

async function testDetailedStartup() {
  console.log('🔍 Test dettagliato dello startup dell\'app\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  
  page.on('console', msg => console.log(`[${msg.type()}]`, msg.text()));
  page.on('pageerror', error => console.error('❌', error.message));
  
  try {
    // Pulisci database prima
    console.log('🗑️  Pulizia database...');
    await page.goto('http://localhost:5173/XmppTest/');
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => {
      return Promise.all([
        indexedDB.deleteDatabase('conversations-db'),
        indexedDB.deleteDatabase('messages-db'),
        indexedDB.deleteDatabase('metadata-db'),
        indexedDB.deleteDatabase('vcard-db')
      ]);
    });
    
    console.log('✅ Database pulito, ricarico...\n');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Screenshot iniziale
    await page.screenshot({ path: '/workspace/web-client/step-0-initial.png' });
    console.log('📸 Step 0: Pagina iniziale\n');
    
    // Analizza colori e contenuto
    const initialState = await page.evaluate(() => {
      const body = document.body;
      const root = document.getElementById('root');
      return {
        bodyBg: window.getComputedStyle(body).backgroundColor,
        rootBg: root ? window.getComputedStyle(root).backgroundColor : 'no-root',
        hasSplash: !!document.querySelector('.splash-screen'),
        hasLogin: !!document.querySelector('input[type="password"]'),
        bodyText: body.innerText.substring(0, 200)
      };
    });
    
    console.log('🎨 Stato iniziale:');
    console.log(`   Body background: ${initialState.bodyBg}`);
    console.log(`   Root background: ${initialState.rootBg}`);
    console.log(`   Splash screen: ${initialState.hasSplash}`);
    console.log(`   Login popup: ${initialState.hasLogin}`);
    console.log(`   Testo: ${initialState.bodyText.substring(0, 80)}...\n`);
    
    // Login
    console.log('🔑 Eseguo login...');
    await page.locator('input[type="text"]').first().fill('testardo@conversations.im');
    await page.locator('input[type="password"]').first().fill('FyqnD2YpGScNsuC');
    await page.screenshot({ path: '/workspace/web-client/step-1-before-login.png' });
    
    await page.locator('button:has-text("Collegati")').first().click();
    console.log('⏳ Attendo connessione e sync...\n');
    
    // Monitora ogni 500ms per 30 secondi
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(500);
      
      const state = await page.evaluate(() => {
        const body = document.body;
        const splash = document.querySelector('.splash-screen');
        return {
          bodyBg: window.getComputedStyle(body).backgroundColor,
          hasSplash: !!splash,
          splashVisible: splash ? window.getComputedStyle(splash).display !== 'none' : false,
          splashText: splash ? splash.innerText : '',
          conversationCount: document.querySelectorAll('.conversation-item').length,
          bodyText: body.innerText.substring(0, 150)
        };
      });
      
      // Log solo i cambiamenti significativi
      if (i === 0 || i === 10 || i === 20 || state.hasSplash || state.conversationCount > 0 || i === 59) {
        console.log(`⏱️  ${(i * 0.5).toFixed(1)}s:`);
        console.log(`   Splash: ${state.hasSplash ? (state.splashVisible ? 'VISIBILE' : 'presente ma nascosto') : 'no'}`);
        if (state.splashText) console.log(`   Splash text: "${state.splashText}"`);
        console.log(`   Conversazioni: ${state.conversationCount}`);
        console.log(`   Background: ${state.bodyBg}`);
        console.log(`   Testo: ${state.bodyText.replace(/\n/g, ' ').substring(0, 80)}...\n`);
        
        // Screenshot se c'è lo splash o se è un momento chiave
        if (state.hasSplash || i === 0 || i === 20 || i === 59) {
          await page.screenshot({ path: `/workspace/web-client/step-2-time-${(i * 0.5).toFixed(1)}s.png` });
          console.log(`   📸 Screenshot salvato\n`);
        }
      }
      
      // Se vediamo conversazioni, possiamo fermarci
      if (state.conversationCount > 0 && i > 10) {
        console.log('✅ Conversazioni apparse, completato!\n');
        break;
      }
    }
    
    // Screenshot finale
    await page.screenshot({ path: '/workspace/web-client/step-3-final.png', fullPage: true });
    
    const finalState = await page.evaluate(() => ({
      conversationCount: document.querySelectorAll('.conversation-item').length,
      bodyText: document.body.innerText
    }));
    
    console.log('📊 RISULTATO FINALE:');
    console.log(`   Conversazioni: ${finalState.conversationCount}`);
    console.log(`\n📄 Contenuto finale:\n${finalState.bodyText.substring(0, 500)}\n`);
    
  } catch (error) {
    console.error('\n❌ Errore:', error.message);
    await page.screenshot({ path: '/workspace/web-client/step-ERROR.png' });
  } finally {
    await browser.close();
  }
}

testDetailedStartup();
