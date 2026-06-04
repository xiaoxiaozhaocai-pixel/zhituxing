'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Send, Loader2, GraduationCap, Briefcase, TrendingUp, Target, Sparkles, Share2, Download, Crown, AlertCircle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AIResponseRenderer from '@/components/AIResponseRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isReport?: boolean;
  isFullVersion?: boolean;
}

const decisionWelcome = `👋 你好！我是「职途星——考研就业决策助手」，专为大三、大四学生打造的升学就业对比工具。

✨ 我能帮你做什么：
⚖️ 利弊分析：基于你的专业、成绩和兴趣，对比考研和就业的优劣势
📅 时间规划：生成考研备考或求职准备的详细时间线
🎓 院校推荐：根据你的专业和成绩，推荐适合的考研院校和专业
💼 岗位推荐：如果选择就业，推荐最适合你的岗位和成长路径
💡 请告诉我你的专业、年级和成绩排名，我来为你生成个性化决策建议！`;

const quickQuestions = [
  '大三现在准备考研来得及吗？',
  '计算机专业考研还是就业好？',
  '文科专业考研有必要吗？',
  '考研二战还是找工作？',
  '本科双非考研能上985吗？',
  '考公和考研怎么选？',
  '2027年考研难度预测？',
  '生成我的考研备考计划'
];

const sharePrompt = (inviteCode: string) => `
---
🎉 **分享这份报告给同学，双方都能获得奖励！**

分享成功后你将获得：**完全免费使用所有AI功能**
好友通过你的分享链接注册并首次使用，也将获得3次免费AI次数+7天会员

📱 分享方式：
[复制分享链接]

或扫描下方二维码分享给好友：
`;

export default function DecisionPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnimRef = useRef<number | null>(null);
  const isUserNearBottomRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    const container = chatContainerRef.current;
    if (!container) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const threshold = 100;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isUserNearBottomRef.current = distanceFromBottom < threshold;
    if (isUserNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 检测用户是否主动向上滚动
  const handleChatScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const threshold = 100;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isUserNearBottomRef.current = distanceFromBottom < threshold;
  }, []);

  // 消息更新时滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // SSE流式输出时持续滚动到底部
  useEffect(() => {
    if (loading && messages.length > 1) {
      const scrollLoop = () => {
        const container = chatContainerRef.current;
        if (container && isUserNearBottomRef.current) {
          container.scrollTop = container.scrollHeight;
        }
        scrollAnimRef.current = requestAnimationFrame(scrollLoop);
      };
      scrollAnimRef.current = requestAnimationFrame(scrollLoop);
      return () => {
        if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
      };
    }
  }, [loading, messages.length]);

  // 初始化欢迎消息
  useEffect(() => {
    if (!authLoading && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: decisionWelcome
      }]);
    }
  }, [authLoading]);

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
          message: input.trim(),
          botType: 'decision'
        })
      });

      // 契约化：配额耗尽走 jsonError → 429 + { ok:false, error:{ code:'QUOTA_EXCEEDED', message } }
      // 同时兼容 middleware 401（未登录）
      if (response.status === 429 || response.status === 403) {
        const data = await response.json().catch(() => null);
        const msg = data?.error?.message || data?.message || '该功能为会员专享，请开通会员后使用';
        setMessages(prev => [...prev.slice(0, -1), { 
          role: 'assistant', 
          content: `🔒 ${msg}` 
        }]);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`请求失败 (${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let sseBuffer = '';

      // 超时计时器
      const thinkingTimer = setTimeout(() => {
        if (!fullContent) {
          setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: '⏳ AI正在思考，请耐心等待...' }]);
        }
      }, 15000);

      const timeoutTimer = setTimeout(() => {
        if (!fullContent) {
          reader?.cancel().catch(() => {});
          setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: '❌ 请求超时，请重试' }]);
          setLoading(false);
        }
      }, 60000);

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            sseBuffer += chunk;

            // 解析SSE事件
            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === 'text') {
                    fullContent += data.content;
                    setStreamingContent(fullContent);
                    clearTimeout(thinkingTimer);
                    clearTimeout(timeoutTimer);
                  } else if (data.type === 'error') {
                    clearTimeout(thinkingTimer);
                    clearTimeout(timeoutTimer);
                    setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: `❌ ${data.message || '生成失败，请重试'}` }]);
                    setLoading(false);
                    return;
                  } else if (data.type === 'done') {
                    clearTimeout(thinkingTimer);
                    clearTimeout(timeoutTimer);
                  }
                } catch {
                  // 非JSON数据，尝试作为纯文本
                  const textContent = line.slice(6).trim();
                  if (textContent) {
                    fullContent += textContent;
                    setStreamingContent(fullContent);
                  }
                }
              }
            }
          }
        } finally {
          clearTimeout(thinkingTimer);
          clearTimeout(timeoutTimer);
        }
      }

      // 流式结束后添加到消息列表
      if (fullContent) {
        // 非会员添加升级提示
        const finalContent = fullContent;
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: finalContent,
          isReport: true,
          isFullVersion: true
        }]);
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

  const handleShare = () => {
    setShowShareDialog(true);
  };

  const copyShareLink = async () => {
    const shareLink = `${window.location.origin}/decision?ref=${user?.id || 'guest'}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('复制失败，请手动复制');
    }
  };

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
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">考研就业决策助手</h1>
              <p className="text-gray-500 text-sm">基于你的情况，帮你分析最佳选择</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#FF7D00]" />
                <span className="text-sm font-medium text-[#FF7D00]">完整版</span>
              </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={chatContainerRef} onScroll={handleChatScroll} className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 overflow-auto">
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                  : 'bg-gradient-to-br from-orange-500 to-orange-600'
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
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}>
                  <AIResponseRenderer rawText={message.content} role={message.role as 'user' | 'assistant'} />

                  {/* 报告操作按钮 */}
                  {message.role === 'assistant' && message.isReport && (
                    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2 justify-end">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        onClick={handleShare}
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        分享得奖励
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        下载PDF
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Streaming Content */}
          {streamingContent && (
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="max-w-[80%]">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                  <AIResponseRenderer rawText={streamingContent} streaming role="assistant" />
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && !streamingContent && (
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 快捷提问按钮 - 仅首次对话显示 */}
      {messages.length <= 1 && !loading && (
        <div className="max-w-4xl mx-auto w-full px-4 pb-4">
          <p className="text-sm text-gray-500 mb-3">试试这些问题：</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-all text-left line-clamp-2"
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
              placeholder="输入你的专业、年级和成绩排名，我来帮你分析..."
              rows={1}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none max-h-32"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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

      {/* 分享弹窗 */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#FF7D00]" />
              分享得奖励
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-800 font-medium mb-2">🎉 分享奖励规则</p>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• 分享成功后你将获得：<strong>3次免费AI次数+7天会员</strong></li>
                <li>• 好友通过你的链接注册并首次使用，也将获得3次免费AI次数</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <p className="font-medium text-gray-900">分享链接</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/decision?ref=${user?.id || ''}`}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
                <Button 
                  onClick={copyShareLink}
                  className={copied ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      复制
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <Button variant="outline" className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                微信
              </Button>
              <Button variant="outline" className="flex-1">
                分享到QQ
              </Button>
              <Button variant="outline" className="flex-1">
                朋友圈
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
