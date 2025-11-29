// Test completo con le patch per trashserver.net
import { registerAccount } from './src/services/xmpp.ts';

console.log('=== Test registrazione trashserver.net con patch ===\n');

const domain = 'trashserver.net';
const username = 'testuser' + Math.floor(Math.random() * 100000);
const password = 'testpass123';

console.log(`Domain: ${domain}`);
console.log(`Username: ${username}`);
console.log('');

registerAccount({ domain, username, password })
  .then((result) => {
    console.log('\n=== Risultato ===');
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    if (result.details) console.log('Details:', result.details);
    if (result.jid) console.log('JID:', result.jid);
    
    if (!result.success && result.message.includes('Timeout')) {
      console.log('\n❌ FALLITO: Ancora timeout');
      process.exit(1);
    } else {
      console.log('\n✓ SUCCESSO: Nessun timeout, server risponde correttamente');
      console.log('(Il server potrebbe rifiutare la registrazione per policy, ma connessione OK)');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('\n=== Errore ===');
    console.error(error);
    process.exit(1);
  });
