#!/usr/bin/env node

/**
 * Script per testare se un server XMPP supporta XEP-0357 (Push Notifications)
 * 
 * Uso:
 *   node test-xep-0357-support.mjs <jid> <password>
 * 
 * Esempio:
 *   node test-xep-0357-support.mjs testardo@conversations.im password123
 */

import { createClient } from 'stanza';

// Colori per output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}\n`),
};

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  log.error('Uso: node test-xep-0357-support.mjs <jid> <password>');
  log.error('Esempio: node test-xep-0357-support.mjs testardo@conversations.im password123');
  process.exit(1);
}

const [jid, password] = args;

// Parse JID
const parseJid = (fullJid) => {
  const match = fullJid.match(/^(?:([^@]+)@)?([^@/]+)(?:\/(.+))?$/);
  if (!match) {
    throw new Error(`JID non valido: ${fullJid}`);
  }
  return {
    username: match[1],
    domain: match[2],
    resource: match[3] || 'test-xep-0357',
  };
};

const { username, domain, resource } = parseJid(jid);

log.title('🧪 Test Supporto XEP-0357 (Push Notifications)');
log.info(`JID: ${jid}`);
log.info(`Server: ${domain}`);
log.info('');

// Create XMPP client
const client = createClient({
  jid: `${username}@${domain}/${resource}`,
  password,
  transports: {
    websocket: `wss://${domain}:5281/xmpp-websocket`,
    bosh: false,
  },
});

// Test results
const results = {
  connected: false,
  serverSupportsXEP0357: false,
  pushServices: [],
  error: null,
};

// XEP-0357 namespace
const PUSH_NAMESPACE = 'urn:xmpp:push:0';

// Test function
async function testXEP0357Support() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      log.error('Timeout: impossibile connettersi al server');
      client.disconnect();
      results.error = 'Connection timeout';
      resolve(results);
    }, 30000);

    client.on('session:started', async () => {
      clearTimeout(timeout);
      results.connected = true;
      log.success('Connesso al server XMPP');
      log.info('');
      log.info('🔍 Verifico supporto XEP-0357...');
      log.info('');

      try {
        // Check if server supports XEP-0357 directly
        const serverJid = `${domain}`;
        log.info(`Controllo features del server: ${serverJid}`);
        
        const serverInfo = await client.getDiscoInfo(serverJid);
        
        log.info(`Features trovate: ${serverInfo.features?.length || 0}`);
        serverInfo.features?.forEach((feature) => {
          log.info(`  - ${feature}`);
        });
        log.info('');

        if (serverInfo.features?.includes(PUSH_NAMESPACE)) {
          results.serverSupportsXEP0357 = true;
          results.pushServices.push({ jid: serverJid, node: undefined });
          log.success(`✅ Il server supporta XEP-0357 direttamente!`);
        } else {
          log.warn('Il server non supporta XEP-0357 direttamente');
          log.info('Cerco servizi push disponibili...');
          log.info('');

          // Check available services
          const items = await client.getDiscoItems(serverJid);
          
          if (items.items && items.items.length > 0) {
            log.info(`Trovati ${items.items.length} servizi sul server:`);
            
            for (const item of items.items) {
              if (!item.jid) continue;
              
              try {
                log.info(`  Verifico: ${item.jid}${item.node ? ` (node: ${item.node})` : ''}`);
                const itemInfo = await client.getDiscoInfo(item.jid, item.node);
                
                if (itemInfo.features?.includes(PUSH_NAMESPACE)) {
                  results.pushServices.push({ jid: item.jid.toString(), node: item.node });
                  log.success(`    ✅ Supporta XEP-0357!`);
                } else {
                  log.info(`    ❌ Non supporta XEP-0357`);
                }
              } catch (error) {
                log.warn(`    ⚠ Errore nel controllo: ${error.message}`);
              }
            }
          } else {
            log.warn('Nessun servizio disponibile sul server');
          }
        }

        log.info('');
        log.title('📊 Risultati Test');
        log.info('');
        
        if (results.pushServices.length > 0) {
          log.success(`✅ XEP-0357 supportato!`);
          log.info('');
          log.info('Servizi push trovati:');
          results.pushServices.forEach((service, index) => {
            log.info(`  ${index + 1}. JID: ${service.jid}${service.node ? ` (node: ${service.node})` : ''}`);
          });
          log.info('');
          log.success('✅ Le Push Notifications possono essere abilitate su questo server!');
          log.info('');
          log.info('Per abilitarle:');
          log.info('  1. Configura le chiavi VAPID in src/config/constants.ts');
          log.info(`  2. Imposta DEFAULT_PUSH_JID: '${results.pushServices[0].jid}'`);
          log.info('  3. Le push si abiliteranno automaticamente al login');
        } else {
          log.error('❌ XEP-0357 NON supportato');
          log.info('');
          log.warn('Il server non supporta Push Notifications (XEP-0357)');
          log.info('');
          log.info('Per abilitare le push, serve un server XMPP con:');
          log.info('  - Prosody con mod_cloud_notify');
          log.info('  - Ejabberd con mod_push');
          log.info('  - MongooseIM con mod_event_pusher_push');
          log.info('');
          log.info('Oppure configura un servizio push esterno compatibile con XEP-0357');
        }
        
        client.disconnect();
        resolve(results);
      } catch (error) {
        log.error(`Errore durante il test: ${error.message}`);
        results.error = error.message;
        client.disconnect();
        resolve(results);
      }
    });

    client.on('auth:failed', () => {
      clearTimeout(timeout);
      log.error('Autenticazione fallita');
      log.error('Verifica che JID e password siano corretti');
      results.error = 'Authentication failed';
      client.disconnect();
      resolve(results);
    });

    client.on('disconnected', () => {
      clearTimeout(timeout);
      if (!results.connected && !results.error) {
        log.error('Impossibile connettersi al server');
        results.error = 'Connection failed';
        resolve(results);
      }
    });

    // Start connection
    log.info('Connessione al server...');
    client.connect();
  });
}

// Run test
testXEP0357Support()
  .then((results) => {
    process.exit(results.pushServices.length > 0 ? 0 : 1);
  })
  .catch((error) => {
    log.error(`Errore fatale: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
