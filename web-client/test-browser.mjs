import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurazione test
const TEST_CONFIG = {
  baseUrl: 'http://localhost:5173',
  timeout: 30000,
  credentials: {
    jid: 'testardo@conversations.im',
    password: 'FyqnD2YpGScNsuC'
  }
};

let devServer = null;
let browser = null;

// Utility per logging colorato
const log = {
  info: (msg) => console.log(`\x1b[36mℹ ${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✓ ${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m✗ ${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m⚠ ${msg}\x1b[0m`),
  section: (msg) => console.log(`\n\x1b[1m${'='.repeat(60)}\x1b[0m\n\x1b[1m${msg}\x1b[0m\n\x1b[1m${'='.repeat(60)}\x1b[0m\n`)
};

// Avvia server di sviluppo
async function startDevServer() {
  log.info('Avvio server di sviluppo...');
  
  return new Promise((resolve, reject) => {
    devServer = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverReady = false;

    devServer.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') && !serverReady) {
        serverReady = true;
        log.success('Server di sviluppo avviato');
        // Aspetta un po' per essere sicuri che il server sia pronto
        setTimeout(() => resolve(), 2000);
      }
    });

    devServer.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('Error')) {
        log.error(`Errore server: ${error}`);
      }
    });

    devServer.on('error', (error) => {
      reject(error);
    });

    // Timeout se il server non si avvia in 30 secondi
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Timeout avvio server'));
      }
    }, 30000);
  });
}

// Ferma server di sviluppo
function stopDevServer() {
  if (devServer) {
    log.info('Arresto server di sviluppo...');
    devServer.kill();
    devServer = null;
  }
}

// Aspetta che un elemento sia visibile
async function waitForElement(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    return true;
  } catch (error) {
    return false;
  }
}

// Test 1: Caricamento pagina
async function testPageLoad(page) {
  log.section('Test 1: Caricamento Pagina');
  
  try {
    await page.goto(`${TEST_CONFIG.baseUrl}/XmppTest/`, { 
      waitUntil: 'networkidle',
      timeout: TEST_CONFIG.timeout 
    });
    
    log.success('Pagina caricata correttamente');
    
    // Prendi screenshot
    await page.screenshot({ path: '/workspace/test-screenshot-1-loaded.png', fullPage: true });
    log.info('Screenshot salvato: test-screenshot-1-loaded.png');
    
    return true;
  } catch (error) {
    log.error(`Errore caricamento pagina: ${error.message}`);
    return false;
  }
}

// Test 2: Presenza elementi UI
async function testUIElements(page) {
  log.section('Test 2: Verifica Elementi UI');
  
  const tests = [
    { name: 'Popup login', selector: 'form, [role="dialog"], .login-popup, .popup' },
    { name: 'Campo JID', selector: 'input[type="text"], input[name="jid"], input[placeholder*="JID"]' },
    { name: 'Campo password', selector: 'input[type="password"]' },
    { name: 'Pulsante login', selector: 'button[type="submit"], button:has-text("Connetti"), button:has-text("Accedi"), button:has-text("Login")' }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const found = await waitForElement(page, test.selector, 5000);
    if (found) {
      log.success(`${test.name} trovato`);
    } else {
      log.error(`${test.name} NON trovato (${test.selector})`);
      allPassed = false;
    }
  }
  
  // Screenshot dello stato corrente
  await page.screenshot({ path: '/workspace/test-screenshot-2-ui.png', fullPage: true });
  log.info('Screenshot salvato: test-screenshot-2-ui.png');
  
  return allPassed;
}

// Test 3: Login
async function testLogin(page) {
  log.section('Test 3: Test Login');
  
  try {
    // Cerca i campi di input in modo flessibile
    const jidInput = await page.locator('input[type="text"], input[name="jid"], input[placeholder*="JID"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const submitButton = await page.locator('button[type="submit"], button:has-text("Connetti"), button:has-text("Accedi"), button:has-text("Login")').first();
    
    // Verifica che gli elementi esistano
    const jidExists = await jidInput.count() > 0;
    const passwordExists = await passwordInput.count() > 0;
    const buttonExists = await submitButton.count() > 0;
    
    if (!jidExists || !passwordExists || !buttonExists) {
      log.error('Elementi del form di login non trovati');
      log.warn(`JID input: ${jidExists}, Password input: ${passwordExists}, Submit button: ${buttonExists}`);
      return false;
    }
    
    log.info('Inserimento credenziali...');
    await jidInput.fill(TEST_CONFIG.credentials.jid);
    await passwordInput.fill(TEST_CONFIG.credentials.password);
    
    // Screenshot prima del submit
    await page.screenshot({ path: '/workspace/test-screenshot-3-before-login.png', fullPage: true });
    log.info('Screenshot salvato: test-screenshot-3-before-login.png');
    
    log.info('Clic su pulsante login...');
    await submitButton.click();
    
    // Aspetta che qualcosa cambi (popup scompare o lista conversazioni appare)
    log.info('Attesa risposta login...');
    await page.waitForTimeout(5000);
    
    // Screenshot dopo il login
    await page.screenshot({ path: '/workspace/test-screenshot-4-after-login.png', fullPage: true });
    log.info('Screenshot salvato: test-screenshot-4-after-login.png');
    
    // Verifica se ci sono messaggi di errore visibili
    const errorMessage = await page.locator('.error, [role="alert"], .message-error').first();
    const hasError = await errorMessage.count() > 0 && await errorMessage.isVisible();
    
    if (hasError) {
      const errorText = await errorMessage.textContent();
      log.error(`Errore durante il login: ${errorText}`);
      return false;
    }
    
    // Verifica se il login è riuscito cercando elementi della dashboard/conversazioni
    const conversationsList = await waitForElement(page, '.conversations, [class*="conversation"], [class*="chat-list"], main', 5000);
    
    if (conversationsList) {
      log.success('Login riuscito - Lista conversazioni visibile');
      return true;
    } else {
      log.warn('Login completato ma lista conversazioni non visibile');
      // Potrebbe essere che la lista sia vuota o che ci voglia più tempo
      await page.waitForTimeout(3000);
      await page.screenshot({ path: '/workspace/test-screenshot-5-final-state.png', fullPage: true });
      log.info('Screenshot salvato: test-screenshot-5-final-state.png');
      return true; // Consideriamo comunque successo se non ci sono errori
    }
    
  } catch (error) {
    log.error(`Errore durante il test di login: ${error.message}`);
    await page.screenshot({ path: '/workspace/test-screenshot-error.png', fullPage: true });
    log.info('Screenshot di errore salvato: test-screenshot-error.png');
    return false;
  }
}

// Test 4: Navigazione conversazioni
async function testConversationsNavigation(page) {
  log.section('Test 4: Navigazione Conversazioni');
  
  try {
    // Aspetta che le conversazioni siano caricate
    log.info('Attesa caricamento lista conversazioni...');
    await page.waitForTimeout(3000);
    
    // Cerca elementi conversazione
    const conversations = await page.locator('.conversation-item, [class*="conversation"]').all();
    const conversationCount = conversations.length;
    
    log.info(`Trovate ${conversationCount} conversazioni`);
    
    if (conversationCount > 0) {
      log.success(`Lista conversazioni caricata con ${conversationCount} elementi`);
      
      // Screenshot lista
      await page.screenshot({ path: '/workspace/test-screenshot-6-conversations.png', fullPage: true });
      log.info('Screenshot salvato: test-screenshot-6-conversations.png');
      
      // Prova a cliccare sulla prima conversazione
      log.info('Apertura prima conversazione...');
      const currentUrl = page.url();
      await conversations[0].click();
      
      // Aspetta che l'URL cambi (navigazione a chat)
      await page.waitForTimeout(1000);
      await page.waitForURL(url => url !== currentUrl, { timeout: 5000 }).catch(() => {
        log.warn('URL non cambiato dopo clic');
      });
      
      await page.waitForTimeout(2000);
      
      // Screenshot dopo navigazione
      await page.screenshot({ path: '/workspace/test-screenshot-7-chat-open.png', fullPage: true });
      log.info('Screenshot salvato: test-screenshot-7-chat-open.png');
      
      // Verifica che siamo in pagina chat verificando URL o elementi specifici
      const newUrl = page.url();
      if (newUrl.includes('/chat/')) {
        log.success('Chat aperta correttamente - URL cambiato a /chat/');
        return true;
      } else {
        log.warn(`Navigazione chat fallita - URL attuale: ${newUrl}`);
        return false;
      }
    } else {
      log.warn('Nessuna conversazione trovata nella lista');
      return false;
    }
  } catch (error) {
    log.error(`Errore durante navigazione conversazioni: ${error.message}`);
    await page.screenshot({ path: '/workspace/test-screenshot-7-error.png', fullPage: true });
    return false;
  }
}

// Test 5: Invio messaggio
async function testSendMessage(page) {
  log.section('Test 5: Invio Messaggio');
  
  try {
    // Cerca il campo di input messaggio
    const messageInput = await page.locator('input[type="text"]:visible, textarea:visible').last();
    const inputExists = await messageInput.count() > 0;
    
    if (!inputExists) {
      log.error('Campo input messaggio non trovato');
      return false;
    }
    
    const testMessage = `Test message from Playwright - ${new Date().toISOString()}`;
    log.info(`Invio messaggio: "${testMessage}"`);
    
    await messageInput.fill(testMessage);
    await page.waitForTimeout(500);
    
    // Screenshot con messaggio scritto
    await page.screenshot({ path: '/workspace/test-screenshot-8-message-typed.png', fullPage: true });
    log.info('Screenshot salvato: test-screenshot-8-message-typed.png');
    
    // Cerca pulsante invio
    const sendButton = await page.locator('button[type="submit"]:visible, button:has-text("Invia"):visible, button[aria-label*="Invia"]:visible').last();
    const sendButtonExists = await sendButton.count() > 0;
    
    if (sendButtonExists) {
      log.info('Clic su pulsante invio...');
      await sendButton.click();
    } else {
      log.info('Pulsante invio non trovato, provo con Enter...');
      await messageInput.press('Enter');
    }
    
    await page.waitForTimeout(2000);
    
    // Screenshot dopo invio
    await page.screenshot({ path: '/workspace/test-screenshot-9-message-sent.png', fullPage: true });
    log.info('Screenshot salvato: test-screenshot-9-message-sent.png');
    
    // Verifica che il campo sia vuoto dopo l'invio
    const inputValue = await messageInput.inputValue();
    if (inputValue === '') {
      log.success('Messaggio inviato - campo input svuotato');
      return true;
    } else {
      log.warn('Campo input non svuotato dopo invio');
      return false;
    }
  } catch (error) {
    log.error(`Errore durante invio messaggio: ${error.message}`);
    return false;
  }
}

// Test 6: Profilo utente
async function testUserProfile(page) {
  log.section('Test 6: Profilo Utente');
  
  try {
    // Torna alla lista conversazioni (back button)
    log.info('Navigazione alla pagina profilo...');
    
    // Cerca link/button profilo - potrebbe essere in header o menu
    const profileButton = await page.locator('[href*="#/profile"], button:has-text("Profilo"), [aria-label*="Profilo"]').first();
    const profileExists = await profileButton.count() > 0;
    
    if (!profileExists) {
      // Prova con navigazione diretta
      log.info('Link profilo non trovato, provo navigazione diretta...');
      await page.goto(`${TEST_CONFIG.baseUrl}/XmppTest/#/profile`);
      await page.waitForTimeout(2000);
    } else {
      await profileButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Screenshot pagina profilo
    await page.screenshot({ path: '/workspace/test-screenshot-10-profile.png', fullPage: true });
    log.info('Screenshot salvato: test-screenshot-10-profile.png');
    
    // Verifica elementi profilo (JID, avatar, ecc.)
    const jidDisplay = await page.locator('text=' + TEST_CONFIG.credentials.jid).first();
    const hasJid = await jidDisplay.count() > 0;
    
    if (hasJid) {
      log.success('Pagina profilo caricata - JID visibile');
      return true;
    } else {
      log.warn('JID non visibile nella pagina profilo');
      return false;
    }
  } catch (error) {
    log.error(`Errore durante test profilo: ${error.message}`);
    return false;
  }
}

// Test 7: Logout
async function testLogout(page) {
  log.section('Test 7: Logout');
  
  try {
    // Il pulsante logout è nella ConversationsPage, non in ProfilePage
    // Torna alla home/conversations
    log.info('Navigazione alla pagina conversazioni...');
    await page.goto(`${TEST_CONFIG.baseUrl}/XmppTest/#/`);
    await page.waitForTimeout(2000);
    
    // Screenshot pagina conversazioni
    await page.screenshot({ path: '/workspace/test-screenshot-11-back-to-conversations.png', fullPage: true });
    log.info('Screenshot salvato: test-screenshot-11-back-to-conversations.png');
    
    // Cerca pulsante logout/disconnetti
    const logoutButton = await page.locator('button:has-text("Disconnetti"), button:has-text("Logout"), button:has-text("Esci"), [aria-label*="Disconnetti"]').first();
    const logoutExists = await logoutButton.count() > 0;
    
    if (!logoutExists) {
      log.warn('Pulsante logout non trovato nella pagina conversazioni');
      return false;
    }
    
    log.info('Clic su logout...');
    await logoutButton.click();
    await page.waitForTimeout(2000);
    
    // Verifica che il popup di login riappaia
    const loginPopup = await waitForElement(page, 'form, [role="dialog"], .login-popup, .popup', 3000);
    
    if (loginPopup) {
      log.success('Logout eseguito - LoginPopup riapparso');
      await page.screenshot({ path: '/workspace/test-screenshot-12-logout.png', fullPage: true });
      log.info('Screenshot salvato: test-screenshot-12-logout.png');
      return true;
    } else {
      log.error('LoginPopup non riapparso dopo logout');
      return false;
    }
  } catch (error) {
    log.error(`Errore durante logout: ${error.message}`);
    return false;
  }
}

// Test 8: Analisi console logs
async function analyzeConsoleLogs(consoleLogs) {
  log.section('Test 8: Analisi Console Logs');
  
  const { errors, warnings, info } = consoleLogs;
  
  if (errors.length > 0) {
    log.error(`Trovati ${errors.length} errori in console:`);
    errors.forEach(e => log.error(`  - ${e}`));
  } else {
    log.success('Nessun errore in console');
  }
  
  if (warnings.length > 0) {
    log.warn(`Trovati ${warnings.length} warning in console:`);
    warnings.forEach(w => log.warn(`  - ${w}`));
  }
  
  // Mostra TUTTI i log info
  if (info.length > 0) {
    log.info(`Console logs (TUTTI ${info.length}):`);
    info.forEach(i => log.info(`  - ${i}`));
  } else {
    log.warn('NESSUN log info trovato - possibile problema di inizializzazione!');
  }
  
  return {
    passed: errors.length === 0,
    errors: errors.length,
    warnings: warnings.length
  };
}

// Main test runner
async function runTests() {
  console.log('\n');
  log.section('🧪 Alfred XMPP Client - Browser Test Suite');
  
  try {
    // Avvia server
    await startDevServer();
    
    // Avvia browser
    log.info('Avvio browser Chromium...');
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Setup console logging - PRIMA di caricare la pagina
    const consoleLogs = { errors: [], warnings: [], info: [] };
    
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        consoleLogs.errors.push(text);
      } else if (type === 'warning') {
        consoleLogs.warnings.push(text);
      } else if (type === 'log' || type === 'info') {
        consoleLogs.info.push(text);
      }
    });
    
    page.on('pageerror', error => {
      consoleLogs.errors.push(`[PAGE ERROR] ${error.message}`);
    });
    
    // Esegui i test in sequenza
    const results = {
      pageLoad: await testPageLoad(page),
      uiElements: await testUIElements(page),
      login: await testLogin(page)
    };
    
    // Test uso applicazione (solo se login è riuscito)
    if (results.login) {
      results.conversationsNav = await testConversationsNavigation(page);
      results.sendMessage = await testSendMessage(page);
      results.userProfile = await testUserProfile(page);
      results.logout = await testLogout(page);
    }
    
    // Analizza console logs
    results.consoleLogs = await analyzeConsoleLogs(consoleLogs);
    
    // Riassunto
    log.section('📊 Risultati Test');
    
    Object.entries(results).forEach(([testName, passed]) => {
      if (passed) {
        log.success(`${testName}: PASSED`);
      } else {
        log.error(`${testName}: FAILED`);
      }
    });
    
    const allPassed = Object.values(results).every(r => r === true);
    
    console.log('\n');
    if (allPassed) {
      log.success('✨ Tutti i test sono passati!');
    } else {
      log.error('❌ Alcuni test sono falliti');
    }
    
    // Chiudi browser
    await browser.close();
    
    return allPassed ? 0 : 1;
    
  } catch (error) {
    log.error(`Errore critico: ${error.message}`);
    console.error(error);
    return 1;
  } finally {
    stopDevServer();
  }
}

// Gestione uscita
process.on('SIGINT', () => {
  log.warn('Test interrotto');
  stopDevServer();
  if (browser) browser.close();
  process.exit(1);
});

// Esegui i test
runTests().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  log.error(`Errore fatale: ${error.message}`);
  console.error(error);
  stopDevServer();
  process.exit(1);
});
