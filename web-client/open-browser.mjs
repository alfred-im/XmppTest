import { chromium } from 'playwright';

async function openBrowser() {
  console.log('🌐 Aprendo browser visibile per test manuale...\n');
  
  const browser = await chromium.launch({
    headless: false,  // Browser VISIBILE
    slowMo: 100       // Rallenta le azioni per poterle vedere
  });
  
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }
  });
  
  const page = await context.newPage();
  
  // Log console messages
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
  });
  
  page.on('pageerror', error => {
    console.error('❌ [BROWSER ERROR]', error.message);
  });
  
  try {
    console.log('Navigando a http://localhost:5173/XmppTest/\n');
    await page.goto('http://localhost:5173/XmppTest/', { waitUntil: 'networkidle' });
    
    console.log('✅ Pagina caricata');
    console.log('\n📋 Browser aperto - controlla visivamente');
    console.log('⏳ Il browser rimarrà aperto per 2 minuti...');
    console.log('   Premi Ctrl+C per chiudere prima\n');
    
    // Tieni il browser aperto per 2 minuti
    await page.waitForTimeout(120000);
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await browser.close();
  }
}

openBrowser();
