import { chromium } from 'playwright';

async function testScrollBehavior() {
  console.log('🚀 Test comportamento scroll nella chat...');
  
  const browser = await chromium.launch({
    headless: true
  });
  
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }
  });
  
  const page = await context.newPage();
  
  // Raccogli messaggi console
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
  });
  
  page.on('pageerror', error => {
    console.error('❌ PAGE ERROR:', error.message);
  });
  
  try {
    console.log('📱 Navigazione verso https://alfred-im.github.io/XmppTest/ (PRODUZIONE AGGIORNATA)');
    await page.goto('https://alfred-im.github.io/XmppTest/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('✅ Pagina caricata');
    await page.waitForTimeout(2000);
    
    // Login
    console.log('🔑 Login con testarda@conversations.im...');
    const usernameInput = await page.locator('input[type="text"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const submitButton = await page.locator('button:has-text("Collegati")').first();
    
    await usernameInput.fill('testarda@conversations.im');
    await passwordInput.fill('FyqnD2YpGScNsuC');
    await submitButton.click();
    
    console.log('⏳ Attesa caricamento conversazioni...');
    await page.waitForTimeout(15000); // Attende sync iniziale completa
    
    // Aspetta che il popup di login sia chiuso
    console.log('⏳ Verifica chiusura popup login...');
    await page.waitForSelector('.login-popup-overlay', { state: 'hidden', timeout: 30000 });
    
    // Clicca sulla conversazione con testardo
    console.log('📱 Click sulla conversazione con testardo...');
    const conversationItem = page.locator('.conversation-item').filter({ hasText: 'testardo' }).first();
    await conversationItem.click();
    
    console.log('⏳ Attesa caricamento chat...');
    await page.waitForTimeout(3000);
    
    // Trova il container dei messaggi
    const messagesContainer = page.locator('.chat-page__messages');
    
    // Test 1: Verifica che parta dal fondo
    console.log('\n📊 TEST 1: Verifica posizione iniziale (dovrebbe essere in fondo)');
    const scrollInfo1 = await messagesContainer.evaluate(el => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      distanceFromBottom: el.scrollHeight - el.scrollTop - el.clientHeight
    }));
    
    console.log('  scrollTop:', scrollInfo1.scrollTop);
    console.log('  scrollHeight:', scrollInfo1.scrollHeight);
    console.log('  clientHeight:', scrollInfo1.clientHeight);
    console.log('  distanceFromBottom:', scrollInfo1.distanceFromBottom);
    console.log('  ✅ È in fondo?', scrollInfo1.distanceFromBottom <= 1);
    
    await page.screenshot({ path: '/workspace/web-client/test-scroll-1-initial.png' });
    
    // Test 2: Scrolla un po' in alto
    console.log('\n📊 TEST 2: Scrolla 200px verso l\'alto');
    await messagesContainer.evaluate(el => {
      el.scrollTop = el.scrollTop - 200;
    });
    
    await page.waitForTimeout(1000);
    
    const scrollInfo2 = await messagesContainer.evaluate(el => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      distanceFromBottom: el.scrollHeight - el.scrollTop - el.clientHeight
    }));
    
    console.log('  scrollTop:', scrollInfo2.scrollTop);
    console.log('  distanceFromBottom:', scrollInfo2.distanceFromBottom);
    console.log('  ✅ Non è più in fondo?', scrollInfo2.distanceFromBottom > 1);
    
    await page.screenshot({ path: '/workspace/web-client/test-scroll-2-scrolled-up.png' });
    
    // Test 3: Focus sull'input (simula apertura tastiera)
    console.log('\n📊 TEST 3: Focus su input (simula tastiera)');
    const input = page.locator('.chat-page__input');
    await input.click();
    await page.waitForTimeout(1000);
    
    const scrollInfo3 = await messagesContainer.evaluate(el => ({
      scrollTop: el.scrollTop,
      distanceFromBottom: el.scrollHeight - el.scrollTop - el.clientHeight
    }));
    
    console.log('  scrollTop dopo focus:', scrollInfo3.scrollTop);
    console.log('  distanceFromBottom:', scrollInfo3.distanceFromBottom);
    console.log('  ✅ Posizione mantenuta (non scrollato)?', Math.abs(scrollInfo3.scrollTop - scrollInfo2.scrollTop) < 10);
    
    await page.screenshot({ path: '/workspace/web-client/test-scroll-3-after-focus.png' });
    
    // Test 4: Scrolla di nuovo in fondo manualmente
    console.log('\n📊 TEST 4: Scrolla manualmente in fondo');
    await messagesContainer.evaluate(el => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    
    await page.waitForTimeout(1000);
    
    const scrollInfo4 = await messagesContainer.evaluate(el => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      distanceFromBottom: el.scrollHeight - el.scrollTop - el.clientHeight
    }));
    
    console.log('  scrollTop:', scrollInfo4.scrollTop);
    console.log('  distanceFromBottom:', scrollInfo4.distanceFromBottom);
    console.log('  ✅ È tornato in fondo?', scrollInfo4.distanceFromBottom <= 1);
    
    await page.screenshot({ path: '/workspace/web-client/test-scroll-4-back-to-bottom.png' });
    
    // Test 5: Scrivi e invia un messaggio
    console.log('\n📊 TEST 5: Invia messaggio (dovrebbe mantenere in fondo)');
    await input.fill('Test message from playwright');
    await page.waitForTimeout(500);
    
    const sendButton = page.locator('.chat-page__send-btn');
    await sendButton.click();
    
    await page.waitForTimeout(2000);
    
    const scrollInfo5 = await messagesContainer.evaluate(el => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      distanceFromBottom: el.scrollHeight - el.scrollTop - el.clientHeight
    }));
    
    console.log('  scrollTop dopo invio:', scrollInfo5.scrollTop);
    console.log('  distanceFromBottom:', scrollInfo5.distanceFromBottom);
    console.log('  ✅ Ancora in fondo dopo nuovo messaggio?', scrollInfo5.distanceFromBottom <= 1);
    
    await page.screenshot({ path: '/workspace/web-client/test-scroll-5-after-send.png' });
    
    console.log('\n✅ Test completato! Screenshots salvati in /workspace/web-client/');
    console.log('\n📊 RIEPILOGO RISULTATI:');
    console.log(`  1. Posizione iniziale in fondo: ${scrollInfo1.distanceFromBottom <= 1 ? '✅' : '❌'} (${scrollInfo1.distanceFromBottom}px dal fondo)`);
    console.log(`  2. Scroll verso alto funziona: ${scrollInfo2.distanceFromBottom > 1 ? '✅' : '❌'} (${scrollInfo2.distanceFromBottom}px dal fondo)`);
    console.log(`  3. Focus mantiene posizione: ${Math.abs(scrollInfo3.scrollTop - scrollInfo2.scrollTop) < 10 ? '✅' : '❌'}`);
    console.log(`  4. Scroll manuale in fondo: ${scrollInfo4.distanceFromBottom <= 1 ? '✅' : '❌'} (${scrollInfo4.distanceFromBottom}px dal fondo)`);
    console.log(`  5. Auto-scroll dopo invio: ${scrollInfo5.distanceFromBottom <= 1 ? '✅' : '❌'} (${scrollInfo5.distanceFromBottom}px dal fondo)`);
    
    // Test completato
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
    await page.screenshot({ path: '/workspace/web-client/test-scroll-error.png' });
  } finally {
    await browser.close();
  }
}

testScrollBehavior();
