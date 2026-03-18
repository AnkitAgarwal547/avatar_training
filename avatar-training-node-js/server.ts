import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { transcribe } from './lib/whisper.js';
import { initTTS, synthesise } from './lib/kokoro.js';
import { chat, tryParseScore, Message } from './lib/openai.js';

// Load env vars: .env.local (dev) or .env (production)
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
const envPath = existsSync(resolve(process.cwd(), '.env.local'))
  ? '.env.local'
  : '.env';
config({ path: envPath });

interface Session {
  history: Message[];
  exchangeCount: number;
}

type IncomingMessage =
  | { type: 'audio'; audio: number[] }
  | { type: 'text'; text: string };

/** Strip markdown for TTS and chat display (no "**text**" or "** **" in message). */
function stripMarkdownForTTS(text: string): string {
  return (
    text
      // **bold** and *italic* and __bold__ and _italic_
      .replace(/\*{2}([^*]*)\*{2}/g, '$1')
      .replace(/\*{1}([^*]*)\*{1}/g, '$1')
      .replace(/_{2}([^_]*)_{2}/g, '$1')
      .replace(/_{1}([^_]*)_{1}/g, '$1')
      // `code`
      .replace(/`([^`]*)`/g, '$1')
      // Remove any leftover standalone ** or * (e.g. empty bold "** **")
      .replace(/\*{2}\s*\*{2}/g, '')
      .replace(/\*{1}\s*\*{1}/g, '')
      .trim()
  );
}

// Pre-warm Kokoro TTS model before accepting connections
console.log('🔄 Loading Kokoro TTS model (this may take a moment on first run)...');
await initTTS();

const sessions = new Map<string, Session>();

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { history: [], exchangeCount: 0 });
  console.log(`[WS] Client connected — session: ${sessionId}`);

  ws.on('message', async (rawData) => {
    let msg: IncomingMessage;
    try {
      msg = JSON.parse(rawData.toString()) as IncomingMessage;
    } catch {
      console.error('[WS] Invalid JSON message received');
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) return;

    let userText: string;
    if (msg.type === 'text') {
      userText = (msg.text ?? '').trim();
      if (!userText) return;
      console.log(`[WS] User text: "${userText.slice(0, 60)}..."`);
    } else if (msg.type === 'audio' && msg.audio?.length) {
      try {
        const audioBuffer = Buffer.from(msg.audio);
        console.log(`[WS] Transcribing audio (${audioBuffer.byteLength} bytes)...`);
        userText = await transcribe(audioBuffer);
        console.log(`[WS] Transcript: "${userText}"`);
        if (!userText.trim()) {
          ws.send(JSON.stringify({ type: 'error', message: 'Could not transcribe audio — please try again.' }));
          return;
        }
      } catch (err) {
        console.error('[WS] Transcribe error:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Could not transcribe audio — please try again.' }));
        return;
      }
    } else {
      return;
    }

    try {
      // ── GPT-4o: text → reply ─────────────────────────────────────────
      const reply = await chat(session.history, userText);
      console.log(`[WS] GPT reply (${reply.length} chars): "${reply.slice(0, 80)}..."`);

      session.history.push(
        { role: 'user', content: userText },
        { role: 'assistant', content: reply }
      );
      session.exchangeCount++;

      // ── 3. Check if GPT returned a score JSON ───────────────────────────
      const score = tryParseScore(reply);
      if (score) {
        ws.send(JSON.stringify({ type: 'score', ...score }));
        sessions.delete(sessionId);
        return;
      }

      // ── 4. TTS: reply text → audio (strip markdown so we speak "hear" not "asterisk asterisk hear") ──
      const textForTTS = stripMarkdownForTTS(reply);
      const { audio, phonemes } = await synthesise(textForTTS);

      // ── 5. Send response to browser (strip markdown so chat doesn't show "**text**") ──
      ws.send(JSON.stringify({
        type: 'response',
        text: textForTTS,
        userText,
        audio: Array.from(audio),   // Float32Array → JSON array
        phonemes,
        exchangeCount: session.exchangeCount,
      }));
    } catch (err) {
      console.error('[WS] Pipeline error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Server error processing your audio.' }));
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected — session: ${sessionId}`);
    sessions.delete(sessionId);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Socket error (${sessionId}):`, err);
  });

  // Send session ID to client on connect
  ws.send(JSON.stringify({ type: 'connected', sessionId }));
});

// HTTP: POST /api/tts for training page (and any client that needs TTS-only)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

server.on('request', (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/tts') {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    try {
      const { text, voice } = JSON.parse(body || '{}') as { text?: string; voice?: string };
      if (!text?.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ error: 'text is required' }));
        return;
      }
      const textForTTS = stripMarkdownForTTS(text);
      const { audio, phonemes } = await synthesise(textForTTS, voice);
      res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({ audio: Array.from(audio), phonemes: phonemes ?? [] }));
    } catch (err) {
      console.error('[API /api/tts] Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json', ...CORS_HEADERS });
      res.end(JSON.stringify({ error: 'TTS synthesis failed' }));
    }
  });
});

const PORT = parseInt(process.env.WS_PORT ?? '8080', 10);
server.listen(PORT, () => {
  console.log(`🚀 Avatar Training server: ws://localhost:${PORT} + http://localhost:${PORT}/api/tts`);
});
