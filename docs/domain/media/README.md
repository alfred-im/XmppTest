# Contesto: media

**Stato modellazione:** `documented`

Sotto-contesto di **messaging** — vedi [mapping messaging](../messaging/README.md).

## Mapping dominio → implementazione

| Dominio | Codice |
|---------|--------|
| `PrepareVoiceMessage` | `RecordVoiceStart/Stop`, `SendVoice` |
| `PrepareImage` | `PickImage`, `SendImage` |
| `PrepareVideo` | `PickVideo`, `SendVideo` |
| `PrepareGif` | `SendGif` |
| `PrepareLocation` | `PickLocation`, `RefineLocation`, `SendLocation` |
| `AttachmentReady` | `MediaUploaded` / preview pronta |
| `AttachmentRejected` | `ImageFormatRejected`, limiti dimensione |

Implementazione: `MessageMediaService`, `VoiceRecordingService`, `MessagesController.send*`
