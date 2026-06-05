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
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      utterance.onend = () => { setSpeaking(false); setPaused(false); cleanup(); };
      utterance.onerror = (e) => {
        // 'interrupted' is expected on cancel(), not a real error
        if (e.error !== 'interrupted') {
          console.warn('[TTS] Speech error:', e.error);
        }
        setSpeaking(false);
        setPaused(false);
        cleanup();
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
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
      cleanup();
    };
  }, [cleanup]);

  return { speak, stop, pause, resume, toggle, speaking, paused, supported };
}
