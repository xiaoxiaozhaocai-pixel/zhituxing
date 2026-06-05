'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Compass, Mic, Send, X, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const quickActions = [
  { label: '职业规划', icon: Compass, href: '/assistant?bot=career' },
  { label: '模拟面试', icon: Mic, href: '/assistant?bot=interview' },
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function FloatingAICTA() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── 拖拽状态 ──
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  // 加载保存的位置
  useEffect(() => {
    try {
      const saved = localStorage.getItem('xiaozhi-float-pos');
      if (saved) setOffset(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = dragRef.current.startX - e.clientX;
    const dy = dragRef.current.startY - e.clientY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    setOffset({
      x: dragRef.current.startOffsetX + dx,
      y: dragRef.current.startOffsetY + dy,
    });
  };

  const onPointerUp = () => {
    dragRef.current.active = false;
    try { localStorage.setItem('xiaozhi-float-pos', JSON.stringify(offset)); } catch { /* ignore */ }
  };

  const handleFabClick = () => {
    if (dragRef.current.moved) return;
    setChatOpen(true);
  };

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || streaming) return;

    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, bot_type: 'xiaozhi' }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok || !res.body) {
        setMessages(prev => [...prev, { role: 'assistant', content: '小职暂时无法回复，请稍后再试～' }]);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const content = json?.content || json?.choices?.[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: 'assistant', content: fullContent };
                  return copy;
                });
              }
            } catch { /* non-JSON SSE */ }
          }
        }
      }
    } catch {
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = { role: 'assistant', content: last!.content || '网络出了点问题，再试试？' };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (chatOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [chatOpen]);

  if (pathname?.startsWith('/profile') || pathname?.startsWith('/admin')) {
    return null;
  }

  const btnRight = 24 + offset.x;
  const btnBottom = 24 + offset.y;

  return (
    <>
      <div
        className="fixed z-40"
        style={{ right: `${btnRight}px`, bottom: `${btnBottom}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`absolute right-full mr-3 bottom-0 flex items-center gap-2 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <div className="flex items-center gap-1.5 bg-white border border-blue-100 text-blue-600 text-sm px-3 py-2 rounded-lg shadow-lg hover:bg-blue-50 hover:border-blue-200 transition-all whitespace-nowrap cursor-pointer">
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{action.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={handleFabClick}
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-blue-500/40 select-none cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          <MessageSquare className="w-6 h-6 text-white pointer-events-none" />
        </button>
      </div>

      {chatOpen && (
        <div className="fixed z-50 w-96 h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ right: `${btnRight}px`, bottom: `${btnBottom + 72}px` }}>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white shrink-0 cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              const startX = e.clientX;
              const startY = e.clientY;
              const startOx = offset.x;
              const startOy = offset.y;
              const onMove = (ev: PointerEvent) => {
                setOffset({ x: startOx + (startX - ev.clientX), y: startOy + (startY - ev.clientY) });
              };
              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                try { localStorage.setItem('xiaozhi-float-pos', JSON.stringify(offset)); } catch {}
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp);
            }}
          >
            <div className="flex items-center gap-2 pointer-events-none">
              <MessageSquare className="w-5 h-5" />
              <span className="font-semibold">小职</span>
              <span className="text-xs opacity-75">AI求职搭子</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 rounded p-1 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-8">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">你好！我是小职，你的AI求职搭子</p>
                <p className="text-xs mt-1">有什么求职问题尽管问我～</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-white border text-gray-800 rounded-bl-sm shadow-sm'}`}>
                  {msg.content || <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="px-3 py-2 border-t bg-white shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入问题..." disabled={streaming} className="flex-1 px-3 py-2 text-sm border rounded-full outline-none focus:border-blue-400 disabled:opacity-50" />
              <button type="submit" disabled={!input.trim() || streaming} className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 shrink-0">
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
