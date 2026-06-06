'use client';

import Link from 'next/link';
import { MessageSquare, Compass, Mic, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY_POS = 'xiaozhi-float-pos';
const STORAGE_KEY_VISITED = 'xiaozhi-visited';

const quickActions = [
  { label: '找小职聊聊', icon: MessageSquare, href: '/assistant?bot=xiaozhi' },
  { label: '职业规划', icon: Compass, href: '/assistant?bot=career' },
  { label: '模拟面试', icon: Mic, href: '/assistant?bot=interview' },
];

export default function FloatingAICTA() {
  const [isHovered, setIsHovered] = useState(false);
  const [showFirstVisit, setShowFirstVisit] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition(parsed);
          return;
        }
      }
    } catch {}
    setPosition({ x: window.innerWidth - 88, y: window.innerHeight - 88 });

    const visited = localStorage.getItem(STORAGE_KEY_VISITED);
    if (!visited) {
      setShowFirstVisit(true);
      localStorage.setItem(STORAGE_KEY_VISITED, '1');
      setTimeout(() => setShowFirstVisit(false), 4000);
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragMoved.current = false;
    setDragging(true);
    setShowFirstVisit(false);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    const dx = Math.abs(newX - (position?.x ?? 0));
    const dy = Math.abs(newY - (position?.y ?? 0));
    if (dx > 2 || dy > 2) dragMoved.current = true;
    if (dragMoved.current) setPosition({ x: newX, y: newY });
  }, [dragging, position]);

  const handlePointerUp = useCallback(() => {
    if (dragging && dragMoved.current && position) {
      try { localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(position)); } catch {}
    }
    setDragging(false);
  }, [dragging, position]);

  if (!position) return null;
  const isExpanded = showFirstVisit || isHovered;

  return (
    <div
      ref={containerRef}
      className="fixed z-40 select-none"
      style={{ left: position.x, top: position.y, touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 快捷面板 */}
      <div className={`absolute right-full mr-3 bottom-0 flex items-center gap-2 transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <div className="flex items-center gap-1.5 glass-card text-[#165DFF] text-sm px-3 py-2 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 whitespace-nowrap cursor-pointer">
                <Icon className="w-4 h-4" />
                <span className="font-medium">{action.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 主按钮 */}
      <button
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg btn-gradient transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-[#165DFF]/40 animate-pulse-ring ${dragging ? 'cursor-grabbing scale-110' : showFirstVisit ? 'cursor-pointer' : 'cursor-grab'}`}
        onMouseEnter={() => !dragging && setIsHovered(true)}
        onMouseLeave={() => !dragging && setIsHovered(false)}
        onClick={(e) => { if (dragMoved.current) { e.preventDefault(); dragMoved.current = false; } }}
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}
