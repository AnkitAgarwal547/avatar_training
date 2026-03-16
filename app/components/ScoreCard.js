'use client';

import { useEffect, useRef } from 'react';
import styles from './ScoreCard.module.css';

function RingGauge({ label, value, color }) {
  const circumference = 2 * Math.PI * 40;
  const filled = (value / 10) * circumference;
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;
    svgRef.current.style.strokeDashoffset = String(circumference);
    const timer = setTimeout(() => {
      if (svgRef.current) {
        svgRef.current.style.strokeDashoffset = String(circumference - filled);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [value, circumference, filled]);

  return (
    <div className={styles.gauge}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          ref={svgRef}
          cx="50" cy="50" r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <text x="50" y="50" textAnchor="middle" dy="0.35em" fill="white" fontSize="20" fontWeight="700">
          {value}
        </text>
        <text x="50" y="68" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">/10</text>
      </svg>
      <span className={styles.gaugeLabel}>{label}</span>
    </div>
  );
}

export default function ScoreCard({ score, onRetry }) {
  const overall = Math.round((score.empathy + score.resolution + score.tone) / 3);

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.trophy}>🏆</span>
          <h2 className={styles.title}>Roleplay Complete!</h2>
          <p className={styles.subtitle}>Here&apos;s how you handled the situation</p>
        </div>
        <div className={styles.gauges}>
          <RingGauge label="Empathy"    value={score.empathy}    color="#6366f1" />
          <RingGauge label="Resolution" value={score.resolution} color="#10b981" />
          <RingGauge label="Tone"       value={score.tone}       color="#f59e0b" />
        </div>
        <div className={styles.overall}>
          <span className={styles.overallValue}>{overall}</span>
          <span className={styles.overallLabel}>Overall Score</span>
        </div>
        <blockquote className={styles.feedback}>&ldquo;{score.feedback}&rdquo;</blockquote>
        {onRetry && (
          <button className={styles.retryBtn} onClick={onRetry}>
            🔄 Try Again
          </button>
        )}
      </div>
    </div>
  );
}
