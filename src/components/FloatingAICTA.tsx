'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Compass, Mic, Send, X, Loader2, Share2, Check } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AIResponseRenderer from '@/components/AIResponseRenderer';

const STORAGE_KEY_POS = 'xiaozhi-float-pos';
const CHAT_PANEL_W = 440;
const CHAT_PANEL_H = 600;
const FAB_SIZE = 56;
const GAP = 16;

function clampPosition(x: number, y: number): { x: number; y: number } {
  if (typeof window === 'undefined') return { x, y };
  return {
    x: Math.max(0, Math.min(x, window.innerWidth - FAB_SIZE)),
    y: Math.max(0, Math.min(y, window.innerHeight - FAB_SIZE)),
  };
}

const quickActions = [
  { label: '找小职聊聊', icon: MessageSquare, href: '/assistant?bot=xiaozhi' },
  { label: '职业规划', icon: Compass, href: '/assistant?bot=career' },
  { label: '模拟面试', icon: Mic, href: '/assistant?bot=interview' },
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function FloatingAICTA() {
  const pathname = usePathname();
  const [isHovered, _setIsHovered] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 对话窗口状态
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── 分享 ──
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'copied'>('idle');
  const [_shareUrl, setShareUrl] = useState('');

  // ── 登录态（仅用于消息区登录引导，不再触发会员悬浮窗） ──
  const { user, loading } = useAuth();

  // 初始化位置 + 首次访问判断
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          // 验证保存的位置仍在当前窗口范围内
          setPosition(clampPosition(parsed.x, parsed.y));
          return;
        }
      }
    } catch { /* ignore */ }
    setPosition({ x: window.innerWidth - FAB_SIZE - 24, y: window.innerHeight - FAB_SIZE - 100 });
    // 6/12 P5-D4：删除首次访问自动展开，悬浮按钮仅在主动 hover 时展开（主人偏好）
  }, []);

  // ── 拖拽 ──
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragMoved.current = false;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    const dx = Math.abs(newX - (position?.x ?? 0));
    const dy = Math.abs(newY - (position?.y ?? 0));
    if (dx > 2 || dy > 2) dragMoved.current = true;
    if (dragMoved.current) setPosition(clampPosition(newX, newY));
  }, [dragging, position]);

  const handlePointerUp = useCallback(() => {
    if (dragging && dragMoved.current && position) {
      try { localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(position)); } catch { /* ignore */ }
    }
    setDragging(false);
  }, [dragging, position]);

  const handleFabClick = () => {
    if (dragMoved.current) return;
    setChatOpen(true);
  };

  // ── SSE 聊天 ──
  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || streaming) return;

    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setStreaming(true);

    // 统一 AbortController：控制 fetch + SSE reader（之前 AbortSignal.timeout 只管 fetch 不管 reader，导致流挂死时永久转圈）
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 90000);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'include', // 显式带上 sb-access-token cookie，否则后端 401
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, botType: 'xiaozhi' }),
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) {
        if (res.status === 401) {
          setMessages(prev => [...prev, { role: 'assistant', content: '请先登录后再使用小职～\n\n👉 点击页面右上角登录按钮' }]);
          clearTimeout(timeoutId);
          setStreaming(false);
          return;
        }
        setMessages(prev => [...prev, { role: 'assistant', content: '小职暂时无法回复，请稍后再试～' }]);
        clearTimeout(timeoutId);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let sseBuffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        // 双重保险：signal.aborted 兜底 + reader.read() 的 AbortError
        if (abortController.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        // 修复 6/13 23:30：用 \n\n 切完整 SSE 事件 + 跨 chunk buffer
        // 避免 TCP 半截 JSON 导致 content 丢失，避免 dispatch/conversation_id 等 event 的 data 被当 text 累加
        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split('\n\n');
        sseBuffer = events.pop() ?? '';

        for (const evt of events) {
          if (!evt.trim()) continue;
          let eventType = 'message';
          let dataLine = '';
          for (const line of evt.split('\n')) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data: ')) {
              dataLine = line.slice(6);
            } else if (line.startsWith('data:')) {
              dataLine = line.slice(5);
            }
          }
          if (!dataLine) continue;
          if (dataLine === '[DONE]') continue;
          // 只累加普通 message 事件的 text content；conversation_id / dispatch / save_result 跳过
          if (eventType !== 'message') continue;
          try {
            const json = JSON.parse(dataLine);
            const content = json?.content || json?.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: fullContent };
                return copy;
              });
            }
          } catch { /* non-JSON SSE data */ }
        }
      }
    } catch (err) {
      // AbortError 超时 → 友好提示；其他错误 → 通用兜底
      const isTimeout = (err as Error)?.name === 'AbortError';
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: last?.content || (isTimeout ? '小职思考太久了，请稍后再试～' : '网络出了点问题，再试试？'),
        };
        return copy;
      });
    } finally {
      clearTimeout(timeoutId);
      setStreaming(false);
    }
  };

  // ── 分享对话 ──
  const handleShare = async () => {
    if (messages.length === 0 || shareState === 'loading') return;
    setShareState('loading');
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botName: '小职',
          botGradient: 'from-[#165DFF] to-[#3D7FFF]',
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        setShareUrl(data.url);
        await navigator.clipboard.writeText(data.url);
        setShareState('copied');
        setTimeout(() => setShareState('idle'), 2500);
      } else {
        setShareState('idle');
      }
    } catch {
      setShareState('idle');
    }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (chatOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [chatOpen]);

  // ── 路由限制 ──
  if (pathname?.startsWith('/profile') || pathname?.startsWith('/admin')) return null;
  if (!position) return null;

  const isExpanded = isHovered;

  return (
    <>
      {/* FAB + 快捷面板 */}
      <div
        ref={containerRef}
        className="fixed z-40 select-none group"
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
                <div className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 whitespace-nowrap cursor-pointer glass-card text-[#165DFF]">
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{action.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* FAB 主按钮 */}
        <button
          type="button"
          onClick={handleFabClick}
          className={`relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl select-none btn-gradient hover:shadow-[#165DFF]/40 ${
            dragging ? 'cursor-grabbing scale-110' : 'cursor-grab'
          } animate-pulse-ring`}
        >
          <MessageSquare className="w-6 h-6 text-white pointer-events-none" />
        </button>
      </div>

      {/* 对话窗口 */}
      {chatOpen && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden glass-strong rounded-2xl shadow-2xl"
          style={{
            left: Math.max(16, (position.x + FAB_SIZE / 2) - CHAT_PANEL_W / 2),
            top: Math.max(16, position.y - CHAT_PANEL_H - GAP),
            width: CHAT_PANEL_W,
            height: CHAT_PANEL_H,
          }}
        >
          {/* 标题栏 — 可拖拽 */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-white/20 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white shrink-0 cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              const startX = e.clientX;
              const startY = e.clientY;
              const startPx = position.x;
              const startPy = position.y;
              e.currentTarget.setPointerCapture(e.pointerId);
              const onMove = (ev: PointerEvent) => {
                setPosition(clampPosition(startPx + (ev.clientX - startX), startPy + (ev.clientY - startY)));
              };
              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                try { localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(position)); } catch { /* ignore */ }
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
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleShare}
                  onPointerDown={(e) => e.stopPropagation()}
                  disabled={shareState === 'loading'}
                  className="hover:bg-white/20 rounded-lg p-1.5 transition flex items-center gap-1.5 disabled:opacity-50"
                  title="分享对话"
                >
                  {shareState === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : shareState === 'copied' ? (
                    <Check className="w-4 h-4 text-green-300" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  {shareState === 'copied' && (
                    <span className="text-xs text-green-300">已复制链接</span>
                  )}
                </button>
              )}
              <button
                onClick={() => setChatOpen(false)}
                onPointerDown={(e) => e.stopPropagation()}
                className="hover:bg-white/20 rounded-lg p-1.5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 消息区 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F8FAFC]">
            {messages.length === 0 && (
              <div className="text-center text-[#94A3B8] mt-12">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center shadow-lg shadow-[#165DFF]/20">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <p className="text-sm font-medium text-[#1E293B]">你好！我是小职</p>
                <p className="text-xs mt-1">你的AI求职搭子，有什么问题尽管问我～</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] text-white rounded-br-md'
                    : 'bg-white border border-[#E2E8F0] text-[#1E293B] rounded-bl-md shadow-sm'
                }`}>
                  {msg.content
                    ? <AIResponseRenderer rawText={msg.content} role={msg.role as 'user' | 'assistant'} streaming={streaming && i === messages.length - 1} />
                    : <Loader2 className="w-4 h-4 animate-spin" />
                  }
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* 输入区 */}
          <div className="px-3 py-2.5 border-t border-[#E2E8F0] bg-white shrink-0">
            {!user && !loading ? (
              <Link href="/login" className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-white bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] rounded-full hover:shadow-lg transition-shadow">
                登录后使用小职 →
              </Link>
            ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入问题..."
                disabled={streaming}
                className="flex-1 px-4 py-2.5 text-sm bg-[#F1F5F9] border-0 rounded-full outline-none focus:ring-2 focus:ring-[#165DFF]/30 focus:bg-white transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className="w-10 h-10 rounded-full btn-gradient flex items-center justify-center disabled:opacity-50 shrink-0"
              >
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}


