'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, Bot, User as UserIcon, Loader2, Briefcase, GraduationCap, Sparkles } from 'lucide-react';

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
  bgColor: string;
  quickQuestions: string[];
}

// 三个智能体配置
const bots: BotConfig[] = [
  {
    id: 'jobs',
    name: '全行业岗位百科',
    description: '查询各行业岗位信息、薪资水平、发展前景',
    icon: <Briefcase className="w-6 h-6" />,
    color: 'text-[#165DFF]',
    bgColor: 'bg-[#165DFF]',
    quickQuestions: [
      'Java开发工程师前景如何？',
      '产品经理需要哪些技能？',
      '算法工程师薪资水平',
      '国企vs私企怎么选？'
    ]
  },
  {
    id: 'interview',
    name: '模拟面试官',
    description: 'AI模拟真实面试场景，帮你备战秋招春招',
    icon: <GraduationCap className="w-6 h-6" />,
    color: 'text-[#00B42A]',
    bgColor: 'bg-[#00B42A]',
    quickQuestions: [
      '帮我模拟面试HR岗位',
      '如何回答"你为什么离职"',
      '自我介绍怎么说？',
      '面试常见问题有哪些'
    ]
  },
  {
    id: 'career',
    name: 'AI职业生涯规划',
    description: '根据你的专业和兴趣，制定专属职业规划',
    icon: <Sparkles className="w-6 h-6" />,
    color: 'text-[#722ED1]',
    bgColor: 'bg-[#722ED1]',
    quickQuestions: [
      '计算机专业职业规划',
      '考研还是找工作？',
      '如何提升职场竞争力',
      '职业发展路径建议'
    ]
  }
];

// 创建独立的聊天窗口组件
function ChatWindow({ 
  bot, 
  isActive, 
  onActivate 
}: { 
  bot: BotConfig; 
  isActive: boolean;
  onActivate: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          botType: bot.id,
          conversationId: localStorage.getItem(`conversationId_${bot.id}`) || undefined
        }),
      });

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

          const chunk = decoder.decode(value);
          fullContent += chunk;
          
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = fullContent;
            return newMessages;
          });
        }

        const conversationIdMatch = fullContent.match(/conversationId["\s:]+([^"\\]+)/);
        if (conversationIdMatch) {
          localStorage.setItem(`conversationId_${bot.id}`, conversationIdMatch[1]);
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch {
      const assistantMessage: Message = {
        role: 'assistant',
        content: `${bot.name}正在升级中，请稍后再试...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    sendMessage(inputValue);
  };

  const handleQuickQuestion = (question: string) => {
    if (isActive) {
      sendMessage(question);
    }
  };

  // 点击Tab时聚焦输入框
  const handleTabClick = () => {
    onActivate();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab头部 */}
      <button
        onClick={handleTabClick}
        className={`w-full px-4 py-3 flex items-center gap-3 transition-all ${
          isActive 
            ? 'bg-white border-b-2 border-' + bot.id 
            : 'bg-gray-50 hover:bg-gray-100'
        }`}
        style={{ 
          borderBottomColor: isActive ? (bot.id === 'jobs' ? '#165DFF' : bot.id === 'interview' ? '#00B42A' : '#722ED1') : 'transparent',
          borderBottomWidth: '2px'
        }}
      >
        <div className={`w-10 h-10 ${bot.bgColor} rounded-lg flex items-center justify-center text-white`}>
          {bot.icon}
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-gray-900">{bot.name}</h3>
          <p className="text-xs text-gray-500 line-clamp-1">{bot.description}</p>
        </div>
      </button>

      {/* 聊天区域 */}
      <div className={`flex-1 flex flex-col overflow-hidden ${isActive ? 'block' : 'hidden'}`}>
        {/* 快捷问题 */}
        {messages.length === 0 && (
          <div className="p-4 border-b bg-gray-50">
            <p className="text-xs text-gray-500 mb-2">试试这些问题：</p>
            <div className="flex flex-wrap gap-2">
              {bot.quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickQuestion(q)}
                  className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-[#165DFF] hover:text-[#165DFF] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-gray-50 to-white">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className={`w-16 h-16 ${bot.bgColor} rounded-full flex items-center justify-center mx-auto mb-3 text-white`}>
                  {bot.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{bot.name}</h3>
                <p className="text-sm text-gray-500">{bot.description}</p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? bot.bgColor : 'bg-gray-200'
                  } text-white`}
                >
                  {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : bot.icon}
                </div>
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? `${bot.bgColor} text-white`
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                    {index === messages.length - 1 && isLoading && msg.role === 'user' && (
                      <span className="inline-block animate-pulse ml-1">▊</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div className="p-3 border-t bg-white">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder={`问${bot.name}...`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              className="flex-1 text-sm"
              disabled={isLoading}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              className={`${bot.bgColor} hover:opacity-90 text-white`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const [activeBot, setActiveBot] = useState('jobs');
  const [freeQuota] = useState(5);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              AI职业助手
            </h1>
            <p className="text-gray-600 text-sm">
              三大智能体协同服务，助你求职无忧
            </p>
          </div>
          <Link
            href="/membership"
            className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <span className="text-gray-600 text-sm">本月剩余免费次数：</span>
            <span className="text-lg font-bold text-[#165DFF]">{freeQuota}/5</span>
          </Link>
        </div>

        {/* 三个智能体窗口 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {bots.map((bot) => (
            <Card 
              key={bot.id} 
              className="border-2 overflow-hidden h-[600px] flex flex-col"
              style={{
                borderColor: activeBot === bot.id 
                  ? (bot.id === 'jobs' ? '#165DFF' : bot.id === 'interview' ? '#00B42A' : '#722ED1')
                  : '#e5e7eb'
              }}
            >
              <ChatWindow 
                bot={bot} 
                isActive={activeBot === bot.id}
                onActivate={() => setActiveBot(bot.id)}
              />
            </Card>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#165DFF]"></div>
            <span>全行业岗位百科 - 查询真实招聘数据</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00B42A]"></div>
            <span>模拟面试官 - AI实战演练</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#722ED1]"></div>
            <span>职业生涯规划 - 定制发展路径</span>
          </div>
        </div>
      </div>
    </div>
  );
}
