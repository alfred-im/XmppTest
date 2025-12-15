import { chromium } from 'playwright';

async function testLoginFlow() {
  console.log('🚀 Test flusso di login...');
  
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
    const type = msg.type();
    consoleMessages.push({ type, text });
    console.log(`[${type.toUpperCase()}]`, text);
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('❌ PAGE ERROR:', error.message);
    console.error(error.stack);
  });
  
  try {
    console.log('📱 Navigazione verso http://localhost:5173/XmppTest/');
    
    await page.goto('http://localhost:5173/XmppTest/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('✅ Pagina caricata');
    await page.screenshot({ path: '/workspace/web-client/test-1-initial.png' });
    
    // Aspetta il popup di login
    await page.waitForTimeout(2000);
    
    // Compila form di login
    console.log('🔑 Compilazione form di login...');
    const usernameInput = await page.locator('input[type="text"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const submitButton = await page.locator('button:has-text("Collegati")').first();
    
    await usernameInput.fill('testardo@conversations.im');
    await passwordInput.fill('FyqnD2YpGScNsuC');
    
    await page.screenshot({ path: '/workspace/web-client/test-2-form-filled.png' });
    console.log('📸 Screenshot: form compilato');
    
    // Click sul pulsante di login
    console.log('🖱️  Click su Collegati...');
    await submitButton.click();
    
    // Aspetta qualche secondo per vedere cosa succede
    console.log('⏳ Attesa 5 secondi per la risposta...');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/workspace/web-client/test-3-after-5s.png' });
    console.log('📸 Screenshot: 5 secondi dopo il click');
    
    // Controlla se c'è lo splash screen
    const splashScreen = await page.locator('.splash-screen').count();
    const splashVisible = splashScreen > 0;
    console.log(`\n🔍 Splash screen visibile: ${splashVisible}`);
    
    if (splashVisible) {
      const splashText = await page.locator('.splash-screen').textContent();
      console.log(`📝 Testo splash screen: "${splashText}"`);
    }
    
    // Aspetta ancora un po'
    console.log('⏳ Attesa altri 10 secondi...');
    await page.waitForTimeout(10000);
    
    await page.screenshot({ path: '/workspace/web-client/test-4-after-15s.png' });
    console.log('📸 Screenshot: 15 secondi dopo il click');
    
    // Controlla di nuovo lo splash screen
    const splashScreen2 = await page.locator('.splash-screen').count();
    const splashVisible2 = splashScreen2 > 0;
    console.log(`\n🔍 Splash screen ancora visibile: ${splashVisible2}`);
    
    if (splashVisible2) {
      const splashText2 = await page.locator('.splash-screen').textContent();
      console.log(`📝 Testo splash screen: "${splashText2}"`);
    }
    
    // Controlla cosa c'è nel body
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n📄 Testo body (primi 1000 caratteri):');
    console.log(bodyText.substring(0, 1000));
    
    // Controlla se ci sono conversazioni
    const conversationsPage = await page.locator('.conversations-page').count();
    console.log(`\n🔍 Pagina conversazioni visibile: ${conversationsPage > 0}`);
    
    console.log('\n📊 Riepilogo errori:');
    console.log(`- Errori pagina: ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }
    
    console.log('\n📊 Ultimi 10 messaggi console:');
    consoleMessages.slice(-10).forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.type}] ${msg.text}`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  } finally {
    await browser.close();
  }
}

testLoginFlow();
