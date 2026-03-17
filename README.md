# Avatar Training — Frontend

Next.js web application for an **AI-powered corporate training platform** with a 3D talking avatar, voice interaction, and live roleplay.

## Project description

**Avatar Training** is a corporate learning platform that uses an AI-driven 3D talking avatar to deliver lessons, answer questions, and run practice conversations. Learners can follow structured training modules with voice and quizzes, then apply skills in real-time roleplay with an AI customer. The frontend is a Next.js app; voice, TTS, and roleplay logic run on a Node.js backend (WebSocket + HTTP).

---

### Training module

The **Training** module is a guided, module-based learning flow. Learners pick a topic (e.g. Workplace Safety, Customer Service, Compliance), move through lessons in order, and get spoken explanations from a 3D avatar with lip-sync (Kokoro TTS). Each lesson includes:

- **Spoken lesson** — The avatar reads the lesson script; playback autoplays when the lesson loads and can be repeated. Volume is adjustable.
- **On-screen content** — Written lesson text and bullet-point summaries.
- **Quiz** — A short multiple-choice quiz after the lesson; the avatar reads the question and gives spoken feedback on the answer.
- **Ask the Avatar** — A chat area where learners can type or use the microphone to ask follow-up questions; the avatar answers using the lesson context (OpenAI) and speaks the reply via TTS.

Learners advance lesson-by-lesson and can switch modules from a dropdown. Progress is reflected per lesson (e.g. completed checkmarks). Training works best with the Node backend for Kokoro TTS; it can fall back to browser SpeechSynthesis if the TTS API is unavailable.

---

### Roleplay module

The **Roleplay** module is a live practice session for **customer complaint handling** using the **L-A-S-T** method (Listen, Apologise, Solve, Thank). Learners talk to **Priya**, an AI trainer. Priya plays **Meena**, an upset customer; the learner’s goal is to de-escalate and resolve the situation.

- **Voice or text** — Learners can hold a button to speak (audio is sent to the backend, transcribed with Whisper, then answered by GPT-4o) or type in the chat. The AI reply is spoken back by the avatar with lip-sync (Kokoro TTS) and shown in the chat.
- **Continuous conversation** — The dialogue continues without a fixed turn limit; the AI stays in character as Meena and adjusts frustration based on whether the learner listens, apologises, and offers a clear solution.
- **Same 3D avatar** — The same TalkingHead avatar used in Training is used here for consistent branding and a single “AI trainer” experience.

The roleplay flow depends on the Node backend (WebSocket for audio/text, Whisper for STT, OpenAI for dialogue, Kokoro for TTS). The text input is disabled while the AI is speaking so learners don’t send during playback and avoid overlapping audio.

---

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
