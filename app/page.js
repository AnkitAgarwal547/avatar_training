'use client';

import Link from 'next/link';
import Avatar from './components/Avatar';
import FeatureCard from './components/FeatureCard';
import styles from './page.module.css';

export default function HomePage() {
  const features = [
    {
      icon: '🗣️',
      title: 'AI Voice Avatar',
      description: 'An intelligent avatar that speaks your training content aloud with natural voice synthesis and animated expressions.',
      color: '#6366f1',
    },
    {
      icon: '🎙️',
      title: 'Voice Interaction',
      description: 'Answer questions by speaking! Our speech recognition understands your voice responses in real-time.',
      color: '#06b6d4',
    },
    {
      icon: '📝',
      title: 'Smart Quizzes',
      description: 'Interactive quizzes with instant feedback. The avatar explains correct answers and encourages you along the way.',
      color: '#10b981',
    },
    {
      icon: '📊',
      title: 'Progress Tracking',
      description: 'Track your learning journey with detailed progress reports, completion stats, and performance analytics.',
      color: '#f59e0b',
    },
  ];

  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <span className={styles.badge}>🚀 AI-Powered Training Platform</span>
            <h1 className={styles.title}>
              Meet Your Personal
              <span className={styles.gradientText}> AI Training Avatar</span>
            </h1>
            <p className={styles.subtitle}>
              Experience the future of corporate training. Our AI avatar speaks lessons aloud,
              answers your questions, and guides you through interactive quizzes — making
              learning engaging, personal, and effective.
            </p>
            <div className={styles.ctas}>
              <Link href="/training" className={styles.ctaPrimary}>
                Start Training
                <span className={styles.ctaArrow}>→</span>
              </Link>
              <Link href="/modules" className={styles.ctaSecondary}>
                Browse Modules
              </Link>
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>3</span>
                <span className={styles.statLabel}>Modules</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statValue}>7</span>
                <span className={styles.statLabel}>Lessons</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statValue}>🎙️</span>
                <span className={styles.statLabel}>Voice AI</span>
              </div>
            </div>
          </div>

          <div className={styles.heroAvatar}>
            <Avatar state="idle" message="Hi there! I'm your AI training avatar. Click 'Start Training' to begin your learning journey!" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.featuresInner}>
          <h2 className={styles.sectionTitle}>
            Why <span className={styles.gradientText}>AvatarTrainer</span>?
          </h2>
          <p className={styles.sectionSubtitle}>
            A next-generation training platform that makes learning feel personal and interactive.
          </p>

          <div className={styles.featuresGrid}>
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} delay={i * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howItWorks}>
        <div className={styles.featuresInner}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3>Choose a Module</h3>
              <p>Browse our training modules and select a topic to start learning.</p>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3>Learn with Avatar</h3>
              <p>Your AI avatar speaks lessons aloud and walks you through key concepts.</p>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3>Take Quizzes</h3>
              <p>Test your knowledge with interactive quizzes. Answer by clicking or speaking!</p>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <h3>Track Progress</h3>
              <p>Monitor your learning journey with detailed progress and performance stats.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
