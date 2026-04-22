'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Send, User as UserIcon, Loader2, Briefcase, GraduationCap, Sparkles, AlertCircle, Crown, CheckCircle, ArrowRight, MessageCircle } from 'lucide-react';
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
  welcomeMessage: string;
  quickQuestions: string[];
  isDefault?: boolean;
  isVipOnly?: boolean;
}

const jobsWelcome = `👋 你好！我是「职途星——职搭子」，大学生专属的全行业岗位JD库助手~所有信息均来自真实招聘JD，拒绝空泛鸡汤！
✨ 我能帮你做什么：
🔍 岗位查询：直接输入「Java开发」「产品经理」「新媒体运营」「HRBP」
📍 按地点推荐：告诉我「深圳」「上海」「北京」，推荐当地岗位
💰 按薪资推荐：告诉我「10k-15k」「5k-8k」，推荐符合的岗位
🎓 按背景匹配：告诉我「计算机专业」「本科学历」，匹配适合的岗位
🔀 智能组合：多个条件组合，如「深圳薪资10k-15k」「会计专业，本科」
📚 收录500万+真实JD：覆盖互联网/金融/制造/教育/医疗等15+主流行业
💡 现在就告诉我你的需求吧！`;

const interviewWelcome = `你好呀 👋 我是职途星——你的专属AI面试官，专为全行业求职者打造，能1:1还原企业各岗位招聘的真实面试全流程体验。
面试会严格按照「简历初筛→HR初面（电话）→业务二面（部门负责人面）→高管终面→结果反馈+专属能力提升复盘」的固定顺序进行，上一环节通过后才能进入下一环节，帮你循序渐进打磨面试能力~
请你先告诉我这3个信息，我就能为你定制专属的模拟面试方案啦：
1. 你应聘的岗位全称（记得标注行业、方向和层级哦，比如：互联网行业产品经理、制造业工艺工程师、市场营销总监）
2. 该岗位的完整官方JD
3. 你的个人求职简历`;

const careerWelcome = `👋 你好！我是「职途星——你的AI职业生涯规划助手」，专为大学生打造的个性化职业规划工具，所有建议均基于全行业真实招聘数据。
✨ 我能帮你做什么：
🎯 岗位匹配：告诉我你的专业、年级和兴趣，推荐最适合你的3-5个岗位
📈 成长路径：根据目标岗位，定制大一到大四的分阶段成长计划
✅ 成功率测算：评估你应聘目标岗位的匹配度，给出针对性提升建议
📝 求职指导：解答简历、面试、校招等通用求职问题
💡 请告诉我你的专业、年级和求职意向，我来为你生成专属规划！`;

const decisionWelcome = `👋 你好！我是「职途星——考研就业决策助手」，专为大三、大四学生打造的升学就业对比工具。
✨ 我能帮你做什么：
⚖️ 利弊分析：基于你的专业、成绩和兴趣，对比考研和就业的优劣势
📅 时间规划：生成考研备考或求职准备的详细时间线
🎓 院校推荐：根据你的专业和成绩，推荐适合的考研院校和专业
💼 岗位推荐：如果选择就业，推荐最适合你的岗位和成长路径
💡 请告诉我你的专业、年级和成绩排名，我来为你生成个性化决策建议！`;

const assessmentWelcome = `👋 你好！我是「职途星——专业能力测评助手」，专注于帮助你发现能力短板并制定提升方案。
✨ 我能帮你做什么：
📊 能力测评：基于你的专业和年级，生成20道专业能力测评题
🔍 短板分析：完成测评后，精准定位你的能力薄弱环节
📝 提升建议：针对每个短板，提供具体的学习路径和资源推荐
💡 请告诉我你的专业、年级，我来为你定制专属测评方案！`;

const competencyWelcome = `👋 你好！我是「职途星——胜任力评估助手」，为你提供可视化能力雷达图和动态成长追踪。
✨ 我能帮你做什么：
📈 能力雷达图：基于职业规划、模拟面试、技能学习进度，生成可视化胜任力雷达图
🔄 动态追踪：每月自动更新一次，记录你的成长轨迹
📊 提升建议：根据评估结果，提供针对性的能力提升方案
💡 专属会员服务，需要先完成职业规划或模拟面试哦！`;

// 合规免责文案
const disclaimerText = `
---
📋 免责声明：本报告基于AI技术生成，仅供职业规划参考，不构成任何求职决策建议。所有岗位信息均来自公开招聘平台，具体要求以企业官方发布为准。`;

const bots: BotConfig[] = [
  {
    id: 'jobs',
    name: '全行业岗位百科',
    description: '15+行业岗位JD查询',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'text-[#165DFF]',
    gradient: 'from-blue-500 to-blue-600',
    welcomeMessage: jobsWelcome + disclaimerText,
    quickQuestions: [
      'Java开发工程师前景如何？',
      '产品经理需要哪些技能？',
      '算法工程师薪资水平',
      '国企vs私企怎么选？'
    ],
    isDefault: true
  },
  {
    id: 'career',
    name: 'AI职业规划',
    description: '制定专属成长路径',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-[#722ED1]',
    gradient: 'from-purple-500 to-purple-600',
    welcomeMessage: careerWelcome + disclaimerText,
    quickQuestions: [
      '计算机专业职业规划',
      '如何制定成长路径？',
      '如何提升职场竞争力',
      '职业发展路径建议'
    ]
  },
  {
    id: 'interview',
    name: 'AI模拟面试',
    description: 'AI模拟真实面试',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'text-[#00B42A]',
    gradient: 'from-green-500 to-green-600',
    welcomeMessage: interviewWelcome + disclaimerText,
    quickQuestions: [
      '帮我模拟面试HR岗位',
      '如何回答"你为什么离职"',
      '自我介绍怎么说？',
      '面试常见问题有哪些'
    ]
  },
  {
    id: 'decision',
    name: '考研就业决策',
    description: '考研vs就业对比',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-[#FF7D00]',
    gradient: 'from-orange-500 to-orange-600',
    welcomeMessage: decisionWelcome + disclaimerText,
    quickQuestions: [
      '考研真的能提升竞争力吗？',
      '文科生适合考研还是就业？',
      '计算机专业考研vs就业',
      '本科就业好还是考研好？'
    ]
  },

  {
    id: 'assessment',
    name: '专业能力测评',
    description: '20道题精准定位短板',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-[#14CA72]',
    gradient: 'from-teal-500 to-teal-600',
    welcomeMessage: assessmentWelcome + disclaimerText,
    quickQuestions: [
      '开始专业能力测评',
      '我的能力短板在哪里？',
      '如何快速提升专业能力',
      '专业能力评估报告'
    ]
  },
  {
    id: 'competency',
    name: '胜任力评估',
    description: '仅限会员使用',
    icon: <Crown className="w-5 h-5" />,
    color: 'text-gray-600',
    gradient: 'from-gray-500 to-gray-600',
    welcomeMessage: competencyWelcome + disclaimerText,
    quickQuestions: [
      '查看我的胜任力雷达图',
      '能力提升建议',
      '成长轨迹追踪',
      '本月能力评估'
    ],
    isVipOnly: true
  }
];

export default function AssistantPage() {
  const [activeBot, setActiveBot] = useState('jobs');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const { user, quota, refreshQuota } = useAuth();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentBot = bots.find(b => b.id === activeBot) || bots[0];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 检查用户个人信息状态
  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setHasProfile(false);
        return;
      }
      
      try {
        const response = await fetch('/api/user/profile', {
          headers: {
            'x-user-id': user.id.toString()
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setHasProfile(data.data?.hasProfile === true);
        }
      } catch (error) {
        console.error('检查个人信息失败:', error);
      }
    };
    
    checkProfile();
  }, [user]);

  // 初始化欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: currentBot.welcomeMessage,
        timestamp: new Date()
      }]);
    }
  }, [activeBot, currentBot.welcomeMessage]);

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

      // 判断是否是模拟面试或职搭子
      const isInterview = activeBot === 'interview';
      const isPartner = activeBot === 'partner';
      
      let apiUrl = '/api/chat';
      let requestBody: object = {
        message: messageText,
        botType: activeBot,
        conversationId: localStorage.getItem(`conversationId_${activeBot}`) || undefined
      };
      
      if (isInterview) {
        apiUrl = '/api/interview';
        requestBody = {
          message: messageText,
          sessionId: localStorage.getItem('interviewSessionId') || undefined,
          jobType: localStorage.getItem('interviewJobType') || undefined
        };
      } else if (isPartner) {
        apiUrl = '/api/partner';
        requestBody = {
          message: messageText,
          sessionId: localStorage.getItem('partnerSessionId') || undefined
        };
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
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
          if (isInterview) {
            localStorage.setItem('interviewSessionId', conversationIdMatch[1]);
          } else if (isPartner) {
            localStorage.setItem('partnerSessionId', conversationIdMatch[1]);
          } else {
            localStorage.setItem(`conversationId_${activeBot}`, conversationIdMatch[1]);
          }
        }
        
        // 确保免责文案已添加
        if (!fullContent.includes('免责声明')) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = fullContent + currentBot.welcomeMessage.split('---')[1] || '';
            return newMessages;
          });
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

  const displayQuota = quota?.interview?.unlimited ? '无限' : (quota?.interview?.remaining ?? '加载中');
  const quotaExhausted = !quota?.interview?.unlimited && (quota?.interview?.remaining ?? 0) <= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 职业规划免费提示 */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-700">
              AI职业规划永久免费
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-purple-700">
              无限次生成完整报告
            </span>
          </div>
          <Link href="/career-planning" className="text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
            立即生成
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            AI职业助手
          </h1>
          <p className="text-gray-600 text-sm">
            四大智能体协同服务，助你求职无忧
          </p>
        </div>

        {/* 智能体Tab选择器 */}
        <div className="bot-tabs mb-4">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl overflow-x-auto">
            {bots.map((bot) => (
              <button
                key={bot.id}
                onClick={() => {
                  if (bot.isVipOnly && !user?.is_vip) {
                    setShowQuotaDialog(true);
                    return;
                  }
                  handleTabChange(bot.id);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-300 flex-shrink-0 ${
                  activeBot === bot.id
                    ? `bg-gradient-to-r ${bot.gradient} text-white shadow-lg`
                    : bot.isVipOnly && !user?.is_vip
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                      : 'text-gray-600 hover:bg-white hover:shadow'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  activeBot === bot.id ? 'bg-white/20' : bot.isVipOnly ? 'bg-gray-300' : 'bg-gray-200'
                }`}>
                  {bot.icon}
                </div>
                <div className="text-left">
                  <div className={`font-semibold text-xs ${activeBot === bot.id ? 'text-white' : 'text-gray-900'}`}>
                    {bot.name}
                    {bot.isVipOnly && (
                      <span className="ml-1 text-[10px] px-1 py-0.5 bg-[#FF7D00] text-white rounded">VIP</span>
                    )}
                  </div>
                  <div className={`text-[10px] ${activeBot === bot.id ? 'text-white/80' : 'text-gray-500'} hidden md:block`}>
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
            {/* 个人信息状态提示 */}
            {hasProfile ? (
              <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>已自动读取您的个人信息，提供更精准的个性化建议</span>
              </div>
            ) : user ? (
              <div className="mb-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Sparkles className="w-4 h-4 text-[#165DFF] flex-shrink-0" />
                  <span>完善个人信息，获得更精准的AI建议</span>
                </div>
                <Link 
                  href="/profile/info"
                  className="flex items-center gap-1 text-[#165DFF] hover:text-[#165DFF]/80 font-medium"
                >
                  去填写
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : null}
            
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
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600"></div>
            <span>考研就业决策</span>
          </div>
        </div>
      </div>

      {/* 配额用完弹窗 */}
      <Dialog open={showQuotaDialog} onOpenChange={setShowQuotaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#FF7D00]" />
              AI模拟面试次数已用完
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>你的3次免费AI模拟面试机会已用完，开通会员可解锁无限次全流程模拟面试</p>
              <div className="space-y-2">
                <p className="font-medium text-gray-900">会员专属权益：</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>无限次AI模拟面试</li>
                  <li>完整版能力测评报告</li>
                  <li>胜任力评估雷达图</li>
                  <li>考研就业决策完整版</li>
                </ul>
                <div className="flex flex-col gap-2 pt-2">
                  <Link href="/membership" onClick={() => setShowQuotaDialog(false)}>
                    <Button className="w-full bg-gradient-to-r from-[#FF7D00] to-[#FF9A2E] hover:opacity-90 text-white">
                      开通会员 解锁无限次
                    </Button>
                  </Link>
                  <Link href="/profile/invite" onClick={() => setShowQuotaDialog(false)}>
                    <Button variant="outline" className="w-full">
                      邀请好友 - 每次获得3次免费次数+7天会员
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
