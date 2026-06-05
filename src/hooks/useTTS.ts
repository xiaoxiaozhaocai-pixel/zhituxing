'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
export interface UseTTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}
export interface UseTTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  toggle: (text: string) => void;
  speaking: boolean;
  paused: boolean;
  supported: boolean;
}
export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { lang = 'zh-CN', rate = 1, pitch = 1, volume = 1 } = options;
  const [supported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  });
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentTextRef = useRef<string>('');
  const cleanup = useCallback(() => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current.onpause = null;
      utteranceRef.current.onresume = null;
      utteranceRef.current = null;
    }
  }, []);
  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      cleanup();
      currentTextRef.current = text;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // Chrome keep-alive: periodically pause/resume for long texts to prevent interruption
      let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
      if (text.length > 200) {
        keepAliveTimer = setInterval(() => {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }, 5000);
      }

      utterance.onend = () => {
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        setSpeaking(false); setPaused(false); cleanup();
      };
      utterance.onerror = (event) => {
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        const err = event as SpeechSynthesisErrorEvent;
        // Ignore 'interrupted' (Chrome fires this on cancel)
        if (err.error !== 'interrupted') {
          setSpeaking(false); setPaused(false); cleanup();
        }
      };
      utterance.onpause = () => { setPaused(true); };
      utterance.onresume = () => { setPaused(false); };
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
      setPaused(false);
    },
    [supported, lang, rate, pitch, volume, cleanup],
  );
  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    cleanup();
    setSpeaking(false);
    setPaused(false);
  }, [supported, cleanup]);
  const pause = useCallback(() => {
    if (!supported || !speaking) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, [supported, speaking]);
  const resume = useCallback(() => {
    if (!supported || !speaking) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, [supported, speaking]);
  const toggle = useCallback(
    (text: string) => {
      if (!supported) return;
      if (!speaking) speak(text);
      else if (paused) resume();
      else pause();
    },
    [supported, speaking, paused, speak, resume, pause],
  );
  useEffect(() => {
    return () => {
      if (utteranceRef.current && typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
        cleanup();
      }
    };
  }, [cleanup]);
  return { speak, stop, pause, resume, toggle, speaking, paused, supported };
}
