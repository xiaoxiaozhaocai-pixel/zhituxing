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

/**
 * Chrome SpeechSynthesis 会在约15秒后自动停止（已知bug）。
 * keep-alive 机制：每5秒 pause+resume 重置内部计时器。
 */
function createKeepAlive(synth: SpeechSynthesis): () => void {
  const interval = setInterval(() => {
    if (synth.speaking && !synth.paused) {
      synth.pause();
      synth.resume();
    }
  }, 5000);
  return () => clearInterval(interval);
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
  const keepAliveRef = useRef<(() => void) | null>(null);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      keepAliveRef.current();
      keepAliveRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopKeepAlive();
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current.onpause = null;
      utteranceRef.current.onresume = null;
      utteranceRef.current = null;
    }
  }, [stopKeepAlive]);

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
      utterance.onend = () => {
        setSpeaking(false);
        setPaused(false);
        cleanup();
      };
      utterance.onerror = (e) => {
        // 'interrupted' 在 cancel() 时正常触发，不算错误
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
      // Chrome bug workaround: 防止长时间朗读自动中断
      keepAliveRef.current = createKeepAlive(window.speechSynthesis);
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
    stopKeepAlive();
    window.speechSynthesis.pause();
    setPaused(true);
  }, [supported, speaking, stopKeepAlive]);

  const resume = useCallback(() => {
    if (!supported || !speaking) return;
    window.speechSynthesis.resume();
    if (!paused) return; // 已经 resumed
    keepAliveRef.current = createKeepAlive(window.speechSynthesis);
    setPaused(false);
  }, [supported, speaking, paused]);

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
