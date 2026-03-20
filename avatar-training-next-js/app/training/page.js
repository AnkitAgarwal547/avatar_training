"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  Suspense,
} from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Quiz from "../components/Quiz";
import AudioControls from "../components/AudioControls";
import { getSpeechService } from "../services/SpeechService";
import { getAIService } from "../services/AIService";
import { trainingModules, getModuleById } from "../data/trainingData";
import styles from "./training.module.css";
import { redirect } from "next/navigation";

// Reuse the 3D TalkingAvatar from the roleplay page
const TalkingAvatar = dynamic(() => import("../components/TalkingAvatar"), {
  ssr: false,
});

function TrainingContent() {
  const searchParams = useSearchParams();
  const moduleId = searchParams.get("module") || trainingModules[0].id;
  const module = getModuleById(moduleId) || trainingModules[0];

  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [avatarState, setAvatarState] = useState("idle");
  const [avatarMessage, setAvatarMessage] = useState("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(1);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [lessonStarted, setLessonStarted] = useState(false);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [avatarReady, setAvatarReady] = useState(false);

  const speechRef = useRef(null); // still used for browser STT (mic answers)
  const aiRef = useRef(null);

  // Bridge into TalkingAvatar (same pattern as roleplay page)
  const speakRef = useRef(null);
  const speakTextRef = useRef(null);
  const resumeAudioRef = useRef(null);
  const stopRef = useRef(null);

  const lesson = module.lessons[currentLessonIndex];

  // Initialize services + stop all audio on unmount (e.g. navigate away)
  useEffect(() => {
    speechRef.current = getSpeechService();
    aiRef.current = getAIService();

    return () => {
      speechRef.current?.stop();
      stopRef.current?.();
    };
  }, []);

  // Reset state when module changes
  useEffect(() => {
    setCurrentLessonIndex(0);
    setShowQuiz(false);
    setQuizAnswered(false);
    setLessonStarted(false);
    setAvatarState("idle");
    setAvatarMessage(
      `Welcome to ${module.title}! Press play to begin the first lesson.`,
    );
    speechRef.current?.stop();
  }, [moduleId, module.title]);

  // Autoplay: start current lesson when avatar is ready and lesson hasn't started
  const handlePlayRef = useRef(null);
  useEffect(() => {
    if (!avatarReady || !lesson || lessonStarted) return;
    const timer = setTimeout(() => {
      handlePlayRef.current?.();
    }, 800);
    return () => clearTimeout(timer);
  }, [avatarReady, lesson?.id, lessonStarted]);

  /**
   * Speak text using TalkingHead's built-in lip-sync + browser SpeechSynthesis.
   * This is instant — no server round-trip needed.
   */
  const speakText = useCallback(
    async (text) => {
      if (!text) return;

      speechRef.current?.stop();
      resumeAudioRef.current?.();

      setIsSpeaking(true);
      setAvatarState("talking");
      setAvatarMessage(text.length > 100 ? "Speaking…" : text);

      // Use TalkingHead's speakText (browser TTS + automatic lip-sync)
      if (speakTextRef.current) {
        try {
          await speakTextRef.current(text);
          setIsSpeaking(false);
          setAvatarState("idle");
          return;
        } catch (err) {
          console.error("[Training] TalkingHead speakText failed:", err);
        }
      }

      // Fallback: browser SpeechSynthesis without avatar lip-sync
      if (speechRef.current) {
        try {
          await speechRef.current.speak(text, {
            volume,
            onStart: () => {
              setIsSpeaking(true);
              setAvatarState("talking");
            },
            onEnd: () => {
              setIsSpeaking(false);
              setAvatarState("idle");
            },
          });
        } catch (err) {
          console.error("Speech error:", err);
        }
      }

      setIsSpeaking(false);
      setAvatarState("idle");
    },
    [volume],
  );

  const handlePlay = useCallback(async () => {
    if (!lesson) return;

    setLessonStarted(true);

    // Speak the lesson content
    await speakText(lesson.avatarScript);

    // After speaking, show quiz
    setAvatarState("happy");
    setAvatarMessage(
      "Great! Now let's test what you've learned with a quick quiz.",
    );

    setTimeout(() => {
      setShowQuiz(true);
      if (lesson.quiz) {
        speakText(lesson.quiz.question);
      }
    }, 1500);
  }, [lesson, speakText]);

  // Keep ref updated for autoplay effect
  useEffect(() => {
    handlePlayRef.current = handlePlay;
  }, [handlePlay]);

  const handlePause = useCallback(() => {
    speechRef.current?.stop();
    setIsSpeaking(false);
    setAvatarState("idle");
  }, []);

  const handleRepeat = useCallback(() => {
    if (!lesson) return;
    setShowQuiz(false);
    setQuizAnswered(false);
    handlePlay();
  }, [lesson, handlePlay]);

  const handleMicToggle = useCallback(async () => {
    if (!speechRef.current) return;

    if (isListening) {
      speechRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      setIsListening(true);
      setAvatarState("thinking");
      setAvatarMessage("I'm listening... Speak your answer now!");

      const transcript = await speechRef.current.listen({
        onStart: () => setIsListening(true),
        onEnd: () => setIsListening(false),
      });

      setIsListening(false);

      // Process voice input
      handleVoiceInput(transcript);
    } catch (err) {
      console.error("Listen error:", err);
      setIsListening(false);
      setAvatarState("idle");
      setAvatarMessage(
        "I couldn't hear you clearly. Please try again or type your response.",
      );
    }
  }, [isListening]);

  const handleVoiceInput = useCallback(
    async (transcript) => {
      setChatMessages((prev) => [...prev, { role: "user", text: transcript }]);

      // Try to match quiz answer
      if (showQuiz && !quizAnswered && lesson?.quiz) {
        const lower = transcript.toLowerCase();
        const labels = ["a", "b", "c", "d"];
        const matchedIndex = labels.findIndex((l) => lower.includes(l));

        if (matchedIndex >= 0 && matchedIndex < lesson.quiz.options.length) {
          // Will be handled by Quiz component
          setAvatarMessage(
            `I heard you say "${transcript}". Let me check that answer...`,
          );
          return;
        }
      }

      // Ask AI
      setAvatarState("thinking");
      setAvatarMessage("Let me think about that...");
      const response = await aiRef.current?.askQuestion(
        transcript,
        lesson?.content,
      );
      setChatMessages((prev) => [...prev, { role: "avatar", text: response }]);
      await speakText(response);
    },
    [showQuiz, quizAnswered, lesson, speakText],
  );

  const handleQuizAnswer = useCallback(
    async ({ isCorrect, explanation }) => {
      setQuizAnswered(true);

      if (isCorrect) {
        setAvatarState("happy");
        const msg = `Excellent! That's correct! ${explanation}`;
        await speakText(msg);
        setCompletedLessons((prev) => new Set([...prev, lesson.id]));
      } else {
        setAvatarState("thinking");
        const msg = `Not quite, but that's okay! ${explanation}`;
        await speakText(msg);
      }
    },
    [lesson, speakText],
  );

  const handleNextLesson = useCallback(() => {
    if (currentLessonIndex < module.lessons.length - 1) {
      setCurrentLessonIndex((prev) => prev + 1);
      setShowQuiz(false);
      setQuizAnswered(false);
      setLessonStarted(false);
      setAvatarState("idle");
      setAvatarMessage(
        `Ready for the next lesson: "${module.lessons[currentLessonIndex + 1].title}". Press play when you're ready!`,
      );
      speechRef.current?.stop();
    } else {
      setAvatarState("happy");
      speakText(
        `Congratulations! You've completed all lessons in ${module.title}! You're doing amazing!`,
      );
    }
  }, [currentLessonIndex, module, speakText]);

  const handleChat = useCallback(
    async (e) => {
      e.preventDefault();
      if (!chatInput.trim()) return;

      const userMsg = chatInput.trim();
      setChatInput("");
      setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);

      setAvatarState("thinking");
      setAvatarMessage("Let me think about that...");

      const response = await aiRef.current?.askQuestion(
        userMsg,
        lesson?.content,
      );
      setChatMessages((prev) => [...prev, { role: "avatar", text: response }]);
      await speakText(response);
    },
    [chatInput, lesson, speakText],
  );

  const progressPercent =
    module.lessons.length > 0
      ? Math.round((completedLessons.size / module.lessons.length) * 100)
      : 0;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Left Panel — Avatar */}
        <div className={styles.avatarPanel}>
          <div className={styles.moduleSelector}>
            <label className={styles.selectorLabel}>Module:</label>
            <select
              className={styles.select}
              value={moduleId}
              onChange={(e) => {
                redirect(`/training?module=${e.target.value}`);
              }}
            >
              {trainingModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.icon} {m.title}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.avatarContainer}>
            <TalkingAvatar
              onReady={() => setAvatarReady(true)}
              onSpeakRef={speakRef}
              onSpeakTextRef={speakTextRef}
              onResumeAudioRef={resumeAudioRef}
              onStopRef={stopRef}
              containerStyle={{ width: "100%", minHeight: 320 }}
            />
            <div className={styles.avatarBubble}>
              {avatarMessage && <p>{avatarMessage}</p>}
            </div>
          </div>

          <AudioControls
            isSpeaking={isSpeaking}
            isListening={isListening}
            onPlay={handlePlay}
            onPause={handlePause}
            onRepeat={handleRepeat}
            onMicToggle={handleMicToggle}
            volume={volume}
            onVolumeChange={setVolume}
          />

          {/* Lesson progress */}
          <div className={styles.lessonNav}>
            {module.lessons.map((l, i) => (
              <button
                key={l.id}
                className={`${styles.lessonDot} ${i === currentLessonIndex ? styles.dotActive : ""} ${completedLessons.has(l.id) ? styles.dotCompleted : ""}`}
                onClick={() => {
                  setCurrentLessonIndex(i);
                  setShowQuiz(false);
                  setQuizAnswered(false);
                  setLessonStarted(false);
                  setAvatarState("idle");
                  setAvatarMessage(
                    `Lesson: "${l.title}". Press play to begin!`,
                  );
                  speechRef.current?.stop();
                }}
                title={l.title}
              >
                {completedLessons.has(l.id) ? "✓" : i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel — Content */}
        <div className={styles.contentPanel}>
          {/* Lesson header */}
          <div className={styles.lessonHeader}>
            <div className={styles.topBar}>
              <span
                className={styles.moduleTag}
                style={{ color: module.color }}
              >
                {module.icon} {module.title}
              </span>
              <span className={styles.progress}>
                {progressPercent}% complete
              </span>
            </div>
            <h2 className={styles.lessonTitle}>{lesson?.title}</h2>
          </div>

          {/* Lesson content */}
          <div className={styles.lessonContent}>
            <p className={styles.contentText}>{lesson?.content}</p>

            {/* Key Points */}
            <div className={styles.keyPoints}>
              <h3 className={styles.keyPointsTitle}>📌 Key Points</h3>
              <ul className={styles.keyPointsList}>
                {lesson?.keyPoints?.map((point, i) => (
                  <li key={i} className={styles.keyPoint}>
                    <span className={styles.keyPointBullet}>•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quiz */}
          {showQuiz && lesson?.quiz && (
            <Quiz
              quiz={lesson.quiz}
              onAnswer={handleQuizAnswer}
              disabled={!lessonStarted}
            />
          )}

          {/* Next lesson button */}
          {quizAnswered && (
            <button className={styles.nextBtn} onClick={handleNextLesson}>
              {currentLessonIndex < module.lessons.length - 1
                ? "Next Lesson →"
                : "🎉 Module Complete!"}
            </button>
          )}

          {/* Chat with Avatar */}
          <div className={styles.chatSection}>
            <h3 className={styles.chatTitle}>💬 Ask the Avatar</h3>

            <div className={styles.chatMessages}>
              {chatMessages.length === 0 && (
                <p className={styles.chatPlaceholder}>
                  Type a question or use the mic to ask the avatar anything
                  about this topic...
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`${styles.chatMsg} ${styles[msg.role]}`}
                >
                  <span className={styles.chatRole}>
                    {msg.role === "user" ? "🧑" : "🤖"}
                  </span>
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>

            <form className={styles.chatForm} onSubmit={handleChat}>
              <input
                type="text"
                className={styles.chatInput}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your question..."
                disabled={isSpeaking}
              />
              <button
                type="submit"
                className={styles.chatSend}
                disabled={!chatInput.trim() || isSpeaking}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrainingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "2rem", color: "#94a3b8" }}>
          Loading training...
        </div>
      }
    >
      <TrainingContent />
    </Suspense>
  );
}
