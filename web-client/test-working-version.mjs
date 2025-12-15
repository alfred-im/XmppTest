import { chromium } from 'playwright';

async function testWorkingVersion() {
  console.log('🚀 Test versione FUNZIONANTE (df8bad4)...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  
  const logs = [];
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
  });
  
  page.on('pageerror', error => {
    console.error('❌ ERROR:', error.message);
  });
  
  try {
    console.log('📱 Caricamento app...');
    await page.goto('http://localhost:5173/XmppTest/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/workspace/web-client/working-1-initial.png' });
    console.log('📸 Screenshot: stato iniziale');
    
    // Compila login
    console.log('🔑 Login...');
    await page.locator('input[type="text"]').first().fill('testardo@conversations.im');
    await page.locator('input[type="password"]').first().fill('FyqnD2YpGScNsuC');
    await page.locator('button:has-text("Collegati")').first().click();
    
    console.log('⏳ Attesa 10 secondi...');
    await page.waitForTimeout(10000);
    
    await page.screenshot({ path: '/workspace/web-client/working-2-after-login.png', fullPage: true });
    console.log('📸 Screenshot: dopo login');
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n📄 Contenuto visibile:');
    console.log(bodyText.substring(0, 300));
    
    const conversationItems = await page.locator('.conversation-item').count();
    console.log(`\n✅ Conversazioni visualizzate: ${conversationItems}`);
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await browser.close();
  }
}

testWorkingVersion();
