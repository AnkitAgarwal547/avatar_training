'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

// TalkingHead is not on npm — load it from jsDelivr CDN
const TALKING_HEAD_CDN =
  'https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.3/modules/talkinghead.mjs';

// Sample avatar from the TalkingHead repo — works out of the box, no local file needed
const DEFAULT_AVATAR_URL =
  'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png';

function loadTalkingHeadScript() {
  return new Promise((resolve, reject) => {
    if (window.__TalkingHeadModule) {
      resolve(window.__TalkingHeadModule);
      return;
    }
    import(/* webpackIgnore: true */ TALKING_HEAD_CDN)
      .then((mod) => {
        window.__TalkingHeadModule = mod;
        resolve(mod);
      })
      .catch(reject);
  });
}

export default function TalkingAvatar({
  containerStyle,
  onReady,
  onSpeakRef,
  avatarUrl,
}) {
  const containerRef = useRef(null);
  const headRef = useRef(null);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');

  // Use the sample avatar if no local one is specified
  const resolvedAvatarUrl = avatarUrl || DEFAULT_AVATAR_URL;

  const speak = useCallback(async (audio, phonemes) => {
    if (!headRef.current) return;
    try {
      await headRef.current.speakAudio(audio, { phonemes });
    } catch (err) {
      console.error('[TalkingAvatar] speakAudio error:', err);
    }
  }, []);

  useEffect(() => {
    if (onSpeakRef) onSpeakRef.current = speak;
  }, [speak, onSpeakRef]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    async function initHead() {
      try {
        setLoadState('loading');

        // Step 1 — load TalkingHead from CDN
        const mod = await loadTalkingHeadScript();
        if (cancelled) return;

        const TalkingHead = mod.TalkingHead ?? mod.default;
        if (!TalkingHead) throw new Error('TalkingHead class not found in CDN module');

        // Step 2 — create the 3D scene
        // ttsEndpoint is required by TalkingHead even if we only use speakAudio().
        // We point it to our own Kokoro TTS route so it never calls Google.
        const head = new TalkingHead(containerRef.current, {
          cameraView: 'upper',
          avatarMood: 'happy',
          ttsEndpoint: '/api/tts-proxy',  // handled below — just needs to be a valid URL
          ttsApikey: '',
          ttsTrimStart: 0,
          ttsTrimEnd: 0,
        });

        // Step 3 — load the avatar model
        await head.showAvatar({
          url: resolvedAvatarUrl,
          body: 'F',
          avatarMood: 'happy',
        });

        if (cancelled) return;

        headRef.current = head;
        setLoadState('ready');
        onReady?.();
      } catch (err) {
        if (cancelled) return;
        const msg = err?.message || String(err);
        console.error('[TalkingAvatar] Failed to load:', msg);
        setErrorMsg(msg);
        setLoadState('error');
      }
    }

    initHead();
    return () => {
      cancelled = true;
      headRef.current = null;
    };
  }, [resolvedAvatarUrl, onReady]);

  const isOverlayVisible = loadState !== 'ready';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Three.js render target */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '16px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
          ...containerStyle,
        }}
      />

      {/* Loading / error overlay */}
      {isOverlayVisible && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '1rem',
          background: 'rgba(10,10,20,0.92)',
          borderRadius: '16px',
          color: loadState === 'error' ? '#f87171' : 'rgba(255,255,255,0.5)',
          fontSize: '0.9rem',
          padding: '1.5rem',
          textAlign: 'center',
        }}>
          {loadState === 'loading' ? (
            <>
              <div style={{
                width: 36, height: 36,
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <p>Loading 3D Avatar from CDN…</p>
              <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>First load may take a few seconds</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </>
          ) : (
            <>
              <span style={{ fontSize: '2rem' }}>⚠️</span>
              <p><strong>Avatar failed to load</strong></p>
              <p style={{ fontSize: '0.78rem', maxWidth: 280, opacity: 0.7 }}>{errorMsg}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

