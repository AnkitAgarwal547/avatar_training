import { KokoroTTS } from 'kokoro-js';

export interface SynthesisResult {
  audio: Float32Array;
  /** Chunk timings from stream, or [] when using generate() fallback */
  phonemes: { start: number; end: number; phonemes: string }[];
}

let ttsInstance: KokoroTTS | null = null;
let initPromise: Promise<KokoroTTS> | null = null;

/**
 * Lazily load the Kokoro ONNX model (downloads ~320 MB on first use).
 * Subsequent calls reuse the cached singleton.
 */
async function getTTS(): Promise<KokoroTTS> {
  if (ttsInstance) return ttsInstance;

  if (!initPromise) {
    initPromise = KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
      dtype: 'fp32', // CPU-friendly; use 'q8' for faster inference on capable hardware
    }).then((instance) => {
      ttsInstance = instance;
      return instance;
    });
  }

  return initPromise;
}

/**
 * Synthesise text to audio samples + phoneme timings for lip-sync.
 *
 * @param text - The text to convert to speech
 * @param voice - Kokoro voice ID (default: "af_heart" — warm female voice)
 * @returns audio samples (Float32Array) and phoneme timing array
 */
export async function synthesise(
  text: string,
  voice = 'af_heart'
): Promise<SynthesisResult> {
  const tts = await getTTS();

  // Use generate() only. stream() can hang in Node (never yields), so we don't use it here.
  const result = await tts.generate(text, { voice, speed: 1.0 });
  const audio = (result as any).audio ?? (result as any).data;
  if (!audio?.length) {
    throw new Error('Kokoro generate() returned no audio');
  }
  return {
    audio: audio instanceof Float32Array ? audio : new Float32Array(audio),
    phonemes: [],
  };
}

/**
 * Pre-warm the Kokoro model at server startup to avoid cold-start latency.
 */
export async function initTTS(): Promise<void> {
  await getTTS();
  console.log('✅ Kokoro TTS model loaded');
}
