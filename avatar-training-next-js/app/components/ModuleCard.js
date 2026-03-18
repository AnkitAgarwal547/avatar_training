'use client';

import Link from 'next/link';
import styles from './ModuleCard.module.css';

export default function ModuleCard({ module, progress = 0, lessonsCompleted = 0 }) {
  const totalLessons = module.lessons.length;

  return (
    <Link href={`/training?module=${module.id}`} className={styles.card}>
      <div className={styles.iconWrap} style={{ '--card-color': module.color }}>
        <span className={styles.icon}>{module.icon}</span>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{module.title}</h3>
        <p className={styles.description}>{module.description}</p>

        <div className={styles.meta}>
          <span className={styles.badge} data-difficulty={module.difficulty.toLowerCase()}>
            {module.difficulty}
          </span>
          <span className={styles.duration}>⏱️ {module.duration}</span>
          <span className={styles.lessons}>📖 {totalLessons} lessons</span>
        </div>

        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%`, '--card-color': module.color }}
            />
          </div>
          <span className={styles.progressText}>
            {lessonsCompleted}/{totalLessons} completed
          </span>
        </div>
      </div>

      <div className={styles.arrow}>→</div>
    </Link>
  );
}
