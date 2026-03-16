'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './Avatar.module.css';

export default function Avatar({ state = 'idle', message = '', showBubble = true }) {
  const [displayedText, setDisplayedText] = useState('');
  const [textComplete, setTextComplete] = useState(false);
  const textRef = useRef(null);

  // Typewriter effect
  useEffect(() => {
    if (!message) {
      setDisplayedText('');
      setTextComplete(true);
      return;
    }

    setDisplayedText('');
    setTextComplete(false);
    let i = 0;
    const speed = state === 'talking' ? 25 : 15;

    const interval = setInterval(() => {
      if (i < message.length) {
        setDisplayedText(message.slice(0, i + 1));
        i++;
      } else {
        setTextComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [message, state]);

  // Auto-scroll speech bubble
  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [displayedText]);

  return (
    <div className={styles.avatarContainer}>
      {/* Glow background */}
      <div className={`${styles.glow} ${state === 'talking' ? styles.glowActive : ''}`} />

      {/* Avatar SVG */}
      <div className={`${styles.avatarWrapper} ${styles[state]}`}>
        <svg
          viewBox="0 0 200 200"
          className={styles.avatarSvg}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Head */}
          <defs>
            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <filter id="shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Body/Shoulders */}
          <ellipse cx="100" cy="195" rx="65" ry="30" fill="url(#skinGrad)" opacity="0.8" />

          {/* Neck */}
          <rect x="88" y="148" width="24" height="25" rx="8" fill="url(#faceGrad)" />

          {/* Head shape */}
          <ellipse cx="100" cy="95" rx="55" ry="60" fill="url(#faceGrad)" filter="url(#shadow)" />

          {/* Hair */}
          <path
            d="M 45 85 Q 45 35, 100 30 Q 155 35, 155 85 Q 150 55, 100 50 Q 50 55, 45 85"
            fill="#312e81"
          />

          {/* Eyes */}
          <g className={styles.eyes}>
            {state === 'happy' ? (
              <>
                <path d="M 72 90 Q 78 82, 84 90" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M 116 90 Q 122 82, 128 90" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx="78" cy="90" rx="8" ry="9" fill="white" />
                <ellipse cx="78" cy="90" rx="4" ry="5" fill="#1e1b4b">
                  <animate
                    attributeName="cx"
                    values="78;80;78;76;78"
                    dur="4s"
                    repeatCount="indefinite"
                  />
                </ellipse>
                <circle cx="80" cy="87" r="2" fill="white" opacity="0.8" />

                <ellipse cx="122" cy="90" rx="8" ry="9" fill="white" />
                <ellipse cx="122" cy="90" rx="4" ry="5" fill="#1e1b4b">
                  <animate
                    attributeName="cx"
                    values="122;124;122;120;122"
                    dur="4s"
                    repeatCount="indefinite"
                  />
                </ellipse>
                <circle cx="124" cy="87" r="2" fill="white" opacity="0.8" />
              </>
            )}
          </g>

          {/* Eyebrows */}
          <g className={styles.eyebrows}>
            {state === 'thinking' ? (
              <>
                <line x1="68" y1="74" x2="88" y2="72" stroke="#312e81" strokeWidth="3" strokeLinecap="round" />
                <line x1="112" y1="72" x2="132" y2="74" stroke="#312e81" strokeWidth="3" strokeLinecap="round" />
              </>
            ) : (
              <>
                <line x1="68" y1="76" x2="88" y2="74" stroke="#312e81" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="112" y1="74" x2="132" y2="76" stroke="#312e81" strokeWidth="2.5" strokeLinecap="round" />
              </>
            )}
          </g>

          {/* Nose */}
          <path d="M 97 98 Q 100 105, 103 98" stroke="#4f46e5" strokeWidth="1.5" fill="none" />

          {/* Mouth */}
          <g className={styles.mouth}>
            {state === 'talking' ? (
              <ellipse cx="100" cy="118" rx="12" ry="6" fill="#4338ca" className={styles.talkingMouth}>
                <animate
                  attributeName="ry"
                  values="3;8;5;10;6;3"
                  dur="0.4s"
                  repeatCount="indefinite"
                />
              </ellipse>
            ) : state === 'happy' ? (
              <path d="M 82 114 Q 100 130, 118 114" stroke="#4338ca" strokeWidth="3" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M 85 116 Q 100 124, 115 116" stroke="#4338ca" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            )}
          </g>

          {/* Blush */}
          {state === 'happy' && (
            <>
              <circle cx="65" cy="105" r="8" fill="#e879f9" opacity="0.2" />
              <circle cx="135" cy="105" r="8" fill="#e879f9" opacity="0.2" />
            </>
          )}

          {/* Headset */}
          <path
            d="M 48 88 Q 45 65, 100 55 Q 155 65, 152 88"
            stroke="#06b6d4"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="48" cy="92" r="8" fill="#06b6d4" />
          <circle cx="152" cy="92" r="8" fill="#06b6d4" />
          {/* Mic arm */}
          <path d="M 48 100 Q 50 130, 75 128" stroke="#06b6d4" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="75" cy="128" r="5" fill="#06b6d4" />

          {/* Sound waves when talking */}
          {state === 'talking' && (
            <g className={styles.soundWaves}>
              <path d="M 160 85 Q 170 90, 160 95" stroke="#06b6d4" strokeWidth="2" fill="none" opacity="0.6">
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.8s" repeatCount="indefinite" />
              </path>
              <path d="M 165 80 Q 180 90, 165 100" stroke="#06b6d4" strokeWidth="2" fill="none" opacity="0.4">
                <animate attributeName="opacity" values="0.4;0.1;0.4" dur="0.8s" repeatCount="indefinite" begin="0.2s" />
              </path>
              <path d="M 170 75 Q 190 90, 170 105" stroke="#06b6d4" strokeWidth="1.5" fill="none" opacity="0.2">
                <animate attributeName="opacity" values="0.2;0.05;0.2" dur="0.8s" repeatCount="indefinite" begin="0.4s" />
              </path>
            </g>
          )}
        </svg>

        {/* State indicator */}
        <div className={`${styles.stateIndicator} ${styles[`indicator_${state}`]}`}>
          {state === 'idle' && '😊'}
          {state === 'talking' && '🗣️'}
          {state === 'happy' && '🎉'}
          {state === 'thinking' && '🤔'}
        </div>
      </div>

      {/* Speech bubble */}
      {showBubble && message && (
        <div className={`${styles.speechBubble} ${state === 'talking' ? styles.bubbleActive : ''}`}>
          <div className={styles.bubbleArrow} />
          <div className={styles.bubbleContent} ref={textRef}>
            {displayedText}
            {!textComplete && <span className={styles.cursor}>|</span>}
          </div>
        </div>
      )}
    </div>
  );
}
