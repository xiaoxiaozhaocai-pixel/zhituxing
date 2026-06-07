'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Compass, Mic, Briefcase, FileText } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const quickPrompts = [
  { label: '帮我做职业规划', icon: Compass, prompt: '我是一名大学生，想请你帮我做一下职业规划' },
  { label: '模拟面试练习', icon: Mic, prompt: '我想练习一下模拟面试，帮我准备一下' },
  { label: '推荐适合的岗位', icon: Briefcase, prompt: '帮我推荐一些适合我的岗位' },
  { label: '帮我优化简历', icon: FileText, prompt: '我想优化我的简历，能帮我看看吗' },
];

export default function HomeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || streaming) return;

    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, botType: 'xiaozhi' }),
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
            } catch {
              // skip malformed SSE chunks
            }
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '网络不太好，请稍后再试～' }]);
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {hasMessages && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm mb-4 max-h-[320px] overflow-y-auto">
          <div className="p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-[#F8FAFC] text-[#1E293B] border border-[#E2E8F0]'
                  }`}
                >
                  {msg.content || (msg.role === 'assistant' && streaming && (
                    <span className="flex items-center gap-1 text-[#64748B]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      思考中...
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {!hasMessages && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {quickPrompts.map((item, i) => (
            <button
              key={i}
              onClick={() => handleSend(item.prompt)}
              disabled={streaming}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#E2E8F0] bg-white hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 text-[#1E293B] disabled:opacity-50"
            >
              <item.icon className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="flex items-center gap-2 bg-white border-2 border-[#E2E8F0] rounded-2xl px-4 py-3 shadow-sm focus-within:border-blue-400 focus-within:shadow-md transition-all duration-200">
          <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="和小职聊聊你的求职困惑..."
            className="flex-1 bg-transparent border-none outline-none text-[#1E293B] placeholder-[#94A3B8] text-sm"
            disabled={streaming}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || streaming}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {streaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
