import { chromium } from 'playwright';

/**
 * Test per verificare il problema con le spunte (checkmarks) nella chat
 * Usa account testarda@conversations.im per verificare conversazione con testardo
 */

const TEST_ACCOUNT = {
  jid: 'testarda@conversations.im',
  password: 'FyqnD2YpGScNsuC'
};

const TARGET_CONVERSATION = 'testardo@conversations.im';

async function testCheckmarksIssue() {
  console.log('🔍 Avvio test per verificare problema spunte...\n');

  const browser = await chromium.launch({
    headless: true, // Headless per ambiente senza X server
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  try {
    // 1. Carica l'app
    console.log('📱 Apertura app...');
    await page.goto('http://localhost:5173/XmppTest/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 2. Verifica se c'è auto-login o se serve login manuale
    console.log('🔐 Verifica stato login...');
    
    // Prima controlla lo stato attuale
    await page.waitForTimeout(3000);
    
    const hasLoginPopup = await page.locator('.login-popup').count();
    const hasConversationsPage = await page.locator('.conversations-page').count();
    
    if (hasLoginPopup > 0) {
      console.log('   Login necessario, inserisco credenziali...');
      await page.fill('input[name="jid"]', TEST_ACCOUNT.jid);
      await page.fill('input[name="password"]', TEST_ACCOUNT.password);
      await page.click('button[type="submit"]');
      
      // Attendi che il login completi
      await page.waitForSelector('.conversations-page', { timeout: 30000 });
      console.log('   ✓ Login completato');
    } else if (hasConversationsPage > 0) {
      // Verifica quale account è loggato
      const currentJid = await page.evaluate(() => localStorage.getItem('xmpp_jid'));
      console.log(`   ✓ Già loggato come: ${currentJid}`);
      
      if (currentJid !== TEST_ACCOUNT.jid) {
        console.log(`   ⚠️ Account diverso da quello richiesto. Richiesta pulizia e nuovo login...`);
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);
        
        await page.waitForSelector('.login-popup', { timeout: 10000 });
        await page.fill('input[name="jid"]', TEST_ACCOUNT.jid);
        await page.fill('input[name="password"]', TEST_ACCOUNT.password);
        await page.click('button[type="submit"]');
        await page.waitForSelector('.conversations-page', { timeout: 30000 });
        console.log('   ✓ Login completato');
      }
    } else {
      await page.screenshot({ path: '/tmp/login-debug.png' });
      console.log('   ❌ Stato applicazione non riconosciuto. Screenshot salvato in /tmp/login-debug.png');
      throw new Error('Impossibile trovare stato applicazione');
    }

    // 4. Attendi caricamento conversazioni (sync può richiedere tempo)
    console.log('📋 Attendo caricamento conversazioni...');
    
    // Aspetta che ci siano conversazioni o che compaia il messaggio "nessuna conversazione"
    let conversationsLoaded = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(2000);
      const convCount = await page.locator('.conversation-item').count();
      console.log(`   Tentativo ${i + 1}/20: trovate ${convCount} conversazioni`);
      
      if (convCount > 0) {
        conversationsLoaded = true;
        break;
      }
    }
    
    if (!conversationsLoaded) {
      console.log('   ⚠️ Nessuna conversazione caricata dopo 40 secondi');
    }

    // 5. Cerca e apri conversazione con testardo
    console.log(`💬 Apertura conversazione con ${TARGET_CONVERSATION}...`);
    const conversationItem = await page.locator(`.conversation-item:has-text("testardo")`).first();
    
    if (await conversationItem.count() === 0) {
      console.error('❌ Conversazione con testardo non trovata!');
      console.log('Conversazioni disponibili:');
      const conversations = await page.locator('.conversation-item').allTextContents();
      conversations.forEach((conv, idx) => {
        console.log(`  ${idx + 1}. ${conv}`);
      });
      return;
    }

    await conversationItem.click();
    await page.waitForSelector('.chat-page', { timeout: 5000 });
    console.log('   ✓ Chat aperta\n');

    // 6. Attendi caricamento messaggi
    await page.waitForTimeout(2000);

    // 7. Analizza i messaggi e le spunte
    console.log('🔍 ANALISI MESSAGGI E SPUNTE:\n');
    console.log('=' .repeat(80));

    const messages = await page.locator('.chat-page__message').all();
    console.log(`\nTotale messaggi visualizzati: ${messages.length}\n`);

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const isMe = await message.evaluate(el => el.classList.contains('chat-page__message--me'));
      const body = await message.locator('.chat-page__message-body').textContent();
      const time = await message.locator('.chat-page__message-time').textContent();
      
      // Cerca spunte
      let checkmark = 'nessuna';
      const pending = await message.locator('.chat-page__checkmark-pending').count();
      const single = await message.locator('.chat-page__checkmark-single').count();
      const double = await message.locator('.chat-page__checkmark-double').count();
      const doubleBlue = await message.locator('.chat-page__checkmark-double-blue').count();
      const failed = await message.locator('.chat-page__checkmark-failed').count();

      if (pending > 0) checkmark = '🕐 pending';
      else if (single > 0) checkmark = '✓ sent';
      else if (double > 0) checkmark = '✓✓ displayed';
      else if (doubleBlue > 0) checkmark = '✓✓ acknowledged (blu)';
      else if (failed > 0) checkmark = '✗ failed';

      const direction = isMe ? '➡️  ME' : '⬅️  LORO';
      const truncatedBody = body.substring(0, 60) + (body.length > 60 ? '...' : '');
      
      console.log(`[${i + 1}] ${direction}`);
      console.log(`    Testo: "${truncatedBody}"`);
      console.log(`    Ora: ${time}`);
      if (isMe) {
        console.log(`    Spunta: ${checkmark}`);
      }
      console.log('');
    }

    // 8. Verifica nel database (tramite console)
    console.log('=' .repeat(80));
    console.log('\n💾 VERIFICA DATABASE:\n');
    
    const dbMessages = await page.evaluate(async (targetJid) => {
      // Apri il database
      const dbName = 'conversations-db';
      const request = indexedDB.open(dbName);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = async (event) => {
          const db = event.target.result;
          const tx = db.transaction('messages', 'readonly');
          const store = tx.objectStore('messages');
          const index = store.index('by-conversationJid');
          const getRequest = index.getAll(targetJid);
          
          getRequest.onsuccess = () => {
            const messages = getRequest.result;
            // Converte Date objects a string per serializzazione
            const serialized = messages.map(m => ({
              ...m,
              timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : null,
              messageId: m.messageId.substring(0, 12) + '...',
              body: m.body ? m.body.substring(0, 40) + (m.body.length > 40 ? '...' : '') : '[vuoto]',
              from: m.from,
              status: m.status,
              markerType: m.markerType || null,
              markerFor: m.markerFor ? m.markerFor.substring(0, 12) + '...' : null,
            }));
            resolve(serialized);
          };
          
          getRequest.onerror = () => reject(getRequest.error);
        };
        
        request.onerror = () => reject(request.error);
      });
    }, TARGET_CONVERSATION);

    console.log(`Totale messaggi nel DB per ${TARGET_CONVERSATION}: ${dbMessages.length}\n`);

    // Separa messaggi normali e marker
    const normalMessages = dbMessages.filter(m => !m.markerType);
    const markers = dbMessages.filter(m => m.markerType);

    console.log(`  - Messaggi normali: ${normalMessages.length}`);
    console.log(`  - Marker: ${markers.length}\n`);

    // Mostra messaggi normali
    console.log('📝 MESSAGGI NORMALI:');
    normalMessages.forEach((msg, idx) => {
      console.log(`  [${idx + 1}] ${msg.from === 'me' ? '➡️  ME' : '⬅️  LORO'}`);
      console.log(`      ID: ${msg.messageId}`);
      console.log(`      Testo: "${msg.body}"`);
      console.log(`      Status: ${msg.status}`);
      console.log(`      Timestamp: ${msg.timestamp}`);
    });

    // Mostra marker
    console.log(`\n📍 MARKER (${markers.length}):`);
    markers.forEach((marker, idx) => {
      console.log(`  [${idx + 1}] Tipo: ${marker.markerType}`);
      console.log(`      Per messaggio: ${marker.markerFor}`);
      console.log(`      Da: ${marker.from}`);
      console.log(`      Timestamp: ${marker.timestamp}`);
    });

    // 9. Cerca anomalie
    console.log('\n' + '=' .repeat(80));
    console.log('\n🔍 VERIFICA ANOMALIE:\n');

    // Verifica messaggi con marker duplicati
    const messageIds = normalMessages.filter(m => m.from === 'me').map(m => m.messageId);
    const markersByMessage = {};
    
    markers.forEach(marker => {
      const shortId = marker.markerFor;
      if (!markersByMessage[shortId]) {
        markersByMessage[shortId] = [];
      }
      markersByMessage[shortId].push(marker.markerType);
    });

    // Controlla ogni messaggio
    let issuesFound = 0;
    
    normalMessages.filter(m => m.from === 'me').forEach((msg) => {
      const shortId = msg.messageId;
      const markersForThisMsg = markersByMessage[shortId] || [];
      
      if (markersForThisMsg.length === 0) {
        console.log(`⚠️  Messaggio senza marker: "${msg.body}"`);
        console.log(`    ID: ${shortId}`);
        issuesFound++;
      } else if (markersForThisMsg.length > 1) {
        console.log(`⚠️  Messaggio con marker multipli: "${msg.body}"`);
        console.log(`    ID: ${shortId}`);
        console.log(`    Marker: ${markersForThisMsg.join(', ')}`);
        issuesFound++;
      }
    });

    // Marker orfani (senza messaggio corrispondente)
    const normalMsgIds = normalMessages.map(m => m.messageId);
    markers.forEach(marker => {
      const markerFor = marker.markerFor;
      const found = normalMsgIds.some(id => id.startsWith(markerFor.replace('...', '')));
      if (!found) {
        console.log(`⚠️  Marker orfano (nessun messaggio corrispondente):`);
        console.log(`    Tipo: ${marker.markerType}`);
        console.log(`    Per messaggio: ${markerFor}`);
        issuesFound++;
      }
    });

    if (issuesFound === 0) {
      console.log('✅ Nessuna anomalia evidente trovata');
    } else {
      console.log(`\n❌ Trovate ${issuesFound} anomalie!`);
    }

    console.log('\n' + '=' .repeat(80));
    console.log('\n✅ Test completato.\n');

  } catch (error) {
    console.error('\n❌ Errore durante il test:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Esegui il test
testCheckmarksIssue().catch(console.error);
