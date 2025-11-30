#!/bin/bash

# Script per avviare il browser di test Alfred XMPP Client
# Questo script avvia il server di sviluppo e fornisce le informazioni per il test

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           Alfred XMPP Client - Test Browser                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 Avvio del server di sviluppo..."
echo ""

# Vai alla directory web-client
cd "$(dirname "$0")"

# Verifica che node_modules esista
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules non trovato. Installazione dipendenze..."
    npm install
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 CREDENZIALI DI TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🔐 Account Principale:"
echo "     JID:      testardo@conversations.im"
echo "     Password: FyqnD2YpGScNsuC"
echo ""
echo "  🔐 Account Secondario (per test chat):"
echo "     JID:      testarda@conversations.im"
echo "     Password: FyqnD2YpGScNsuC"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Il server sarà disponibile su:"
echo "   👉 http://localhost:5173/XmppTest/"
echo ""
echo "📚 Per informazioni complete sui test, vedi:"
echo "   👉 TEST_BROWSER.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏳ Avvio in corso..."
echo ""

# Avvia il server di sviluppo
npm run dev
