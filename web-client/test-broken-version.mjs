import { chromium } from 'playwright';

async function testBrokenVersion() {
  console.log('🚀 Test versione ROTTA (HEAD)...');
  console.log('🔍 Cerco di riprodurre lo "sfondo blu"...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  
  const logs = [];
  const errors = [];
  
  page.on('console', msg => {
    const log = { type: msg.type(), text: msg.text() };
    logs.push(log);
    console.log(`[${log.type.toUpperCase()}] ${log.text}`);
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('❌ PAGE ERROR:', error.message);
  });
  
  try {
    console.log('📱 Caricamento app...');
    await page.goto('http://localhost:5173/XmppTest/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/workspace/web-client/broken-1-initial.png' });
    console.log('📸 Screenshot 1: stato iniziale\n');
    
    // Controlla colore di sfondo
    const bgColor = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).backgroundColor;
    });
    console.log(`🎨 Colore sfondo body: ${bgColor}\n`);
    
    // Compila login
    console.log('🔑 Compilando form di login...');
    await page.locator('input[type="text"]').first().fill('testardo@conversations.im');
    await page.locator('input[type="password"]').first().fill('FyqnD2YpGScNsuC');
    await page.screenshot({ path: '/workspace/web-client/broken-2-before-submit.png' });
    
    console.log('🖱️  Click su Collegati...\n');
    await page.locator('button:has-text("Collegati")').first().click();
    
    // Monitora ogni secondo per 20 secondi
    for (let i = 1; i <= 20; i++) {
      await page.waitForTimeout(1000);
      
      // Controlla se c'è lo splash screen
      const hasSplash = await page.locator('.splash-screen').count() > 0;
      const splashVisible = hasSplash ? await page.locator('.splash-screen').isVisible() : false;
      
      // Controlla se ci sono conversazioni
      const hasConversations = await page.locator('.conversation-item').count();
      
      // Controlla colore sfondo
      const currentBg = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      
      // Controlla cosa è visibile
      const visibleText = await page.evaluate(() => document.body.innerText);
      
      console.log(`⏱️  Secondo ${i}:`);
      console.log(`   - Splash screen: ${splashVisible ? 'VISIBILE' : 'nascosto'}`);
      console.log(`   - Conversazioni: ${hasConversations}`);
      console.log(`   - Sfondo: ${currentBg}`);
      console.log(`   - Testo visibile: ${visibleText.substring(0, 100).replace(/\n/g, ' ')}`);
      
      // Se vedo lo sfondo blu, fai screenshot
      if (currentBg.includes('86, 130, 163') || currentBg.includes('5682a3') || splashVisible) {
        await page.screenshot({ path: `/workspace/web-client/broken-3-second-${i}-BLUE.png` });
        console.log(`   📸 Screenshot salvato (SFONDO BLU TROVATO!)`);
      }
      
      console.log('');
      
      // Se vediamo le conversazioni, possiamo fermarci
      if (hasConversations > 0) {
        console.log('✅ Conversazioni visualizzate, app caricata correttamente');
        break;
      }
    }
    
    await page.screenshot({ path: '/workspace/web-client/broken-4-final.png', fullPage: true });
    console.log('\n📸 Screenshot finale\n');
    
    // Analisi finale
    const finalConversations = await page.locator('.conversation-item').count();
    const finalText = await page.evaluate(() => document.body.innerText);
    
    console.log('📊 RISULTATO FINALE:');
    console.log(`   - Conversazioni: ${finalConversations}`);
    console.log(`   - Errori: ${errors.length}`);
    console.log(`   - Testo visibile:\n${finalText.substring(0, 500)}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORI TROVATI:');
      errors.forEach(err => console.log(`   - ${err}`));
    }
    
  } catch (error) {
    console.error('\n❌ Errore durante il test:', error.message);
    await page.screenshot({ path: '/workspace/web-client/broken-ERROR.png' });
  } finally {
    await browser.close();
  }
}

testBrokenVersion();
