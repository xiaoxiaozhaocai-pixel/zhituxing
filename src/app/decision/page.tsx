'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Send, Loader2, GraduationCap, Briefcase, TrendingUp, Target, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function DecisionPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 初始化欢迎消息
  useEffect(() => {
    if (!authLoading && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `你好！我是**考研就业决策助手**，可以帮助你分析考研和直接就业的利弊，为你做出最适合的选择提供参考。

请告诉我你的基本情况，比如：
- 你的专业是什么？
- 你的学历背景？
- 你的职业规划方向？
- 你对考研有什么顾虑？

我会根据你的具体情况，给出客观的分析建议。`
        }
      ]);
    }
  }, [authLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    if (!isAuthenticated) {
      alert('请先登录后再使用');
      window.location.href = '/auth';
      return;
    }

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user!.id
        },
        body: JSON.stringify({
          message: userMessage.content,
          botType: 'decision'
        })
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setStreamingContent(fullContent);
        }
      }

      // 流式结束后添加到消息列表
      if (fullContent) {
        setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
      }
      setStreamingContent('');

    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，发生了错误，请稍后重试。'
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const quickQuestions = [
    '考研真的能提升就业竞争力吗？',
    '本科就业好还是考研好？',
    '文科生适合考研还是就业？',
    '计算机专业考研 vs 就业怎么选？'
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">考研就业决策助手</h1>
              <p className="text-gray-500 text-sm">基于你的情况，帮你分析最佳选择</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 overflow-auto">
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                message.role === 'user'
                  ? 'bg-blue-600'
                  : 'bg-gradient-to-br from-purple-500 to-blue-500'
              }`}>
                {message.role === 'user' ? (
                  <span className="text-white text-sm font-medium">
                    {user?.nickname?.[0] || 'U'}
                  </span>
                ) : (
                  <Target className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Content */}
              <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Streaming Content */}
          {streamingContent && (
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="max-w-[80%]">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {streamingContent}
                    <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && !streamingContent && (
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Questions */}
      {messages.length <= 1 && !loading && (
        <div className="max-w-4xl mx-auto w-full px-4 pb-4">
          <p className="text-sm text-gray-500 mb-3">试试这些问题：</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50 hover:border-blue-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t">
        <div className="max-w-4xl mx-auto w-full px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="输入你的问题..."
              rows={1}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none max-h-32"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              发送
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2 text-center">
            AI 辅助决策，仅供参考，最终决定请结合实际情况
          </p>
        </div>
      </div>
    </div>
  );
}
