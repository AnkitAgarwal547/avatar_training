'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ScoreCard, { Score } from '../components/ScoreCard';
import type { AvatarExpression } from '../components/TalkingAvatar';
import styles from './roleplay.module.css';

// TalkingAvatar is client-only (Three.js needs the DOM)
const TalkingAvatar = dynamic(() => import('../components/TalkingAvatar'), { ssr: false });

const EXPRESSIONS: { value: AvatarExpression; label: string }[] = [
  { value: 'happy', label: '😊 Happy' },
  { value: 'neutral', label: '😐 Neutral' },
  { value: 'angry', label: '😠 Angry' },
];

type Status = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';
type WsStatus = 'connecting' | 'open' | 'closed' | 'error';

interface ChatMessage {
  role: 'user' | 'avatar';
  text: string;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080';

export default function RoleplayPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [score, setScore] = useState<Score | null>(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [isAvatarReady, setIsAvatarReady] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speakRef = useRef<((audio: Float32Array, phonemes: unknown[]) => Promise<void>) | null>(null);
  const expressionRef = useRef<((expression: AvatarExpression) => void) | null>(null);
  const [expression, setExpressionState] = useState<AvatarExpression>('happy');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const setExpression = useCallback((expr: AvatarExpression) => {
    setExpressionState(expr);
    expressionRef.current?.(expr);
  }, []);

  // ── WebSocket setup ──────────────────────────────────────────────────────
  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setWsStatus('open');
      ws.onclose = () => {
        setWsStatus('closed');
        // Auto-reconnect after 3s
        setTimeout(connect, 3000);
      };
      ws.onerror = () => setWsStatus('error');

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data as string) as Record<string, unknown>;

        if (msg.type === 'connected') {
          console.log('[WS] Connected, session:', msg.sessionId);
          return;
        }

        if (msg.type === 'response') {
          const userText = msg.userText as string;
          const replyText = msg.text as string;
          const audioArr = msg.audio as number[];
          const phonemes = msg.phonemes as unknown[];
          const count = msg.exchangeCount as number;

          setExchangeCount(count);
          setMessages(prev => [
            ...prev,
            { role: 'user', text: userText },
            { role: 'avatar', text: replyText },
          ]);

          // Play lip-synced TTS audio
          if (speakRef.current) {
            setStatus('speaking');
            const audioSamples = new Float32Array(audioArr);
            await speakRef.current(audioSamples, phonemes);
            setStatus('idle');
          }
          return;
        }

        if (msg.type === 'score') {
          setScore({
            empathy: msg.empathy as number,
            resolution: msg.resolution as number,
            tone: msg.tone as number,
            feedback: msg.feedback as string,
          });
          setStatus('idle');
          return;
        }

        if (msg.type === 'error') {
          console.error('[WS] Server error:', msg.message);
          setStatus('error');
          setTimeout(() => setStatus('idle'), 2500);
        }
      };
    }

    connect();
    return () => wsRef.current?.close();
  }, []);

  // ── Auto-scroll chat ─────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Recording helpers ────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (status !== 'idle' || wsStatus !== 'open') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const buffer = await blob.arrayBuffer();
        wsRef.current?.send(JSON.stringify({
          type: 'audio',
          audio: Array.from(new Uint8Array(buffer)),
        }));
        setStatus('processing');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus('recording');
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  }, [status, wsStatus]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  const handleRetry = useCallback(() => {
    setScore(null);
    setMessages([]);
    setExchangeCount(0);
    setStatus('idle');
    // Reconnect WS to get a fresh session
    wsRef.current?.close();
  }, []);

  // ── Status helpers ───────────────────────────────────────────────────────
  const statusLabel: Record<Status, string> = {
    idle: wsStatus === 'open' ? 'Hold to speak' : 'Connecting...',
    recording: 'Listening...',
    processing: 'Processing...',
    speaking: 'Avatar speaking...',
    error: 'Something went wrong — try again',
  };

  const statusColor: Record<Status, string> = {
    idle: '#6366f1',
    recording: '#ef4444',
    processing: '#f59e0b',
    speaking: '#10b981',
    error: '#ef4444',
  };

  return (
    <div className={styles.page}>
      {/* Score overlay */}
      {score && <ScoreCard score={score} onRetry={handleRetry} />}

      <div className={styles.layout}>
        {/* ── Left: Avatar ──────────────────────────────────────────────── */}
        <div className={styles.avatarPanel}>
          <div className={styles.avatarContainer}>
            <TalkingAvatar
              onReady={() => setIsAvatarReady(true)}
              onSpeakRef={speakRef}
              expression={expression}
              onExpressionRef={expressionRef}
              containerStyle={{ height: '100%' }}
            />
            {isAvatarReady && (
              <div className={styles.expressionRow}>
                <span className={styles.expressionLabel}>Expression</span>
                <div className={styles.expressionBtns}>
                  {EXPRESSIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.expressionBtn} ${expression === value ? styles.expressionBtnActive : ''}`}
                      onClick={() => setExpression(value)}
                      aria-pressed={expression === value}
                      aria-label={`Set expression to ${value}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!isAvatarReady && (
              <div className={styles.avatarLoading}>
                <div className={styles.spinner} />
                <p>Loading 3D Avatar...</p>
              </div>
            )}
          </div>

          {/* Exchange counter */}
          <div className={styles.exchangeRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`${styles.exchangeDot} ${i < exchangeCount ? styles.dotFilled : ''}`}
              />
            ))}
            <span className={styles.exchangeLabel}>{exchangeCount}/4 exchanges</span>
          </div>

          {/* Mic button */}
          <div className={styles.micArea}>
            <p className={styles.statusLabel} style={{ color: statusColor[status] }}>
              {statusLabel[status]}
            </p>
            <button
              className={`${styles.micBtn} ${status === 'recording' ? styles.micBtnActive : ''}`}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={status === 'processing' || status === 'speaking' || wsStatus !== 'open'}
              aria-label={status === 'recording' ? 'Recording — release to send' : 'Hold to speak'}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
              </svg>
            </button>
            <p className={styles.micHint}>Hold the button and speak</p>
          </div>
        </div>

        {/* ── Right: Chat panel ─────────────────────────────────────────── */}
        <div className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <div className={styles.avatarMeta}>
              <div className={styles.avatarDot} style={{ background: wsStatus === 'open' ? '#10b981' : '#6b7280' }} />
              <span className={styles.avatarName}>Priya (AI Trainer)</span>
            </div>
            <span className={styles.roleplayBadge}>L-A-S-T Roleplay</span>
          </div>

          <div className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🎙️</span>
                <p>Hold the mic button and introduce yourself to Priya to begin the roleplay.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
                <span className={styles.msgRole}>{msg.role === 'user' ? '🧑' : '🤖'}</span>
                <p className={styles.msgText}>{msg.text}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* WS connection status bar */}
          <div className={`${styles.wsBar} ${styles[`ws_${wsStatus}`]}`}>
            <span className={styles.wsDot} />
            {wsStatus === 'open' ? 'Server connected' : wsStatus === 'connecting' ? 'Connecting to server...' : 'Reconnecting...'}
          </div>
        </div>
      </div>
    </div>
  );
}
