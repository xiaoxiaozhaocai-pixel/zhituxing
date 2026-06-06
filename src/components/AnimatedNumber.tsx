'use client';

import {useState, useEffect} from 'react';

interface AnimatedNumberProps {
  target: number;
  duration?: number;
}

export function AnimatedNumber({ target, duration = 2000 }: AnimatedNumberProps) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  // 组件挂载后立即开始动画
  useEffect(() => {
    setStarted(true);
  }, []);

  useEffect(() => {
    if (!started) return;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return <span>{count.toLocaleString()}</span>;
}
