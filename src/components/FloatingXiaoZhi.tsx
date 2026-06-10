'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, X, Send, Loader2, Sparkles, User, ChevronDown } from 'lucide-react';
import { useSSEStream } from '@/hooks/useSSEStream';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const STORAGE_KEY = 'xiaozhi_fab_messages';

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '还没睡呢';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveHistory(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  } catch {}
}

export default function FloatingXiaoZhi() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sseState, sseActions] = useSSEStream();

  // 初始化：检测登录状态 + 加载历史
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setIsLoggedIn(!!d.ok))
      .catch(() => setIsLoggedIn(false));

    const history = loadHistory();
    if (history.length > 0) {
      setMessages(history);
    }
  }, []);

  // 打开窗口时自动聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // 打开时显示欢迎语（仅首次）
  useEffect(() => {
    if (isOpen && !hasShownWelcome && messages.length === 0) {
      setHasShownWelcome(true);
      const greeting = getTimeGreeting();
      const welcomeMsg: Message = {
        role: 'assistant',
        content: `👋 ${greeting}！我是小职，你的桂电学长兼AI朋友~\n\n有啥想聊的？找工作、选方向、还是单纯唠嗑，都行😄`,
        timestamp: Date.now(),
      };
      setMessages([welcomeMsg]);
      saveHistory([welcomeMsg]);
    }
  }, [isOpen, hasShownWelcome, messages.length]);

  // 新回复到达时更新消息列表
  useEffect(() => {
    if (sseState.content && !sseState.isStreaming) {
      setMessages(prev => {
        const updated = [...prev];
        // 替换最后一条（如果最后一条是正在流式回复的占位）
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && updated[updated.length - 1].content === '...') {
          updated[updated.length - 1] = { role: 'assistant', content: sseState.content, timestamp: Date.now() };
        } else {
          updated.push({ role: 'assistant', content: sseState.content, timestamp: Date.now() });
        }
        saveHistory(updated);
        return updated;
      });
      setIsSending(false);
    }
  }, [sseState.content, sseState.isStreaming]);

  // SSE错误时恢复发送状态
  useEffect(() => {
    if (sseState.error) {
      setIsSending(false);
    }
  }, [sseState.error]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sseState.content]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isSending) return;

    // 未登录弹引导
    if (!isLoggedIn) {
      setIsOpen(false);
      window.location.href = '/auth?redirect=/';
      return;
    }

    const userMsg: Message = { role: 'user', content: text, timestamp: Date.now() };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    saveHistory(updatedMsgs);
    setInputValue('');
    setIsSending(true);

    // 添加占位，准备接收流式回复
    setMessages(prev => [...prev, { role: 'assistant', content: '...', timestamp: Date.now() }]);

    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      const userId = meData.ok ? meData.data?.user?.id ?? null : null;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userId) headers['x-user-id'] = userId;

      const res = await fetch('/api/chat?bot=xiaozhi', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, botType: 'xiaozhi' }),
      });

      if (!res.ok) {
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && updated[updated.length - 1].content === '...') {
            updated[updated.length - 1] = { role: 'assistant', content: '抱歉，暂时无法回复，请稍后再试', timestamp: Date.now() };
          }
          saveHistory(updated);
          return updated;
        });
        setIsSending(false);
        return;
      }

      sseActions.startStream(res);
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && updated[updated.length - 1].content === '...') {
          updated[updated.length - 1] = { role: 'assistant', content: '网络连接异常，请重试', timestamp: Date.now() };
        }
        saveHistory(updated);
        return updated;
      });
      setIsSending(false);
    }
  }, [inputValue, isSending, isLoggedIn, messages, sseActions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    setHasShownWelcome(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  // 流式内容实时显示
  const streamingContent = sseState.isStreaming ? sseState.content : null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* 对话窗口 */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">小职</p>
                <p className="text-[11px] text-white/70">桂电学长 · 在线</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
                title="清空对话"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="flex items-start gap-2 max-w-[85%]">
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {msg.content === '...' ? (
                      <div className="flex items-center gap-1.5 py-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 流式内容实时渲染 */}
            {streamingContent && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm">
                    {streamingContent}
                    <span className="inline-block w-1.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 未登录提示 */}
          {isLoggedIn === false && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-200">
              <p className="text-xs text-amber-700 text-center">
                <Link href="/auth?redirect=/" className="font-semibold underline underline-offset-2">
                  登录
                </Link>
                {' '}后和小职聊天
              </p>
            </div>
          )}

          {/* 输入区 */}
          <div className="px-4 py-3 border-t bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="和小职聊聊..."
                disabled={isSending || isLoggedIn === false}
                className="flex-1 text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={isSending || !inputValue.trim() || isLoggedIn === false}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">AI辅助建议，仅供参考</p>
          </div>
        </div>
      )}

      {/* FAB按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-blue-500/40 ${
          isOpen
            ? 'bg-gray-600 rotate-45'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageSquare className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}
