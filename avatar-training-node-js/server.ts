import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { transcribe } from "./lib/whisper.js";
import { initTTS, synthesise } from "./lib/kokoro.js";
import { chat, tryParseScore, Message } from "./lib/openai.js";

// Load env vars: .env.local (dev) or .env (production)
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
const envPath = existsSync(resolve(process.cwd(), ".env.local"))
  ? ".env.local"
  : ".env";
config({ path: envPath });

interface Session {
  history: Message[];
  exchangeCount: number;
  /** Ensures messages from this client are processed in-order. */
  queue: Promise<void>;
}

type IncomingMessage =
  | { type: "audio"; audio: number[] }
  | { type: "text"; text: string };

/** Strip markdown for TTS and chat display (no "**text**" or "** **" in message). */
function stripMarkdownForTTS(text: string): string {
  return (
    text
      // **bold** and *italic* and __bold__ and _italic_
      .replace(/\*{2}([^*]*)\*{2}/g, "$1")
      .replace(/\*{1}([^*]*)\*{1}/g, "$1")
      .replace(/_{2}([^_]*)_{2}/g, "$1")
      .replace(/_{1}([^_]*)_{1}/g, "$1")
      // `code`
      .replace(/`([^`]*)`/g, "$1")
      // Remove any leftover standalone ** or * (e.g. empty bold "** **")
      .replace(/\*{2}\s*\*{2}/g, "")
      .replace(/\*{1}\s*\*{1}/g, "")
      .trim()
  );
}

class Semaphore {
  private available: number;
  private waiters: Array<() => void> = [];

  constructor(maxConcurrent: number) {
    if (!Number.isFinite(maxConcurrent) || maxConcurrent < 1) {
      throw new Error(`Invalid maxConcurrent: ${maxConcurrent}`);
    }
    this.available = Math.floor(maxConcurrent);
  }

  async withPermit<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.available > 0) {
      this.available -= 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  private release() {
    const next = this.waiters.shift();
    if (next) {
      next();
      return;
    }
    this.available += 1;
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// Pre-warm Kokoro TTS model before accepting connections.
// On small instances (e.g. Railway 1GB), prewarming can cause OOM — keep it opt-in.
const PREWARM_TTS = (process.env.PREWARM_TTS ?? "").toLowerCase() === "true";
if (PREWARM_TTS) {
  console.log(
    "🔄 Loading Kokoro TTS model (this may take a moment on first run)...",
  );
  await initTTS();
} else {
  console.log("ℹ️ Skipping Kokoro prewarm (set PREWARM_TTS=true to enable)");
}

const sessions = new Map<string, Session>();

// CPU-only friendly concurrency limits (tune as needed).
const STT_CONCURRENCY = parseInt(process.env.STT_CONCURRENCY ?? "1", 10) || 1;
const TTS_CONCURRENCY = parseInt(process.env.TTS_CONCURRENCY ?? "1", 10) || 1;

const STT_TIMEOUT_MS =
  parseInt(process.env.STT_TIMEOUT_MS ?? "60000", 10) || 60000;
const CHAT_TIMEOUT_MS =
  parseInt(process.env.CHAT_TIMEOUT_MS ?? "45000", 10) || 45000;
const TTS_TIMEOUT_MS =
  parseInt(process.env.TTS_TIMEOUT_MS ?? "60000", 10) || 60000;
const HISTORY_MAX_MESSAGES =
  parseInt(process.env.HISTORY_MAX_MESSAGES ?? "12", 10) || 12;

const sttSemaphore = new Semaphore(STT_CONCURRENCY);
const ttsSemaphore = new Semaphore(TTS_CONCURRENCY);

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket) => {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    history: [],
    exchangeCount: 0,
    queue: Promise.resolve(),
  });
  console.log(`[WS] Client connected — session: ${sessionId}`);

  ws.on("message", (rawData) => {
    // Ensure we process this client's messages sequentially (prevents out-of-order replies + history races).
    const session = sessions.get(sessionId);
    if (!session) return;

    session.queue = session.queue
      .then(async () => {
        let msg: IncomingMessage;
        try {
          msg = JSON.parse(rawData.toString()) as IncomingMessage;
        } catch {
          console.error("[WS] Invalid JSON message received");
          return;
        }

        let userText: string;
        if (msg.type === "text") {
          userText = (msg.text ?? "").trim();
          if (!userText) return;
          console.log(`[WS] User text: "${userText.slice(0, 60)}..."`);
        } else if (msg.type === "audio" && msg.audio?.length) {
          try {
            const audioBuffer = Buffer.from(msg.audio);
            console.log(
              `[WS] Transcribing audio (${audioBuffer.byteLength} bytes)...`,
            );
            userText = await sttSemaphore.withPermit(() =>
              withTimeout(
                transcribe(audioBuffer),
                STT_TIMEOUT_MS,
                "STT(transcribe)",
              ),
            );
            console.log(`[WS] Transcript: "${userText}"`);
            if (!userText.trim()) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Could not transcribe audio — please try again.",
                }),
              );
              return;
            }
          } catch (err) {
            console.error("[WS] Transcribe error:", err);
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Could not transcribe audio — please try again.",
              }),
            );
            return;
          }
        } else {
          return;
        }

        try {
          // ── GPT-4o: text → reply ─────────────────────────────────────────
          const reply = await withTimeout(
            chat(session.history, userText),
            CHAT_TIMEOUT_MS,
            "LLM(chat)",
          );
          console.log(
            `[WS] GPT reply (${reply.length} chars): "${reply.slice(0, 80)}..."`,
          );

          session.history.push(
            { role: "user", content: userText },
            { role: "assistant", content: reply },
          );
          if (session.history.length > HISTORY_MAX_MESSAGES) {
            session.history = session.history.slice(-HISTORY_MAX_MESSAGES);
          }
          session.exchangeCount++;

          // ── 3. Check if GPT returned a score JSON ───────────────────────────
          const score = tryParseScore(reply);
          if (score) {
            ws.send(JSON.stringify({ type: "score", ...score }));
            sessions.delete(sessionId);
            return;
          }

          // ── 4. TTS: reply text → audio (strip markdown so we speak "hear" not "asterisk asterisk hear") ──
          const textForTTS = stripMarkdownForTTS(reply);
          const { audio, phonemes } = await ttsSemaphore.withPermit(() =>
            withTimeout(
              synthesise(textForTTS),
              TTS_TIMEOUT_MS,
              "TTS(synthesise)",
            ),
          );

          // ── 5. Send response to browser (strip markdown so chat doesn't show "**text**") ──
          ws.send(
            JSON.stringify({
              type: "response",
              text: textForTTS,
              userText,
              audio: Array.from(audio), // Float32Array → JSON array
              phonemes,
              exchangeCount: session.exchangeCount,
            }),
          );
        } catch (err) {
          console.error("[WS] Pipeline error:", err);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Server error processing your audio.",
            }),
          );
        }
      })
      .catch((err) => {
        // Never let the queue permanently break.
        console.error(`[WS] Queue error (${sessionId}):`, err);
      });
  });

  ws.on("close", () => {
    console.log(`[WS] Client disconnected — session: ${sessionId}`);
    sessions.delete(sessionId);
  });

  ws.on("error", (err) => {
    console.error(`[WS] Socket error (${sessionId}):`, err);
  });

  // Send session ID to client on connect
  ws.send(JSON.stringify({ type: "connected", sessionId }));
});

// HTTP: POST /api/tts for training page (and any client that needs TTS-only)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS, GET, PUT, DELETE, UPDATE, PATCH",
  "Access-Control-Allow-Headers": "Content-Type",
};

server.on("request", (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/tts") {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", async () => {
    try {
      const { text, voice } = JSON.parse(body || "{}") as {
        text?: string;
        voice?: string;
      };
      if (!text?.trim()) {
        res.writeHead(400, {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        });
        res.end(JSON.stringify({ error: "text is required" }));
        return;
      }
      const textForTTS = stripMarkdownForTTS(text);
      const { audio, phonemes } = await ttsSemaphore.withPermit(() =>
        withTimeout(
          synthesise(textForTTS, voice),
          TTS_TIMEOUT_MS,
          "TTS(synthesise)",
        ),
      );
      res.writeHead(200, {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      });
      res.end(
        JSON.stringify({ audio: Array.from(audio), phonemes: phonemes ?? [] }),
      );
    } catch (err) {
      console.error("[API /api/tts] Error:", err);
      res.writeHead(500, {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      });
      res.end(JSON.stringify({ error: "TTS synthesis failed" }));
    }
  });
});

const PORT = parseInt(process.env.WS_PORT ?? process.env.PORT ?? "8080", 10);
server.listen(PORT, () => {
  console.log(
    `🚀 Avatar Training server: ws://localhost:${PORT} + http://localhost:${PORT}/api/tts`,
  );
});
