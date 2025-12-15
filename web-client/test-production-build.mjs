import { chromium } from 'playwright';

async function testProductionBuild() {
  console.log('🧪 Test BUILD PRODUCTION locale...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[ERROR] ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('❌ PAGE ERROR:', error.message);
  });
  
  try {
    console.log('📱 Navigando al build locale http://localhost:4173/XmppTest/\n');
    
    await page.goto('http://localhost:4173/XmppTest/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/workspace/web-client/build-test-1-initial.png' });
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    const bgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    
    console.log(`🎨 Colore sfondo: ${bgColor}`);
    console.log(`📄 Testo visibile: ${bodyText.substring(0, 100)}\n`);
    
    if (errors.length > 0) {
      console.log('❌ ERRORI TROVATI:');
      errors.forEach(err => console.log(`   - ${err}`));
      console.log('\n🔴 BUILD ROTTO - Il fix NON ha funzionato!\n');
      return false;
    }
    
    // Verifica presenza popup login
    const hasLogin = await page.locator('input[type="text"], input[type="password"]').count() > 0;
    
    if (hasLogin) {
      console.log('✅ Popup login presente - Build OK!');
      console.log('✅ Nessun errore JavaScript trovato\n');
      return true;
    } else {
      console.log('⚠️  Nessun popup login - possibile problema\n');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Errore test:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testProductionBuild().then(success => {
  process.exit(success ? 0 : 1);
});
