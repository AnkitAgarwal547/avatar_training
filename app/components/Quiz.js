'use client';

import styles from './Quiz.module.css';
import { useState } from 'react';

export default function Quiz({ quiz, onAnswer, disabled = false }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [answered, setAnswered] = useState(false);

  if (!quiz) return null;

  const handleSelect = (index) => {
    if (answered || disabled) return;
    setSelectedIndex(index);
    setAnswered(true);

    const isCorrect = index === quiz.correctIndex;
    onAnswer?.({ isCorrect, selectedIndex: index, explanation: quiz.explanation });
  };

  const getOptionClass = (index) => {
    const classes = [styles.option];

    if (answered) {
      if (index === quiz.correctIndex) {
        classes.push(styles.correct);
      } else if (index === selectedIndex) {
        classes.push(styles.incorrect);
      } else {
        classes.push(styles.dimmed);
      }
    } else if (!disabled) {
      classes.push(styles.hoverable);
    }

    return classes.join(' ');
  };

  const getOptionLabel = (index) => {
    return String.fromCharCode(65 + index); // A, B, C, D
  };

  return (
    <div className={styles.quizContainer}>
      <div className={styles.header}>
        <span className={styles.quizIcon}>❓</span>
        <h4 className={styles.title}>Quiz Question</h4>
      </div>

      <p className={styles.question}>{quiz.question}</p>

      <div className={styles.options}>
        {quiz.options.map((option, index) => (
          <button
            key={index}
            className={getOptionClass(index)}
            onClick={() => handleSelect(index)}
            disabled={answered || disabled}
          >
            <span className={styles.optionLabel}>{getOptionLabel(index)}</span>
            <span className={styles.optionText}>{option}</span>
            {answered && index === quiz.correctIndex && (
              <span className={styles.checkMark}>✓</span>
            )}
            {answered && index === selectedIndex && index !== quiz.correctIndex && (
              <span className={styles.crossMark}>✗</span>
            )}
          </button>
        ))}
      </div>

      {answered && (
        <div className={`${styles.explanation} ${selectedIndex === quiz.correctIndex ? styles.explanationCorrect : styles.explanationIncorrect}`}>
          <span className={styles.explanationIcon}>
            {selectedIndex === quiz.correctIndex ? '🎉' : '💡'}
          </span>
          <p>{quiz.explanation}</p>
        </div>
      )}
    </div>
  );
}
