# Avatar Training — Frontend

Next.js web application for an **AI-powered corporate training platform** with a 3D talking avatar, voice interaction, and live roleplay.

## Purpose

This frontend delivers:

- **Home** — Landing page with feature overview and entry points to training and roleplay.
- **Training** — Module-based lessons with a speaking avatar (Kokoro TTS), quizzes, and “Ask the Avatar” Q&A. Lessons autoplay; volume is controllable.
- **Roleplay** — Real-time voice or text chat with an AI trainer (Priya) using the L-A-S-T method (Listen, Apologise, Solve, Thank). Uses the backend WebSocket for speech-to-text and AI replies with TTS.
- **Modules** — Browse and select training modules.
- **Progress** — View completion across modules.

The app uses a 3D TalkingHead avatar, streams TTS from the Node backend (or falls back to browser SpeechSynthesis), and connects to the backend for roleplay (WebSocket) and training TTS (HTTP).

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **OpenAI** (client-side chat/Q&A on training page)
- **TalkingHead** (3D avatar, loaded from CDN)

## Project Structure

```
app/
├── page.js              # Home
├── layout.js
├── training/
│   └── page.js          # Training (lessons + avatar + quiz)
├── roleplay/
│   └── page.js          # Roleplay (voice/text with Priya)
├── modules/
│   └── page.js          # Module list
├── progress/
│   └── page.js          # Progress view
├── components/          # Avatar, Quiz, AudioControls, Navbar, etc.
├── data/
│   └── trainingData.js  # Lesson content
├── services/            # SpeechService, AIService
└── api/
    └── chat/            # Optional API route for chat
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
| `OPENAI_API_KEY` | OpenAI API key (for training-page Q&A and optional chat API). |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for roleplay. Default: `ws://localhost:8080`. |
| `NEXT_PUBLIC_TTS_URL` | HTTP TTS URL for training avatar. Default: `http://localhost:8080/api/tts`. |

Example `.env.local`:

```env
OPENAI_API_KEY=sk-your-openai-key-here
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_TTS_URL=http://localhost:8080/api/tts
```

- For **roleplay** (voice/text with Priya), the **avatar-training-node-js** server must be running and `NEXT_PUBLIC_WS_URL` must point to it.
- For **training** (avatar speech), either run the Node server and set `NEXT_PUBLIC_TTS_URL`, or leave it unset to use browser SpeechSynthesis only.

### 3. Run the dev server

```bash
pnpm dev
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Build for production

```bash
pnpm build
pnpm start
```

## Backend dependency

- **Roleplay**: requires the **avatar-training-node-js** WebSocket server (Whisper + OpenAI + Kokoro TTS).
- **Training (full experience)**: optional but recommended — same Node server exposes `POST /api/tts` for Kokoro TTS used by the training avatar.

See the [avatar-training-node-js README](../avatar-training-node-js/README.md) for backend setup and configuration.
