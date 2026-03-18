# Avatar Training Node.js — Backend

Node.js (TypeScript) backend that powers **voice roleplay** and **TTS for the training avatar**: WebSocket server for real-time speech-to-text and AI replies, and HTTP API for Kokoro TTS.

## Purpose

This server provides:

1. **WebSocket server** (default port `8080`)
   - Receives audio (WebM) or text from the frontend roleplay page.
   - Transcribes audio with **Whisper** (nodejs-whisper).
   - Sends transcript + user message to **OpenAI GPT-4o** (Priya/Meena L-A-S-T roleplay).
   - Synthesises the reply with **Kokoro TTS** and streams back audio + phonemes to the client for the 3D avatar.

2. **HTTP API: `POST /api/tts`**
   - Used by the **training** frontend to get Kokoro speech for lesson content.
   - Request: `{ "text": "...", "voice": "af_heart" }`.
   - Response: `{ "audio": float32[], "phonemes": [...] }`.

So: **roleplay** = WebSocket (audio → Whisper → GPT → Kokoro → client). **Training** = HTTP TTS only (text → Kokoro → client).

## Tech Stack

- **Node.js** (ESM)
- **TypeScript** (tsx for run)
- **ws** — WebSocket server
- **nodejs-whisper** — speech-to-text
- **kokoro-js** — neural TTS (24 kHz)
- **OpenAI** — GPT-4o for roleplay dialogue
- **dotenv** — load `.env.local`

## Project Structure

```
server.ts           # HTTP + WebSocket server, routes, session handling
lib/
├── whisper.ts     # Transcribe audio (nodejs-whisper)
├── kokoro.ts      # initTTS(), synthesise() (kokoro-js)
└── openai.ts      # chat(), tryParseScore(), system prompt (Priya/Meena)
.env.example       # Template for env vars
.env.local         # Your secrets (do not commit)
```

## Configuration

### 1. Install dependencies

```bash
pnpm install
# or: npm install
```

### 2. Environment variables

Create `.env.local` in this directory (same level as `package.json`):

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | **Required.** OpenAI API key for GPT-4o roleplay. |
| `WS_PORT` | Port for HTTP + WebSocket server. Default: `8080`. |

Example `.env.local`:

```env
OPENAI_API_KEY=sk-your-openai-key-here
WS_PORT=8080
```

You can copy from the template:

```bash
cp .env.example .env.local
# then edit .env.local and set OPENAI_API_KEY
```

### 3. Run the server

**Development (watch mode):**

```bash
pnpm dev
# or: npm run dev
```

**Production:**

```bash
pnpm start
# or: npm start
```

You should see something like:

```
🔄 Loading Kokoro TTS model (this may take a moment on first run)...
🚀 Avatar Training server: ws://localhost:8080 + http://localhost:8080/api/tts
```

- **WebSocket:** `ws://localhost:8080` (frontend uses `NEXT_PUBLIC_WS_URL=ws://localhost:8080`).
- **TTS:** `POST http://localhost:8080/api/tts` (frontend uses `NEXT_PUBLIC_TTS_URL=http://localhost:8080/api/tts`).

### 4. CORS

The HTTP server sends permissive CORS headers for `/api/tts` so the frontend (e.g. `localhost:3000`) can call it. For production, restrict origins as needed.

## Frontend dependency

The **avatar-training** Next.js app expects this server for:

- **Roleplay** — WebSocket connection for voice/text and AI + TTS responses.
- **Training** — Optional but recommended; `POST /api/tts` for the lesson avatar voice.

See the [avatar-training README](../avatar-training/README.md) for frontend setup and env vars (`NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_TTS_URL`).

## Quick start (both projects)

1. **Backend:** In `avatar-training-node-js`, add `OPENAI_API_KEY` to `.env.local`, then `pnpm dev`.
2. **Frontend:** In `avatar-training`, add `.env.local` with `OPENAI_API_KEY`, `NEXT_PUBLIC_WS_URL=ws://localhost:8080`, and optionally `NEXT_PUBLIC_TTS_URL=http://localhost:8080/api/tts`, then `pnpm dev`.
3. Open [http://localhost:3000](http://localhost:3000); use **Training** and **Roleplay** from the nav.
