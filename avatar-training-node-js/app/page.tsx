import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  const features = [
    {
      icon: '🎙️',
      title: 'Voice Interaction',
      desc: 'Speak naturally — Whisper transcribes your audio in real-time on the server.',
      color: '#6366f1',
    },
    {
      icon: '🤖',
      title: 'GPT-4o Trainer',
      desc: 'Priya, your AI trainer, teaches the L-A-S-T complaint handling method.',
      color: '#10b981',
    },
    {
      icon: '💬',
      title: 'Roleplay Scenarios',
      desc: 'Practice with Meena, an upset customer — handle frustration and resolve issues.',
      color: '#f59e0b',
    },
    {
      icon: '🏆',
      title: 'Instant Scoring',
      desc: 'After 4 exchanges get scored on Empathy, Resolution, and Tone.',
      color: '#ec4899',
    },
  ];

  return (
    <main className={styles.main}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <span className={styles.badge}>🚀 AI-Powered Training</span>
          <h1 className={styles.title}>
            Learn to Handle
            <span className={styles.gradient}> Customer Complaints</span>
          </h1>
          <p className={styles.subtitle}>
            Practice the L-A-S-T method with a voice-driven AI roleplay. Speak to a 3D avatar,
            get real-time responses, and receive an instant performance score.
          </p>
          <div className={styles.ctas}>
            <Link href="/roleplay" className={styles.ctaPrimary}>
              Start Roleplay →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>How it works</h2>
        <div className={styles.grid}>
          {features.map((f) => (
            <div key={f.title} className={styles.card} style={{ '--accent': f.color } as React.CSSProperties}>
              <span className={styles.cardIcon}>{f.icon}</span>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline diagram */}
      <section className={styles.pipeline}>
        <h2 className={styles.sectionTitle}>The Tech Pipeline</h2>
        <div className={styles.pipelineRow}>
          {['🎤 Your Voice', '→', 'Whisper STT', '→', 'GPT-4o', '→', 'Kokoro TTS', '→', '🗣️ 3D Avatar'].map((s, i) => (
            <span
              key={i}
              className={s === '→' ? styles.pipelineArrow : styles.pipelineStep}
            >
              {s}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
