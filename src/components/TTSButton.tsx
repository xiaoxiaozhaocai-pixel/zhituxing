'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTTS } from '@/hooks/useTTS';

interface TTSButtonProps {
  text: string;
  className?: string;
}

export default function TTSButton({ text, className = '' }: TTSButtonProps) {
  const { toggle, speaking, paused, supported } = useTTS({
    lang: 'zh-CN',
    rate: 1,
    pitch: 1,
    volume: 1,
  });

  if (!supported) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggle(text);
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:bg-blue-50 active:scale-95 ${speaking && !paused ? 'animate-pulse' : ''} ${className}`}
      style={{ color: speaking && !paused ? '#1E3A8A' : '#6B7280' }}
      title={speaking && !paused ? '暂停朗读' : speaking && paused ? '继续朗读' : '朗读文字'}
      aria-label={speaking && !paused ? '暂停朗读' : speaking && paused ? '继续朗读' : '朗读文字'}
    >
      {speaking && !paused ? (
        <Volume2 className="w-4 h-4" />
      ) : (
        <VolumeX className="w-4 h-4" />
      )}
    </button>
  );
}
