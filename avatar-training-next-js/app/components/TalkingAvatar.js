"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// TalkingHead v1.7+ has built-in MeshOpt decoder support
const TALKING_HEAD_CDN =
  "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/modules/talkinghead.mjs";

// Local avatar (fast) — place avatar.glb in public/avatars/
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/ai-avatar";
const LOCAL_AVATAR_URL = `${BASE_PATH}/avatars/avatar.glb`;
// Fallback CDN (when local missing) — TalkingHead's own sample avatar
const CDN_AVATAR_URL =
  "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/avatars/brunette.glb";

// Pre-cache a female SpeechSynthesis voice (voices load async in Chrome)
let _cachedFemaleVoice = null;
let _voicesReady = false;
function getFemaleVoice() {
  if (_cachedFemaleVoice) return _cachedFemaleVoice;
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  _cachedFemaleVoice =
    voices.find((v) => v.name.includes("Zira") && v.lang.startsWith("en")) ||
    voices.find((v) => v.name.includes("Samantha") && v.lang.startsWith("en")) ||
    voices.find((v) => /Microsoft.*Female/i.test(v.name) && v.lang.startsWith("en")) ||
    voices.find((v) => v.name.includes("Google UK English Female")) ||
    voices.find((v) => /female/i.test(v.name) && v.lang.startsWith("en")) ||
    voices.find((v) => v.lang.startsWith("en") && /woman|girl|samantha|zira|susan|hazel|linda|jenny|aria|libby|sonia/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("en-") && v.localService) ||
    null;
  return _cachedFemaleVoice;
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    _cachedFemaleVoice = null;
    _voicesReady = true;
    getFemaleVoice();
  };
}

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

/** Resolve and resume the TalkingHead AudioContext (must be called inside a user gesture). */
function resumeHeadAudioContext(head) {
  if (!head) return;
  const ctx =
    head.audioContext ?? head._audioContext ?? head.getAudioContext?.();
  if (ctx?.resume && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

/** Oculus viseme IDs (no "viseme_" prefix – TalkingHead prepends it). */
const VISEME_SIL = "sil";
const VISEME_AA = "aa";

/**
 * TalkingHead expects audio as array of ArrayBuffers containing Int16 PCM.
 * Convert Float32 (-1..1) to Int16 and return [arrayBuffer].
 */
function float32ToInt16Pcm(samples) {
  const n = samples.length;
  const buf = new ArrayBuffer(n * 2);
  const view = new Int16Array(buf);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return [buf];
}

/**
 * Build a simple viseme track from audio amplitude (RMS per window).
 * Use when server sends no phonemes (e.g. Kokoro generate() only).
 * Returns { visemes: string[], vtimes: number[], vdurations: number[] } in milliseconds.
 */
function audioEnvelopeToVisemes(samples, sampleRate, windowMs = 50) {
  const windowSamples = Math.round((sampleRate * windowMs) / 1000);
  const visemes = [];
  const vtimes = [];
  const vdurations = [];
  const threshold = 0.008; // tune: above = mouth open (lower = more sensitive)

  let t = 0;
  for (let i = 0; i < samples.length; i += windowSamples) {
    const end = Math.min(i + windowSamples, samples.length);
    let sumSq = 0;
    let n = 0;
    for (let j = i; j < end; j++) {
      sumSq += samples[j] * samples[j];
      n++;
    }
    const rms = n > 0 ? Math.sqrt(sumSq / n) : 0;
    const isOpen = rms > threshold;
    visemes.push(isOpen ? VISEME_AA : VISEME_SIL);
    vtimes.push(t);
    vdurations.push(windowMs);
    t += windowMs;
  }

  if (visemes.length === 0) {
    visemes.push(VISEME_SIL);
    vtimes.push(0);
    vdurations.push(Math.max(50, (samples.length / sampleRate) * 1000));
  }
  return { visemes, vtimes, vdurations };
}

/**
 * Generate word-timed visemes from text for lip-sync animation.
 * Returns visemes, vtimes, vdurations and estimated total duration in ms.
 */
function textToVisemes(text) {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const MS_PER_CHAR = 55;
  const GAP_MS = 40;
  const OPEN = ["aa", "O", "EE", "I", "aa", "U"];
  const visemes = [];
  const vtimes = [];
  const vdurations = [];
  let t = 0;
  for (const word of words) {
    const syllables = Math.max(1, Math.ceil(word.length / 3));
    const wordMs = Math.max(150, word.length * MS_PER_CHAR);
    const sylMs = wordMs / syllables;
    for (let s = 0; s < syllables; s++) {
      const openMs = sylMs * 0.65;
      const closeMs = sylMs * 0.35;
      visemes.push(OPEN[(s + word.charCodeAt(0)) % OPEN.length]);
      vtimes.push(t);
      vdurations.push(openMs);
      t += openMs;
      visemes.push(VISEME_SIL);
      vtimes.push(t);
      vdurations.push(closeMs);
      t += closeMs;
    }
    visemes.push(VISEME_SIL);
    vtimes.push(t);
    vdurations.push(GAP_MS);
    t += GAP_MS;
  }
  return { visemes, vtimes, vdurations, totalMs: Math.max(500, t) };
}

/** Supported expression/mood values: "neutral" | "happy" | "angry" (TalkingHead setMood). */

export default function TalkingAvatar({
  containerStyle,
  onReady,
  onSpeakRef,
  onSpeakTextRef,
  onResumeAudioRef,
  onStopRef,
  onExpressionRef,
  expression: initialExpression = "happy",
  avatarUrl,
}) {
  const containerRef = useRef(null);
  const headRef = useRef(null);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState("");

  const setExpression = useCallback((expression) => {
    const head = headRef.current;
    if (!head || typeof head.setMood !== "function") return;
    try {
      head.setMood(expression);
    } catch (err) {
      console.warn("[TalkingAvatar] setMood failed:", err);
    }
  }, []);

  // Try local first (fast), then CDN fallback; or use custom avatarUrl if provided
  const avatarUrls = avatarUrl
    ? [avatarUrl]
    : [LOCAL_AVATAR_URL, CDN_AVATAR_URL];

  const speak = useCallback(async (audio, phonemes, options = {}) => {
    if (!headRef.current) return;
    if (!audio?.length) {
      console.warn("[TalkingAvatar] No audio samples to play");
      return;
    }
    try {
      const sampleRate = options.sampleRate ?? 24000;
      const samples =
        audio instanceof Float32Array ? audio : new Float32Array(audio);

      // TalkingHead playAudio() expects audio as array of Int16 ArrayBuffers; float array breaks concatArrayBuffers so anim never runs.
      const audioForHead = float32ToInt16Pcm(samples);

      // TalkingHead expects visemes + vtimes + vdurations for lip-sync (Oculus format).
      // When server sends no phonemes (e.g. Kokoro generate()), use amplitude-based visemes.
      const hasPhonemeTiming =
        Array.isArray(phonemes) &&
        phonemes.length > 0 &&
        (typeof phonemes[0] === "object" ? phonemes[0].start != null : false);
      let lipSync = {};
      if (hasPhonemeTiming) {
        // Server sent timed phonemes – map to visemes if needed (format varies by TTS).
        lipSync = { phonemes: phonemes ?? [] };
      } else {
        const { visemes, vtimes, vdurations } = audioEnvelopeToVisemes(
          samples,
          sampleRate,
          50,
        );
        lipSync = { visemes, vtimes, vdurations };
      }

      // TalkingHead only runs lip-sync when r.words is set; it then uses r.visemes if present.
      // Pass one dummy word so the block runs; viseme names are without "viseme_" prefix.
      const totalDurationMs = Math.round((samples.length / sampleRate) * 1000);
      const payload = {
        audio: audioForHead,
        sampleRate,
        words: [" "], // required so the library enters the lip-sync block
        wtimes: [0],
        wdurations: [Math.max(50, totalDurationMs)],
        ...lipSync,
        ...options,
      };
      await headRef.current.speakAudio(payload, { lipsyncLang: "en" });
    } catch (err) {
      console.error("[TalkingAvatar] speakAudio error:", err);
    }
  }, []);

  const speakTextDirect = useCallback(async (text) => {
    const head = headRef.current;
    if (!head || !text) return;
    resumeHeadAudioContext(head);
    try {
      const { visemes, vtimes, vdurations, totalMs } = textToVisemes(text);
      const sampleRate = 24000;
      const totalSamples = Math.round((sampleRate * totalMs) / 1000);

      // Near-silent PCM buffer — drives TalkingHead's animation timer without audible sound
      const silence = new Float32Array(totalSamples);
      for (let i = 0; i < totalSamples; i++) {
        silence[i] = 1e-5 * (Math.random() - 0.5);
      }
      const audioForHead = float32ToInt16Pcm(silence);

      // Drive lip-sync via speakAudio (mouth moves, audio inaudible)
      head.speakAudio(
        {
          audio: audioForHead,
          sampleRate,
          words: [" "],
          wtimes: [0],
          wdurations: [totalMs],
          visemes,
          vtimes,
          vdurations,
        },
        { lipsyncLang: "en" },
      );

      // Actual voice via browser SpeechSynthesis (instant, no network)
      await new Promise((resolve) => {
        const synth = typeof window !== "undefined" && window.speechSynthesis;
        if (!synth) {
          resolve();
          return;
        }
        synth.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = "en-US";
        utt.rate = 1.0;
        const voice = getFemaleVoice();
        if (voice) utt.voice = voice;
        utt.onend = resolve;
        utt.onerror = resolve;
        synth.speak(utt);
      });
    } catch (err) {
      console.error("[TalkingAvatar] speakText error:", err);
    }
  }, []);

  const resumeAudio = useCallback(() => {
    resumeHeadAudioContext(headRef.current);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    const head = headRef.current;
    if (!head) return;
    try {
      if (typeof head.stopSpeaking === "function") head.stopSpeaking();
      else if (typeof head.streamStop === "function") head.streamStop();
      else if (typeof head.stop === "function") head.stop();
      else if (typeof head.stopAudio === "function") head.stopAudio();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (onSpeakRef) onSpeakRef.current = speak;
  }, [speak, onSpeakRef]);

  useEffect(() => {
    if (onSpeakTextRef) onSpeakTextRef.current = speakTextDirect;
  }, [speakTextDirect, onSpeakTextRef]);

  useEffect(() => {
    if (onResumeAudioRef) onResumeAudioRef.current = resumeAudio;
  }, [resumeAudio, onResumeAudioRef]);

  useEffect(() => {
    if (onExpressionRef) onExpressionRef.current = setExpression;
    return () => {
      if (onExpressionRef) onExpressionRef.current = null;
    };
  }, [setExpression, onExpressionRef]);

  useEffect(() => {
    if (onStopRef) onStopRef.current = stop;
    return () => {
      if (onStopRef) onStopRef.current = null;
      stop();
    };
  }, [stop, onStopRef]);

  // Use a ref for onReady so it doesn't trigger effect re-runs if the parent
  // passes an inline function (which changes identity every render).
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    async function initHead() {
      try {
        setLoadState("loading");

        // Step 0 — Patch GLTFLoader so every instance auto-sets MeshOpt decoder
        // (TalkingHead creates its own loader; setMeshoptDecoder is per-instance)
        if (!window.__MeshoptDecoderConfigured) {
          const [gltfMod, meshoptMod] = await Promise.all([
            import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js"),
            import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/meshopt_decoder.module.js"),
          ]);
          const GLTFLoader = gltfMod.GLTFLoader ?? gltfMod.default;
          const MeshoptDecoder = meshoptMod.MeshoptDecoder ?? meshoptMod.default;
          if (GLTFLoader && MeshoptDecoder && GLTFLoader.prototype.load) {
            const origLoad = GLTFLoader.prototype.load;
            GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
              if (!this.meshoptDecoder) this.setMeshoptDecoder(MeshoptDecoder);
              return origLoad.call(this, url, onLoad, onProgress, onError);
            };
            window.__MeshoptDecoderConfigured = true;
          }
        }
        if (cancelled) return;

        // Step 1 — load TalkingHead
        const mod = await loadTalkingHeadScript();
        if (cancelled) return;

        const TalkingHead = mod.TalkingHead ?? mod.default;
        if (!TalkingHead)
          throw new Error("TalkingHead class not found in CDN module");

        // Step 2 — create the 3D scene (no ttsEndpoint — we use speakAudio + browser SpeechSynthesis)
        const head = new TalkingHead(containerRef.current, {
          cameraView: "upper",
          avatarMood: initialExpression,
          lipsyncLang: "en",
          pcmSampleRate: 24000,
        });

        // Step 3 — load avatar: try local first (fast), then CDN fallback
        let lastErr = null;
        for (const url of avatarUrls) {
          if (cancelled) return;
          try {
            await head.showAvatar({
              url,
              body: "F",
              lipsyncLang: "en",
              avatarMood: initialExpression,
            });
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            console.warn("[TalkingAvatar] Failed to load from", url, e?.message);
          }
        }
        if (lastErr) throw lastErr;
        if (cancelled) return;

        headRef.current = head;
        setLoadState("ready");
        onReadyRef.current?.();
      } catch (err) {
        if (cancelled) return;
        const msg = err?.message || String(err);
        console.error("[TalkingAvatar] Failed to load:", msg);
        setErrorMsg(msg);
        setLoadState("error");
      }
    }

    initHead();
    return () => {
      cancelled = true;
      const head = headRef.current;
      if (head) {
        try {
          if (typeof head.streamStop === "function") head.streamStop();
          else if (typeof head.stop === "function") head.stop();
          else if (typeof head.stopAudio === "function") head.stopAudio();
        } catch {}
      }
      headRef.current = null;
    };
  }, [avatarUrl, initialExpression]);

  const isOverlayVisible = loadState !== "ready";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Three.js render target */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
          ...containerStyle,
        }}
      />

      {/* Loading / error overlay */}
      {isOverlayVisible && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            background: "rgba(10,10,20,0.92)",
            borderRadius: "16px",
            color: loadState === "error" ? "#f87171" : "rgba(255,255,255,0.5)",
            fontSize: "0.9rem",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          {loadState === "loading" ? (
            <>
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: "3px solid rgba(255,255,255,0.1)",
                  borderTopColor: "#6366f1",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <p>Loading 3D Avatar from CDN…</p>
              <p style={{ fontSize: "0.75rem", opacity: 0.5 }}>
                First load may take a few seconds
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </>
          ) : (
            <>
              <span style={{ fontSize: "2rem" }}>⚠️</span>
              <p>
                <strong>Avatar failed to load</strong>
              </p>
              <p style={{ fontSize: "0.78rem", maxWidth: 280, opacity: 0.7 }}>
                {errorMsg}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
