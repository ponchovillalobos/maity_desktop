# Deepgram Integration Addendum

This document describes how to use Deepgram for cloud-based transcription in Meetily.

## Prerequisites

- A Deepgram account with API access
- Deepgram API key (get one at https://console.deepgram.com)

## Environment Variables

### Required

```env
# Deepgram transcription (required for cloud transcription)
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### Optional

```env
# Deepgram model (default: nova-2)
# Options: nova-2, nova-2-general, nova-2-meeting, nova-2-phonecall
DEEPGRAM_MODEL=nova-2

# Language for transcription (default: es)
# Options: es, en, multi (for multilingual)
DEEPGRAM_LANGUAGE=es

# OpenAI for summaries (optional, can also be set in app settings)
OPENAI_API_KEY=your_openai_api_key_here
```

## Activating Deepgram

### Method 1: Through the App Settings

1. Open Meetily
2. Go to **Settings** > **Transcription**
3. Select **Deepgram** as the transcription provider
4. Enter your Deepgram API key
5. Save settings

### Method 2: Using Environment Variables

1. Set the environment variable before starting the app:

**Windows (PowerShell):**
```powershell
$env:DEEPGRAM_API_KEY = "your_api_key_here"
npm run tauri dev
```

**Windows (Command Prompt):**
```cmd
set DEEPGRAM_API_KEY=your_api_key_here
npm run tauri dev
```

**macOS/Linux:**
```bash
export DEEPGRAM_API_KEY=your_api_key_here
npm run tauri dev
```

2. Or create a `.env` file in the `frontend/` directory:
```env
DEEPGRAM_API_KEY=your_api_key_here
```

## Reverting to Local Transcription

### Option 1: Through Settings

1. Go to **Settings** > **Transcription**
2. Select **Parakeet** or **Whisper** as the provider
3. Download the required model if not already available
4. Save settings

### Option 2: Remove/Unset Environment Variable

**Windows (PowerShell):**
```powershell
Remove-Item Env:DEEPGRAM_API_KEY
```

**macOS/Linux:**
```bash
unset DEEPGRAM_API_KEY
```

## Supported Features

| Feature | Deepgram | Whisper | Parakeet |
|---------|----------|---------|----------|
| Real-time transcription | Yes | Yes | Yes |
| Partial results | Yes | Yes | No |
| Confidence scores | Yes | Yes | No |
| Multiple languages | Yes | Yes | Limited |
| Offline mode | No | Yes | Yes |
| GPU acceleration | N/A | Yes | Yes |

## Troubleshooting

### "DEEPGRAM_API_KEY not configured"

**Cause:** The API key is not set or is empty.

**Solution:**
1. Check that `DEEPGRAM_API_KEY` is set in environment or app settings
2. Verify the key is valid at https://console.deepgram.com
3. Ensure there are no extra spaces in the key

### "WebSocket connection failed"

**Cause:** Network issues or firewall blocking WebSocket connections.

**Solution:**
1. Check your internet connection
2. Verify `wss://api.deepgram.com` is accessible
3. Check firewall settings for WebSocket (WSS) connections
4. The app will automatically retry up to 3 times

### "Deepgram response timeout"

**Cause:** Slow network or large audio chunks.

**Solution:**
1. Check network speed
2. Ensure audio quality is acceptable
3. The timeout is set to 30 seconds; if consistently hitting it, network may be too slow

### Fallback to Local Transcription

If Deepgram fails or is not configured, Meetily will automatically fall back to Parakeet (local transcription). You'll see a log message:

```
DEEPGRAM_API_KEY not configured, falling back to Parakeet
```

This ensures transcription continues even without cloud access.

## Files Modified

This integration added/modified the following files:

| File | Change | Purpose |
|------|--------|---------|
| `frontend/src-tauri/src/audio/transcription/deepgram_provider.rs` | New | Deepgram WebSocket client |
| `frontend/src-tauri/src/audio/transcription/engine.rs` | Modified | Add "deepgram" provider selection |
| `frontend/src-tauri/src/audio/transcription/mod.rs` | Modified | Export Deepgram types |
| `frontend/src-tauri/Cargo.toml` | Modified | Add tokio-tungstenite dependency |
| `docs/TRANSCRIPTION_PIPELINE.md` | New | Architecture documentation |
| `README_ADDENDUM.md` | New | This file |

## API Usage Notes

- Deepgram charges per minute of audio transcribed
- The integration uses the **Streaming API** (WebSocket)
- Audio is sent as 16-bit PCM at 16kHz mono
- Model `nova-2` provides the best accuracy/speed balance

## Security Considerations

- API keys are **never** logged in plaintext
- Keys stored in app settings are in the local SQLite database
- Environment variables are the recommended method for CI/CD

---

*Last updated: January 2025*
*Integration version: 1.0*
