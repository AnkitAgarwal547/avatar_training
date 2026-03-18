"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// TalkingHead is not on npm — load it from jsDelivr CDN
const TALKING_HEAD_CDN =
  "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.3/modules/talkinghead.mjs";

// Sample avatar from the TalkingHead repo — works out of the box, no local file needed
const DEFAULT_AVATAR_URL =
  "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png";

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

/** Supported expression/mood values: "neutral" | "happy" | "angry" (TalkingHead setMood). */

export default function TalkingAvatar({
  containerStyle,
  onReady,
  onSpeakRef,
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

  // Use the sample avatar if no local one is specified
  const resolvedAvatarUrl = avatarUrl || DEFAULT_AVATAR_URL;

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

  const resumeAudio = useCallback(() => {
    resumeHeadAudioContext(headRef.current);
  }, []);

  const stop = useCallback(() => {
    const head = headRef.current;
    if (!head) return;
    try {
      if (typeof head.streamStop === "function") head.streamStop();
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

        // Step 1 — load TalkingHead from CDN
        const mod = await loadTalkingHeadScript();
        if (cancelled) return;

        const TalkingHead = mod.TalkingHead ?? mod.default;
        if (!TalkingHead)
          throw new Error("TalkingHead class not found in CDN module");

        // Step 2 — create the 3D scene
        // ttsEndpoint is required by TalkingHead even if we only use speakAudio().
        // We point it to our own Kokoro TTS route so it never calls Google.
        const head = new TalkingHead(containerRef.current, {
          cameraView: "upper",
          avatarMood: initialExpression,
          ttsEndpoint: "/api/tts-proxy", // handled below — just needs to be a valid URL
          ttsApikey: "",
          ttsTrimStart: 0,
          ttsTrimEnd: 0,
          pcmSampleRate: 24000, // Kokoro TTS is 24 kHz
        });

        // Step 3 — load the avatar model
        await head.showAvatar({
          url: resolvedAvatarUrl,
          body: "F",
          avatarMood: initialExpression,
        });

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
  }, [resolvedAvatarUrl, initialExpression]); // removed onReady from deps, relying on the ref

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
