'use client';

import styles from './FeatureCard.module.css';

export default function FeatureCard({ icon, title, description, color = '#6366f1', delay = 0 }) {
  return (
    <div
      className={styles.card}
      style={{ '--feature-color': color, animationDelay: `${delay}ms` }}
    >
      <div className={styles.iconWrap}>
        <span className={styles.icon}>{icon}</span>
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      <div className={styles.glowLine} />
    </div>
  );
}
