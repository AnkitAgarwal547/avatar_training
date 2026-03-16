'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import ScoreCard from '../components/ScoreCard';
import styles from './roleplay.module.css';

// TalkingAvatar must be client-side only (Three.js needs the DOM)
const TalkingAvatar = dynamic(() => import('../components/TalkingAvatar'), { ssr: false });

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

function RoleplayContent() {
  const [status, setStatus] = useState('idle'); // idle | recording | processing | speaking | error
  const [wsStatus, setWsStatus] = useState('connecting'); // connecting | open | closed | error
  const [messages, setMessages] = useState([]);
  const [score, setScore] = useState(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [isAvatarReady, setIsAvatarReady] = useState(false);

  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const speakRef = useRef(null);
  const chatEndRef = useRef(null);

  // ── WebSocket setup ──────────────────────────────────────────────────────
  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setWsStatus('open');
      ws.onclose = () => {
        setWsStatus('closed');
        setTimeout(connect, 3000); // auto-reconnect
      };
      ws.onerror = () => setWsStatus('error');

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'connected') return;

        if (msg.type === 'response') {
          setExchangeCount(msg.exchangeCount);
          setMessages(prev => [
            ...prev,
            { role: 'user',   text: msg.userText },
            { role: 'avatar', text: msg.text },
          ]);

          if (speakRef.current) {
            setStatus('speaking');
            const audioSamples = new Float32Array(msg.audio);
            await speakRef.current(audioSamples, msg.phonemes);
            setStatus('idle');
          }
          return;
        }

        if (msg.type === 'score') {
          setScore({ empathy: msg.empathy, resolution: msg.resolution, tone: msg.tone, feedback: msg.feedback });
          setStatus('idle');
          return;
        }

        if (msg.type === 'error') {
          console.error('[WS] Error:', msg.message);
          setStatus('error');
          setTimeout(() => setStatus('idle'), 2500);
        }
      };
    }

    connect();
    return () => wsRef.current?.close();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Recording ────────────────────────────────────────────────────────────
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
    wsRef.current?.close(); // triggers reconnect → fresh session
  }, []);

  // ── Status labels ────────────────────────────────────────────────────────
  const statusLabel = {
    idle:       wsStatus === 'open' ? 'Hold to speak' : 'Connecting...',
    recording:  'Listening...',
    processing: 'Processing...',
    speaking:   'Avatar speaking...',
    error:      'Something went wrong — try again',
  }[status];

  const statusColor = {
    idle: '#6366f1', recording: '#ef4444',
    processing: '#f59e0b', speaking: '#10b981', error: '#ef4444',
  }[status];

  return (
    <div className={styles.page}>
      {score && <ScoreCard score={score} onRetry={handleRetry} />}

      <div className={styles.layout}>
        {/* ── Avatar panel ─────────────────────────────────────────────── */}
        <div className={styles.avatarPanel}>
          <div className={styles.avatarContainer}>
            <TalkingAvatar
              onReady={() => setIsAvatarReady(true)}
              onSpeakRef={speakRef}
              containerStyle={{ height: '100%' }}
            />
            {!isAvatarReady && (
              <div className={styles.avatarLoading}>
                <div className={styles.spinner} />
                <p>Loading 3D Avatar...</p>
              </div>
            )}
          </div>

          {/* Exchange progress dots */}
          <div className={styles.exchangeRow}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${styles.exchangeDot} ${i < exchangeCount ? styles.dotFilled : ''}`} />
            ))}
            <span className={styles.exchangeLabel}>{exchangeCount}/4 exchanges</span>
          </div>

          {/* Mic hold-to-speak button */}
          <div className={styles.micArea}>
            <p className={styles.statusLabel} style={{ color: statusColor }}>{statusLabel}</p>
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

        {/* ── Chat panel ───────────────────────────────────────────────── */}
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

          <div className={`${styles.wsBar} ${styles[`ws_${wsStatus}`]}`}>
            <span className={styles.wsDot} />
            {wsStatus === 'open' ? 'Server connected' : wsStatus === 'connecting' ? 'Connecting to server...' : 'Reconnecting...'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoleplayPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#94a3b8' }}>Loading roleplay...</div>}>
      <RoleplayContent />
    </Suspense>
  );
}
