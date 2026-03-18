'use client';

import { useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

// TalkingHead must be loaded client-side only (it renders a Three.js scene)
// We use a null loader here and manage the instance via useRef
// so the actual import happens inside useEffect

/** Expression/mood for the 3D avatar (maps to TalkingHead setMood). */
export type AvatarExpression = 'neutral' | 'happy' | 'angry';

interface TalkingAvatarProps {
  containerStyle?: React.CSSProperties;
  onReady?: () => void;
  /** Call the returned function to trigger lip-synced speech */
  onSpeakRef?: React.MutableRefObject<
    ((audio: Float32Array, phonemes: unknown[]) => Promise<void>) | null
  >;
  /** Initial expression/mood. Default: 'happy' */
  expression?: AvatarExpression;
  /** Ref to set expression from parent: setExpression('angry'), etc. */
  onExpressionRef?: React.MutableRefObject<
    ((expression: AvatarExpression) => void) | null
  >;
  avatarUrl?: string;
}

export default function TalkingAvatar({
  containerStyle,
  onReady,
  onSpeakRef,
  expression: initialExpression = 'happy',
  onExpressionRef,
  avatarUrl = '/avatar.glb',
}: TalkingAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headRef = useRef<any>(null);

  const setExpression = useCallback((expression: AvatarExpression) => {
    const head = headRef.current;
    if (!head || typeof head.setMood !== 'function') return;
    try {
      head.setMood(expression);
    } catch (err) {
      console.warn('[TalkingAvatar] setMood failed:', err);
    }
  }, []);

  const speak = useCallback(
    async (audio: Float32Array, phonemes: unknown[]) => {
      if (!headRef.current) return;
      try {
        await headRef.current.speakAudio(audio, { phonemes });
      } catch (err) {
        console.error('[TalkingAvatar] speakAudio error:', err);
      }
    },
    []
  );

  useEffect(() => {
    // Expose the speak function via ref so parent can call it
    if (onSpeakRef) {
      onSpeakRef.current = speak;
    }
  }, [speak, onSpeakRef]);

  useEffect(() => {
    if (onExpressionRef) {
      onExpressionRef.current = setExpression;
    }
    return () => {
      if (onExpressionRef) onExpressionRef.current = null;
    };
  }, [setExpression, onExpressionRef]);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    async function loadHead() {
      try {
        // Dynamic import inside effect — safe for SSR
        const { TalkingHead } = await import('@met4citizen/talking-head');
        if (cancelled || !containerRef.current) return;

        const head = new TalkingHead(containerRef.current, {
          cameraView: 'upper',
          avatarMood: initialExpression,
        });

        await head.showAvatar({ url: avatarUrl, avatarMood: initialExpression });
        if (cancelled) return;

        headRef.current = head;
        onReady?.();
      } catch (err) {
        console.error('[TalkingAvatar] Failed to load TalkingHead:', err);
      }
    }

    loadHead();

    return () => {
      cancelled = true;
      headRef.current = null;
    };
  }, [avatarUrl, initialExpression, onReady]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        ...containerStyle,
      }}
    />
  );
}
