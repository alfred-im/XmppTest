import { chromium } from 'playwright';

async function testAppStartup() {
  console.log('🚀 Avvio test con Playwright...');
  
  const browser = await chromium.launch({
    headless: true
  });
  
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }
  });
  
  const page = await context.newPage();
  
  // Raccogli tutti gli errori della console
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    console.log(`[${msg.type().toUpperCase()}]`, text);
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('❌ PAGE ERROR:', error.message);
    console.error(error.stack);
  });
  
  try {
    console.log('📱 Navigazione verso http://localhost:5173/XmppTest/');
    
    // Naviga all'app
    await page.goto('http://localhost:5173/XmppTest/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Aspetta un po' per vedere se l'app si carica
    await page.waitForTimeout(3000);
    
    // Controlla cosa viene renderizzato
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log('\n📄 Contenuto body (primi 500 caratteri):');
    console.log(bodyHTML.substring(0, 500));
    
    // Controlla se ci sono elementi specifici
    const hasRoot = await page.locator('#root').count() > 0;
    const rootContent = hasRoot ? await page.locator('#root').innerHTML() : 'NO ROOT';
    
    console.log('\n🔍 Analisi DOM:');
    console.log('- #root esiste:', hasRoot);
    console.log('- #root content (primi 500 caratteri):', rootContent.substring(0, 500));
    
    // Controlla se ci sono errori
    console.log('\n📊 Riepilogo:');
    console.log(`- Messaggi console: ${consoleMessages.length}`);
    console.log(`- Errori pagina: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORI TROVATI:');
      errors.forEach((err, i) => {
        console.log(`\n${i + 1}. ${err}`);
      });
    }
    
    // Screenshot per debug
    await page.screenshot({ path: '/workspace/web-client/debug-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot salvato in debug-screenshot.png');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  } finally {
    await browser.close();
  }
}

testAppStartup();
