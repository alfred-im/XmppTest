# Alfred Client (Flutter)

Client ufficiale Alfred — multi-piattaforma (web, mobile, desktop).

## Stato

**UI mock** — dati statici, nessuna connessione a Supabase o bridge.

| | |
|---|---|
| **Live** | https://alfred-im.github.io/XmppTest/ |
| **Layout** | Lista conversazioni + chat (stile WhatsApp Web) |
| **Brand** | `#2D2926` |

## Sviluppo

```bash
flutter pub get
flutter analyze
flutter test
flutter run -d chrome
```

## Build web (GitHub Pages)

```bash
flutter build web --release --base-href "/XmppTest/"
```

Il workflow `.github/workflows/deploy-pages.yml` esegue build + deploy su push a `main`.

## Struttura

```
lib/
├── main.dart
├── theme/       # AlfredColors, AlfredTheme
├── models/      # Conversation, ChatMessage
├── data/        # MockData
├── screens/     # HomeScreen
└── widgets/     # pannelli UI
```

## Prossimi passi

1. Auth Supabase
2. API conversazioni/messaggi
3. Realtime
4. Profilo utente

Vedi `PROJECT_MAP.md` e `docs/decisions/project-revolution-discovery.md`.
