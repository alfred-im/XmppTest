import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurazione test
const TEST_CONFIG = {
  baseUrl: 'http://localhost:4173',
  timeout: 60000,
  accounts: {
    sender: {
      jid: 'testardo@conversations.im',
      password: 'FyqnD2YpGScNsuC'
    },
    receiver: {
      jid: 'testarda@conversations.im',
      password: 'FyqnD2YpGScNsuC'
    }
  }
};

let devServer = null;
let browser = null;

// Utility per logging
const log = {
  info: (msg) => console.log(`\x1b[36mℹ ${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✓ ${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m✗ ${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m⚠ ${msg}\x1b[0m`),
  debug: (msg) => console.log(`\x1b[90m  ${msg}\x1b[0m`),
  section: (msg) => console.log(`\n\x1b[1m${'='.repeat(60)}\x1b[0m\n\x1b[1m${msg}\x1b[0m\n\x1b[1m${'='.repeat(60)}\x1b[0m\n`)
};

// Avvia server di preview
async function startDevServer() {
  log.info('Avvio server preview...');
  
  return new Promise((resolve, reject) => {
    devServer = spawn('npm', ['run', 'preview', '--', '--port', '4173'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverReady = false;

    devServer.stdout.on('data', (data) => {
      const output = data.toString();
      if ((output.includes('Local:') || output.includes('localhost:4173')) && !serverReady) {
        serverReady = true;
        log.success('Server preview avviato');
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

    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Timeout avvio server'));
      }
    }, 30000);
  });
}

// Ferma server
function stopDevServer() {
  if (devServer) {
    log.info('Arresto server preview...');
    devServer.kill();
    devServer = null;
  }
}

// Login su una pagina con gestione migliorata
async function login(page, account) {
  log.info(`Login con ${account.jid}...`);
  
  // Cattura log console
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    
    if (type === 'error') {
      log.error(`Console error: ${text}`);
    }
    
    // Mostra log relativi a push notifications
    if (text.includes('Push Notifications') || text.includes('XEP-0357')) {
      if (text.includes('✅')) {
        log.success(`  ${text.replace('✅', '').trim()}`);
      } else if (text.includes('❌')) {
        log.error(`  ${text.replace('❌', '').trim()}`);
      } else if (text.includes('⚠️')) {
        log.warn(`  ${text.replace('⚠️', '').trim()}`);
      } else {
        log.debug(`  ${text}`);
      }
    }
  });
  
  // Attendi caricamento pagina
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Attendi popup di login
  log.debug('Attesa popup di login...');
  await page.waitForSelector('input[type="text"]', { timeout: 20000, state: 'visible' });
  await page.waitForTimeout(1000);
  
  const jidInput = page.locator('input[type="text"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();
  
  await jidInput.fill(account.jid);
  await passwordInput.fill(account.password);
  await submitButton.click();
  
  // Attendi che il login completi
  await page.waitForTimeout(5000);
  
  log.success(`Login riuscito per ${account.jid}`);
}

// Chiudi popup di debug push se presente
async function closePushPopup(page) {
  try {
    const popup = page.locator('.push-status-overlay');
    if (await popup.isVisible({ timeout: 2000 })) {
      log.info('Chiusura popup push notifications...');
      // Clicca sull'overlay per chiudere
      await popup.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {
    // Popup non presente, continua
  }
}

// Verifica stato push notifications con dettagli
async function checkPushStatusDetailed(page, accountName) {
  log.section(`Debug Push Notifications - ${accountName}`);
  
  const status = await page.evaluate(() => {
    return {
      // Browser capabilities
      pushSupported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
      notificationPermission: 'Notification' in window ? Notification.permission : 'not-supported',
      serviceWorkerRegistered: navigator.serviceWorker ? navigator.serviceWorker.controller !== null : false,
      
      // React app state
      pushConfig: localStorage.getItem('push_config'),
      
      // Service Worker registration
      swReady: new Promise(async (resolve) => {
        if (!navigator.serviceWorker) {
          resolve(null);
          return;
        }
        try {
          const reg = await navigator.serviceWorker.ready;
          const subscription = await reg.pushManager.getSubscription();
          resolve({
            hasSubscription: subscription !== null,
            endpoint: subscription ? subscription.endpoint.substring(0, 60) : null
          });
        } catch (e) {
          resolve({ error: e.message });
        }
      })
    };
  });
  
  // Attendi promise
  const swStatus = await page.evaluate(() => {
    return new Promise(async (resolve) => {
      if (!navigator.serviceWorker) {
        resolve(null);
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        resolve({
          hasSubscription: subscription !== null,
          endpoint: subscription ? subscription.endpoint.substring(0, 60) : null
        });
      } catch (e) {
        resolve({ error: e.message });
      }
    });
  });
  
  log.info(`Push supportato: ${status.pushSupported}`);
  log.info(`Permesso notifiche: ${status.notificationPermission}`);
  log.info(`Service Worker registrato: ${status.serviceWorkerRegistered}`);
  
  const pushConfig = status.pushConfig ? JSON.parse(status.pushConfig) : null;
  log.info(`Configurazione push salvata: ${pushConfig !== null}`);
  if (pushConfig) {
    log.success(`  Push JID: ${pushConfig.pushJid}`);
  } else {
    log.warn(`  Nessuna configurazione push trovata`);
  }
  
  if (swStatus) {
    if (swStatus.hasSubscription) {
      log.success(`Browser push subscription: ${swStatus.endpoint}...`);
    } else {
      log.warn(`Nessuna browser push subscription`);
      if (swStatus.error) {
        log.warn(`  Errore: ${swStatus.error}`);
      }
    }
  }
  
  return status;
}

// Forza permesso notifiche nel browser
async function forceGrantNotificationPermission(page) {
  log.info('Forzatura permesso notifiche...');
  
  // Overrida la proprietà Notification.permission
  await page.addInitScript(() => {
    // Salva il costruttore originale
    const OriginalNotification = window.Notification;
    
    // Crea un nuovo costruttore che simula il permesso granted
    window.Notification = class extends OriginalNotification {
      constructor(...args) {
        super(...args);
      }
    };
    
    // Copia le proprietà statiche
    Object.setPrototypeOf(window.Notification, OriginalNotification);
    window.Notification.prototype = OriginalNotification.prototype;
    
    // Override della proprietà permission
    Object.defineProperty(window.Notification, 'permission', {
      get: () => 'granted',
      configurable: true
    });
    
    // Override del metodo requestPermission
    window.Notification.requestPermission = async () => {
      return 'granted';
    };
  });
  
  log.success('Permesso notifiche forzato a "granted"');
}

// Test principale migliorato
async function runPushDebugTest() {
  console.log('\n');
  log.section('🧪 Test Debug Push Notifications');
  
  try {
    // Avvia server
    await startDevServer();
    
    // Avvia browser in modalità non-headless per vedere cosa succede
    log.info('Avvio browser Chromium (headless)...');
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security', // Permette override permission
      ]
    });
    
    // Crea context per receiver
    const receiverContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      permissions: ['notifications'], // Prova con permissions invece di grantPermissions
    });
    
    const receiverPage = await receiverContext.newPage();
    
    // IMPORTANTE: Forza il permesso notifiche PRIMA di caricare la pagina
    await forceGrantNotificationPermission(receiverPage);
    
    // === SETUP RECEIVER (testarda) ===
    log.section('Setup Receiver (testarda)');
    await receiverPage.goto(`${TEST_CONFIG.baseUrl}/XmppTest/#/`, { waitUntil: 'networkidle' });
    await receiverPage.waitForTimeout(3000);
    await login(receiverPage, TEST_CONFIG.accounts.receiver);
    
    // Chiudi popup di debug
    await closePushPopup(receiverPage);
    
    // Verifica stato iniziale
    const status1 = await checkPushStatusDetailed(receiverPage, 'Receiver - Iniziale');
    
    // Attendi abilitazione automatica (2 secondi nel codice + 8 secondi buffer)
    log.info('');
    log.info('⏳ Attesa 10 secondi per abilitazione automatica push notifications...');
    await receiverPage.waitForTimeout(10000);
    
    // Chiudi di nuovo il popup se è riapparso
    await closePushPopup(receiverPage);
    
    // Verifica stato dopo attesa
    const status2 = await checkPushStatusDetailed(receiverPage, 'Receiver - Dopo attesa');
    
    // Confronta stati
    if (status2.pushConfig && !status1.pushConfig) {
      log.success('');
      log.success('🎉 PUSH NOTIFICATIONS ATTIVATE CON SUCCESSO!');
      log.success('');
    } else if (status2.pushConfig) {
      log.success('');
      log.success('✓ Push notifications già configurate');
      log.success('');
    } else {
      log.error('');
      log.error('✗ Push notifications NON attivate');
      log.error('');
      
      // Tenta manualmente tramite il componente di test
      log.info('Tentativo manuale di abilitazione...');
      
      // Cerca il bottone di test push
      const testButton = receiverPage.locator('.push-status-button');
      if (await testButton.isVisible({ timeout: 2000 })) {
        log.info('Trovato bottone test push, clicco...');
        await testButton.click();
        await receiverPage.waitForTimeout(5000);
        
        // Verifica di nuovo
        const status3 = await checkPushStatusDetailed(receiverPage, 'Receiver - Dopo test manuale');
        
        if (status3.pushConfig) {
          log.success('');
          log.success('🎉 Push abilitate manualmente!');
          log.success('');
        }
      }
    }
    
    // Screenshot finale
    await receiverPage.screenshot({ 
      path: '/workspace/push-debug-receiver.png', 
      fullPage: true 
    });
    log.info('Screenshot salvato: /workspace/push-debug-receiver.png');
    
    // Attendi prima di chiudere per vedere i log
    log.info('');
    log.info('Attesa 5 secondi prima di chiudere...');
    await receiverPage.waitForTimeout(5000);
    
    await browser.close();
    
    return status2.pushConfig ? 0 : 1;
    
  } catch (error) {
    log.error(`Errore critico: ${error.message}`);
    console.error(error);
    if (browser) await browser.close();
    return 1;
  } finally {
    stopDevServer();
  }
}

// Esegui test
runPushDebugTest().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  log.error(`Errore fatale: ${error.message}`);
  console.error(error);
  stopDevServer();
  process.exit(1);
});
