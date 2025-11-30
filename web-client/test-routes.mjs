import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:4173/XmppTest';

async function testRoutes() {
  console.log('🚀 Avvio test con Puppeteer...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Test 1: Root redirige a conversations
    console.log('Test 1: Root → /#/conversations');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(500);
    const url1 = page.url();
    console.log(`  URL finale: ${url1}`);
    console.log(`  ✅ ${url1.includes('#/conversations') ? 'PASS' : '❌ FAIL'}\n`);
    
    // Test 2: Navigazione diretta a conversations
    console.log('Test 2: Navigazione diretta a /#/conversations');
    await page.goto(`${BASE_URL}/#/conversations`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(500);
    const url2 = page.url();
    const hasConversationsPage = await page.evaluate(() => {
      return document.querySelector('.conversations-page') !== null;
    });
    console.log(`  URL: ${url2}`);
    console.log(`  ConversationsPage presente: ${hasConversationsPage}`);
    console.log(`  ✅ ${url2.includes('#/conversations') && hasConversationsPage ? 'PASS' : '❌ FAIL'}\n`);
    
    // Test 3: Refresh su conversations mantiene la rotta
    console.log('Test 3: Refresh su /#/conversations');
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(500);
    const url3 = page.url();
    const stillHasConversationsPage = await page.evaluate(() => {
      return document.querySelector('.conversations-page') !== null;
    });
    console.log(`  URL dopo refresh: ${url3}`);
    console.log(`  ConversationsPage ancora presente: ${stillHasConversationsPage}`);
    console.log(`  ✅ ${url3.includes('#/conversations') && stillHasConversationsPage ? 'PASS' : '❌ FAIL'}\n`);
    
    // Test 4: Navigazione diretta a chat
    console.log('Test 4: Navigazione diretta a /#/chat/test@example.com');
    await page.goto(`${BASE_URL}/#/chat/test@example.com`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(500);
    const url4 = page.url();
    const hasChatPage = await page.evaluate(() => {
      return document.querySelector('.chat-page') !== null;
    });
    console.log(`  URL: ${url4}`);
    console.log(`  ChatPage presente: ${hasChatPage}`);
    console.log(`  ✅ ${url4.includes('#/chat/test@example.com') && hasChatPage ? 'PASS' : '❌ FAIL'}\n`);
    
    // Test 5: Refresh su chat mantiene la rotta
    console.log('Test 5: Refresh su /#/chat/test@example.com');
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(500);
    const url5 = page.url();
    const stillHasChatPage = await page.evaluate(() => {
      return document.querySelector('.chat-page') !== null;
    });
    console.log(`  URL dopo refresh: ${url5}`);
    console.log(`  ChatPage ancora presente: ${stillHasChatPage}`);
    console.log(`  ✅ ${url5.includes('#/chat/test@example.com') && stillHasChatPage ? 'PASS' : '❌ FAIL'}\n`);
    
    // Test 6: LoginPopup appare quando non connesso
    console.log('Test 6: LoginPopup appare');
    const hasLoginPopup = await page.evaluate(() => {
      return document.querySelector('.login-popup-overlay') !== null;
    });
    console.log(`  LoginPopup presente: ${hasLoginPopup}`);
    console.log(`  ✅ ${hasLoginPopup ? 'PASS' : '❌ FAIL - (normale se già connesso)'}\n`);
    
    console.log('✨ Test completati!');
    
  } catch (error) {
    console.error('❌ Errore durante i test:', error);
  } finally {
    await browser.close();
  }
}

testRoutes();
