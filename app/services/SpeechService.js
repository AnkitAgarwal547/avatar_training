'use client';

class SpeechService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.recognition = null;
    this.currentUtterance = null;
    this.selectedVoice = null;
    this.isSpeaking = false;
    this.isListening = false;

    if (typeof window !== 'undefined') {
      this._initVoices();
      this._initRecognition();
    }
  }

  _initVoices() {
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      // Prefer high-quality English voices
      this.selectedVoice =
        voices.find(v => v.name.includes('Samantha')) ||
        voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
        voices.find(v => v.name.includes('Daniel')) ||
        voices.find(v => v.lang.startsWith('en') && v.localService) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];
    };

    loadVoices();
    if (this.synth) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  _initRecognition() {
    const SpeechRecognition = typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
    }
  }

  /**
   * Speak text aloud
   * @param {string} text - Text to speak
   * @param {object} options - { onStart, onEnd, onWord, rate, pitch, volume }
   * @returns {Promise<void>}
   */
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = this.selectedVoice;
      utterance.rate = options.rate || 0.95;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      utterance.onstart = () => {
        this.isSpeaking = true;
        options.onStart?.();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        options.onEnd?.();
        resolve();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        if (event.error !== 'canceled') {
          options.onError?.(event);
          reject(event);
        } else {
          resolve();
        }
      };

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          options.onWord?.(event);
        }
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  /**
   * Listen for user speech and return transcript
   * @param {object} options - { onResult, onError, onStart, onEnd }
   * @returns {Promise<string>}
   */
  listen(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      this.recognition.onstart = () => {
        this.isListening = true;
        options.onStart?.();
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        options.onResult?.({ transcript, confidence });
        resolve(transcript);
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        options.onError?.(event);
        reject(event);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        options.onEnd?.();
      };

      this.recognition.start();
    });
  }

  /**
   * Stop all speech and recognition
   */
  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.isSpeaking = false;
    this.isListening = false;
    this.currentUtterance = null;
  }

  /**
   * Pause speech
   */
  pause() {
    if (this.synth && this.isSpeaking) {
      this.synth.pause();
    }
  }

  /**
   * Resume speech
   */
  resume() {
    if (this.synth) {
      this.synth.resume();
    }
  }

  /**
   * Check browser support
   */
  static isSupported() {
    if (typeof window === 'undefined') return { tts: false, stt: false };
    return {
      tts: 'speechSynthesis' in window,
      stt: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    };
  }
}

// Singleton instance
let speechServiceInstance = null;

export function getSpeechService() {
  if (!speechServiceInstance) {
    speechServiceInstance = new SpeechService();
  }
  return speechServiceInstance;
}

export default SpeechService;
