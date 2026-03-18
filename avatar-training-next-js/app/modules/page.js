'use client';

import ModuleCard from '../components/ModuleCard';
import { trainingModules } from '../data/trainingData';
import styles from './modules.module.css';

export default function ModulesPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Training Modules</h1>
          <p className={styles.subtitle}>
            Choose a module to start your interactive training session with the AI avatar.
          </p>
        </div>

        <div className={styles.grid}>
          {trainingModules.map((module, i) => (
            <ModuleCard
              key={module.id}
              module={module}
              progress={0}
              lessonsCompleted={0}
            />
          ))}
        </div>

        <div className={styles.info}>
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>💡</span>
            <div>
              <h3>How Training Works</h3>
              <p>Each module contains interactive lessons. Your AI avatar will speak the content aloud, guide you through key concepts, and test your knowledge with quizzes. You can also ask questions using voice or text!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
