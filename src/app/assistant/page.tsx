'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Send, User as UserIcon, Loader2, Briefcase, GraduationCap, Sparkles, AlertCircle, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface BotConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  quickQuestions: string[];
}

const bots: BotConfig[] = [
  {
    id: 'jobs',
    name: '岗位百科',
    description: '查询各行业岗位信息',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'text-[#165DFF]',
    gradient: 'from-blue-500 to-blue-600',
    quickQuestions: [
      'Java开发工程师前景如何？',
      '产品经理需要哪些技能？',
      '算法工程师薪资水平',
      '国企vs私企怎么选？'
    ]
  },
  {
    id: 'interview',
    name: '模拟面试',
    description: 'AI模拟真实面试',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'text-[#00B42A]',
    gradient: 'from-green-500 to-green-600',
    quickQuestions: [
      '帮我模拟面试HR岗位',
      '如何回答"你为什么离职"',
      '自我介绍怎么说？',
      '面试常见问题有哪些'
    ]
  },
  {
    id: 'career',
    name: '职业规划',
    description: '制定专属职业规划',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-[#722ED1]',
    gradient: 'from-purple-500 to-purple-600',
    quickQuestions: [
      '计算机专业职业规划',
      '考研还是找工作？',
      '如何提升职场竞争力',
      '职业发展路径建议'
    ]
  }
];

export default function AssistantPage() {
  const [activeBot, setActiveBot] = useState('jobs');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const { user, quota, refreshQuota } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentBot = bots.find(b => b.id === activeBot) || bots[0];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 初始化欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `你好！我是${currentBot.name}，很高兴为你服务！

你可以这样问我：
• 了解某个岗位的发展前景和薪资水平
• 查询某个行业的工作内容和技能要求
• 获取求职建议和面试技巧

有什么我可以帮到你的吗？`,
        timestamp: new Date()
      }]);
    }
  }, [activeBot]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const meResponse = await fetch('/api/auth/me');
      const meData = await meResponse.json();
      const userId = meData.success ? meData.user.id : null;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (userId) {
        headers['x-user-id'] = userId;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: messageText,
          botType: activeBot,
          conversationId: localStorage.getItem(`conversationId_${activeBot}`) || undefined
        }),
      });

      if (response.status === 403) {
        const data = await response.json();
        if (data.error === 'quota_exceeded') {
          refreshQuota();
          setShowQuotaDialog(true);
          setMessages(prev => prev.slice(0, -1));
          setIsLoading(false);
          return;
        }
      }

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        const assistantMessage: Message = {
          role: 'assistant',
          content: '',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = fullContent;
            return newMessages;
          });
        }

        const conversationIdMatch = fullContent.match(/conversationId["\s:]+([^"\\]+)/);
        if (conversationIdMatch) {
          localStorage.setItem(`conversationId_${activeBot}`, conversationIdMatch[1]);
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch {
      const assistantMessage: Message = {
        role: 'assistant',
        content: `${currentBot.name}正在升级中，请稍后再试...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = () => {
    sendMessage(inputValue);
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleTabChange = (botId: string) => {
    setActiveBot(botId);
    setMessages([]);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const displayQuota = quota?.is_member ? '无限' : (quota?.remaining ?? '加载中');
  const quotaExhausted = !quota?.is_member && (quota?.remaining ?? 0) <= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部额度提示条 */}
      {user && (
        <div className={`sticky top-0 z-10 px-4 py-3 border-b transition-colors ${
          quotaExhausted 
            ? 'bg-orange-50 border-orange-200' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              {quota?.is_member ? (
                <>
                  <Crown className="w-5 h-5 text-[#FF7D00]" />
                  <span className="text-gray-700">
                    <strong className="text-[#FF7D00]">会员专享</strong> 无限次AI服务
                  </span>
                </>
              ) : (
                <>
                  <span className="text-gray-600 text-sm">本月剩余免费次数：</span>
                  <span className={`text-lg font-bold ${quotaExhausted ? 'text-red-500' : 'text-[#165DFF]'}`}>
                    {displayQuota}/5
                  </span>
                </>
              )}
            </div>
            
            {quotaExhausted ? (
              <Link href="/membership">
                <Button size="sm" className="bg-gradient-to-r from-[#FF7D00] to-[#FF9A2E] hover:opacity-90 text-white">
                  开通会员 无限使用
                </Button>
              </Link>
            ) : !quota?.is_member && (
              <Link href="/membership">
                <Button size="sm" variant="outline" className="text-[#FF7D00] border-[#FF7D00] hover:bg-orange-50">
                  开通会员 无限使用
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            AI职业助手
          </h1>
          <p className="text-gray-600 text-sm">
            三大智能体协同服务，助你求职无忧
          </p>
        </div>

        {/* 智能体Tab选择器 */}
        <div className="bot-tabs mb-4">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl overflow-x-auto">
            {bots.map((bot) => (
              <button
                key={bot.id}
                onClick={() => handleTabChange(bot.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 flex-shrink-0 ${
                  activeBot === bot.id
                    ? `bg-gradient-to-r ${bot.gradient} text-white shadow-lg`
                    : 'text-gray-600 hover:bg-white hover:shadow'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activeBot === bot.id ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {bot.icon}
                </div>
                <div className="text-left">
                  <div className={`font-semibold text-sm ${activeBot === bot.id ? 'text-white' : 'text-gray-900'}`}>
                    {bot.name}
                  </div>
                  <div className={`text-xs ${activeBot === bot.id ? 'text-white/80' : 'text-gray-500'} hidden sm:block`}>
                    {bot.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 聊天区域 */}
        <Card className="border-2 overflow-hidden flex flex-col" style={{
          borderColor: activeBot === 'jobs' ? '#165DFF' : activeBot === 'interview' ? '#00B42A' : '#722ED1'
        }}>
          {/* 快捷问题 */}
          {messages.length <= 1 && (
            <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
              <p className="text-xs text-gray-500 mb-3">试试这些问题：</p>
              <div className="flex flex-wrap gap-2">
                {currentBot.quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickQuestion(q)}
                    className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-gray-50 to-white min-h-[400px]">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' 
                      ? `bg-gradient-to-br ${currentBot.gradient}` 
                      : 'bg-white border-2 border-gray-200'
                  }`}
                >
                  {msg.role === 'user' 
                    ? <UserIcon className="w-5 h-5 text-white" /> 
                    : <span className={`${currentBot.color}`}>{currentBot.icon}</span>
                  }
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? `bg-gradient-to-br ${currentBot.gradient} text-white rounded-tr-sm`
                      : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                    {index === messages.length - 1 && isLoading && (
                      <span className="inline-block animate-pulse ml-1">▊</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                placeholder={`问${currentBot.name}...`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                className="flex-1 text-sm h-12"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                className={`bg-gradient-to-r ${currentBot.gradient} hover:opacity-90 text-white h-12 px-6`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              AI 辅助建议，仅供参考
            </p>
          </div>
        </Card>

        {/* 底部提示 */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <span>全行业岗位百科</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600"></div>
            <span>模拟面试官</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"></div>
            <span>职业生涯规划</span>
          </div>
        </div>
      </div>

      {/* 配额用完弹窗 */}
      <Dialog open={showQuotaDialog} onOpenChange={setShowQuotaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#FF7D00]" />
              本月免费次数已用完
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>您本月的5次免费AI服务已全部使用完毕</p>
              <div className="space-y-2">
                <p className="font-medium text-gray-900">解锁更多次数：</p>
                <div className="flex flex-col gap-2">
                  <Link href="/membership" onClick={() => setShowQuotaDialog(false)}>
                    <Button className="w-full bg-gradient-to-r from-[#FF7D00] to-[#FF9A2E] hover:opacity-90 text-white">
                      开通会员 - 无限次使用
                    </Button>
                  </Link>
                  <Link href="/profile/invite" onClick={() => setShowQuotaDialog(false)}>
                    <Button variant="outline" className="w-full">
                      邀请好友 - 每次获得3次免费次数
                    </Button>
                  </Link>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
