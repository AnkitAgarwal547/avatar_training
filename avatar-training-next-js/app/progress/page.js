'use client';

import ProgressRing from '../components/ProgressRing';
import { trainingModules } from '../data/trainingData';
import styles from './progress.module.css';

export default function ProgressPage() {
  // Demo data — in a real app this would come from a backend/local storage
  const demoProgress = {
    overall: 35,
    modulesCompleted: 1,
    quizzesPassed: 3,
    totalQuizzes: 7,
    timeSpent: '45 min',
    streak: 3,
    modules: [
      { id: 'workplace-safety', progress: 66, lessonsCompleted: 2 },
      { id: 'customer-service', progress: 50, lessonsCompleted: 1 },
      { id: 'data-privacy', progress: 0, lessonsCompleted: 0 },
    ],
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Your Progress</h1>
          <p className={styles.subtitle}>Track your learning journey and see how far you&apos;ve come.</p>
        </div>

        {/* Top stats */}
        <div className={styles.statsGrid}>
          <div className={styles.ringCard}>
            <ProgressRing progress={demoProgress.overall} size={140} label="Overall" />
          </div>

          <div className={styles.statCard}>
            <span className={styles.statIcon}>🏆</span>
            <span className={styles.statValue}>{demoProgress.quizzesPassed}/{demoProgress.totalQuizzes}</span>
            <span className={styles.statLabel}>Quizzes Passed</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statIcon}>⏱️</span>
            <span className={styles.statValue}>{demoProgress.timeSpent}</span>
            <span className={styles.statLabel}>Time Spent</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statIcon}>🔥</span>
            <span className={styles.statValue}>{demoProgress.streak}</span>
            <span className={styles.statLabel}>Day Streak</span>
          </div>
        </div>

        {/* Module progress */}
        <div className={styles.modulesSection}>
          <h2 className={styles.sectionTitle}>Module Progress</h2>

          <div className={styles.modulesList}>
            {trainingModules.map((module) => {
              const prog = demoProgress.modules.find(m => m.id === module.id);
              const progress = prog?.progress || 0;
              const completed = prog?.lessonsCompleted || 0;

              return (
                <div key={module.id} className={styles.moduleRow}>
                  <div className={styles.moduleInfo}>
                    <span className={styles.moduleIcon} style={{ color: module.color }}>{module.icon}</span>
                    <div>
                      <h3 className={styles.moduleName}>{module.title}</h3>
                      <span className={styles.moduleMeta}>
                        {completed}/{module.lessons.length} lessons • {module.difficulty}
                      </span>
                    </div>
                  </div>

                  <div className={styles.moduleProgress}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${progress}%`, background: module.color }}
                      />
                    </div>
                    <span className={styles.progressPercent}>{progress}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Achievements */}
        <div className={styles.achievements}>
          <h2 className={styles.sectionTitle}>Achievements</h2>
          <div className={styles.achievementsGrid}>
            <div className={`${styles.achievement} ${styles.unlocked}`}>
              <span className={styles.achievementIcon}>🌟</span>
              <span className={styles.achievementName}>First Lesson</span>
              <span className={styles.achievementDesc}>Complete your first lesson</span>
            </div>
            <div className={`${styles.achievement} ${styles.unlocked}`}>
              <span className={styles.achievementIcon}>🎯</span>
              <span className={styles.achievementName}>Quiz Master</span>
              <span className={styles.achievementDesc}>Pass 3 quizzes</span>
            </div>
            <div className={`${styles.achievement} ${styles.unlocked}`}>
              <span className={styles.achievementIcon}>🔥</span>
              <span className={styles.achievementName}>On Fire</span>
              <span className={styles.achievementDesc}>3-day learning streak</span>
            </div>
            <div className={styles.achievement}>
              <span className={styles.achievementIcon}>🏅</span>
              <span className={styles.achievementName}>Module Champion</span>
              <span className={styles.achievementDesc}>Complete all lessons in a module</span>
            </div>
            <div className={styles.achievement}>
              <span className={styles.achievementIcon}>🎓</span>
              <span className={styles.achievementName}>Graduate</span>
              <span className={styles.achievementDesc}>Complete all modules</span>
            </div>
            <div className={styles.achievement}>
              <span className={styles.achievementIcon}>💬</span>
              <span className={styles.achievementName}>Curious Mind</span>
              <span className={styles.achievementDesc}>Ask 10 questions to the avatar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
