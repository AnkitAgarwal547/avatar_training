'use client';

import { useState } from 'react';
import styles from './AudioControls.module.css';

export default function AudioControls({
  isSpeaking,
  isListening,
  onPlay,
  onPause,
  onRepeat,
  onMicToggle,
  volume: volumeProp,
  onVolumeChange,
  disabled = false,
}) {
  const [internalVolume, setInternalVolume] = useState(1);
  const volume = volumeProp !== undefined && volumeProp !== null ? volumeProp : internalVolume;

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    if (volumeProp === undefined || volumeProp === null) setInternalVolume(v);
    onVolumeChange?.(v);
  };

  return (
    <div className={styles.controls}>
      {/* Play / Pause */}
      <button
        className={`${styles.btn} ${styles.primary} ${isSpeaking ? styles.active : ''}`}
        onClick={isSpeaking ? onPause : onPlay}
        disabled={disabled}
        title={isSpeaking ? 'Pause' : 'Play'}
      >
        {isSpeaking ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      {/* Repeat */}
      <button
        className={styles.btn}
        onClick={onRepeat}
        disabled={disabled || isSpeaking}
        title="Repeat"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M17 1l4 4-4 4" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <path d="M7 23l-4-4 4-4" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      </button>

      {/* Mic */}
      <button
        className={`${styles.btn} ${styles.mic} ${isListening ? styles.micActive : ''}`}
        onClick={onMicToggle}
        disabled={disabled || isSpeaking}
        title={isListening ? 'Stop listening' : 'Speak'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="9" y="1" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
          <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {isListening && (
          <span className={styles.micPulse} />
        )}
      </button>

      {/* Volume */}
      <div className={styles.volumeWrap}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={styles.volumeIcon}>
          <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
          {volume > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" strokeWidth="2" />}
          {volume > 0.5 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="currentColor" strokeWidth="2" />}
        </svg>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className={styles.volumeSlider}
        />
      </div>

      {/* Sound wave visualization */}
      {isSpeaking && (
        <div className={styles.waveContainer}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={styles.waveBar}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
