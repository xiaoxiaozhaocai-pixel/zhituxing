'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {Send, User as UserIcon, Loader2, Briefcase, GraduationCap, Sparkles, AlertCircle, CheckCircle, ArrowRight, Link as LinkIcon, XCircle, Paperclip, X, FileText, Video, Tv, ChevronUp, ChevronDown, Download, FileText as FileTextIcon, File, Printer, Share2, CheckSquare, Square, Trash2} from 'lucide-react';
import { AnalyticsTracker, AnalyticsEvent, usePageView } from '@/lib/analytics/tracker';
import { useAuth } from '@/hooks/useAuth';
import { useSSEStream } from '@/hooks/useSSEStream';
import AIResponseRenderer from '@/components/AIResponseRenderer';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import AgentChainStatus from '@/components/AgentChainStatus';

// 初始化 DOMPurify（组件挂载时调用）
function _initDOMPurify() {
  DOMPurify.addHook('uponSanitizeElement', (node) => {
    // 移除所有 on* 事件属性
    if (node instanceof Element) {
      for (const attr of Array.from(node.attributes)) {
        if (attr.name.toLowerCase().startsWith('on')) {
          node.removeAttribute(attr.name);
        }
      }
    }
  });
}

/** XSS 防护：清洗 HTML 内容 */
function _sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/** 过滤文本中残留的 <<DATA:type=xxx>>...<<END>> 标记（安全网） */
function stripDataMarkers(text: string): string {
  return text.replace(/<<\s*DATA\s*:\s*type\s*=\s*\w+\s*>>[\s\S]*?<<\s*END\s*>>/gi, '').trim();
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
📚 收录20,000+真实JD：覆盖互联网/金融/制造/教育/医疗等27个行业
💡 现在就告诉我你的需求吧！`;

const interviewWelcome = `👋你好！我是职途星AI面试官，将为你还原真实的企业校招全流程面试。

【面试模式选择】我们提供两种面试模式，请选择:
1. 文字面试：纯文字对话形式
2. 视频面试：AI面试官以视频形象出现，配合语音提问

请你提供以下信息:
1. 面试模式
2. 你应聘的岗位全称
3. 该岗位的完整官方JD
4. 你的个人求职简历`;

const careerWelcome = `👋 你好！我是「职途星——能力诊断+成长规划助手」，将胜任力评估与职业规划深度融合，所有建议均基于全行业真实招聘数据。

✨ **第一步：能力诊断**
📊 胜任力雷达图：从硬技能、软技能、经验匹配、教育背景四个维度精准评估你的当前能力
🔍 短板定位：自动识别你的能力薄弱环节，给出量化匹配度分数

✨ **第二步：成长规划**
🎯 岗位匹配：根据诊断结果推荐最适合你的3-5个目标岗位
📈 成长路径：基于能力短板，定制分阶段成长计划与月度里程碑
✅ 进度追踪：定期回顾能力变化，动态调整规划方向

💡 两个功能已深度融合——诊断完成自动生成成长方案，请告诉我你的专业、年级和求职意向！`;

const decisionWelcome = `👋 你好！我是「职途星——考研就业决策助手」，专为大三、大四学生打造的升学就业对比工具。
✨ 我能帮你做什么：
⚖️ 利弊分析：基于你的专业、成绩和兴趣，对比考研和就业的优劣势
📅 时间规划：生成考研备考或求职准备的详细时间线
🎓 院校推荐：根据你的专业和成绩，推荐适合的考研院校和专业
💼 岗位推荐：如果选择就业，推荐最适合你的岗位和成长路径
💡 请告诉我你的专业、年级和成绩排名，我来为你生成个性化决策建议！`;

const assessmentWelcome = `👋 你好！我是「职途星——专业能力测评助手」，你的专属AI诊断导师~

✨ 我不是来考你的，是来帮你「看清自己」的：

🧠 **自适应诊断**：题目难度跟着你的水平动态调整，不浪费你的时间
📊 **15题深度诊断**：不是随便几道题就下定论，足够样本才敢说话
🔍 **严谨定级**：宁可不给标签，也不草率吹捧；15题样本量有限，报告会诚实标注
🎯 **精准短板定位**：指出具体薄弱环节，不只说「你不够好」
🗺️ **可执行提升路径**：每个短板配具体学习建议和资源推荐
⏭️ **不卡壳**：遇到不会的直接说「不知道」或「跳过」，不尴尬

💡 告诉我你的专业方向或目标岗位，咱们开始吧~`;

// 合规免责文案
const disclaimerText = `
---
📋 免责声明：本报告基于AI技术生成，仅供职业规划参考，不构成任何求职决策建议。所有岗位信息均来自国聘网、国家24365大学生就业服务平台、中国公共招聘网、广西人才网等合规招聘平台，具体要求以企业官方发布为准。`;

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
    name: '能力诊断+成长规划',
    description: '诊断短板 + 定制成长路径',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-[#722ED1]',
    gradient: 'from-purple-500 to-purple-600',
    welcomeMessage: careerWelcome + disclaimerText,
    quickQuestions: [
      '生成我的胜任力诊断报告',
      '计算机专业职业规划',
      '我的能力短板在哪里？',
      '如何提升职场竞争力'
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

];

export default function AssistantPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#165DFF]" />
      </div>
    }>
      <AssistantContent />
    </Suspense>
  );
}

function AssistantContent() {
  const searchParams = useSearchParams();
  const [activeBot, setActiveBot] = useState('jobs');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [quotaFeature, setQuotaFeature] = useState<string>('');
  // 导出功能状态
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  // 选择消息模式
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  // 分享链接状态
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [jdUrl, setJdUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [jdLoading, setJdLoading] = useState(false);
  const [tabsCollapsed, setTabsCollapsed] = useState(false);
  const [jdError, setJdError] = useState('');
  
  // 登录弹窗状态
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // 面试模式状态
  const [interviewMode, setInterviewMode] = useState<'text' | 'video' | null>(null);
  
  // 文件上传状态
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user, quota, refreshQuota } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isUserNearBottomRef = useRef(true);
  
  // 待发送的 query 参数（从 URL 解析）
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  // 待发送的 jobId（岗位百科深度优化跳转携带）
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);

  // SSE流式解析hook
  const [_streamState, streamActions] = useSSEStream();

  const currentBot = bots.find(b => b.id === activeBot) || bots[0];

  // 平滑滚动到底部（仅在用户接近底部时）
  const scrollToBottom = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    
    // 只在用户接近底部时自动滚动（阈值100px）
    const threshold = 100;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isUserNearBottomRef.current = distanceFromBottom < threshold;
    
    if (isUserNearBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // 检测用户是否主动向上滚动
  const handleChatScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const threshold = 100;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isUserNearBottomRef.current = distanceFromBottom < threshold;
  }, []);

  // 消息更新时滚动（使用requestAnimationFrame防抖）
  useEffect(() => {
    if (messages.length > 1) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
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
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setHasProfile(!!(data.data?.major || data.data?.grade));
        }
      } catch (error) {
        console.error('检查个人信息失败:', error);
      }
    };
    
    checkProfile();
  }, [user]);

  // 埋点：页面浏览 + tracker初始化
  usePageView('assistant', { bot_type: activeBot });

  // 初始化 AnalyticsTracker
  useEffect(() => {
    if (user) {
      const membershipType = ('membershipType' in user ? String((user as Record<string, unknown>).membershipType) : 'free');
      AnalyticsTracker.init({ userId: user.id, membershipType });
    } else {
      AnalyticsTracker.init();
    }
    return () => { AnalyticsTracker.destroy(); };
  }, [user]);

  // 按 bot 缓存对话历史（本次浏览器会话内切换 tab 不丢失对话）
  const messagesRef = useRef<Message[]>([]);
  const historyRef = useRef<Record<string, Message[]>>({});
  const prevBotRef = useRef<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 切换 bot 时：先保存当前 bot 的对话，再恢复目标 bot 的对话（无则插入欢迎消息）
  useEffect(() => {
    const oldBot = prevBotRef.current;

    // 保存上一个 bot 的对话（仅当真的切换且内容不为空）
    if (oldBot && oldBot !== activeBot && messagesRef.current.length > 0) {
      historyRef.current[oldBot] = messagesRef.current;
      try {
        sessionStorage.setItem(`chat_${oldBot}`, JSON.stringify(messagesRef.current));
      } catch {
        // 忽略 quota 超限等错误
      }
    }

    // 恢复目标 bot 的对话：先看内存，再看 sessionStorage
    let restored = historyRef.current[activeBot];
    if (!restored) {
      try {
        const stored = sessionStorage.getItem(`chat_${activeBot}`);
        if (stored) {
          const parsed: Message[] = JSON.parse(stored).map((m: Message & { timestamp: string | Date }) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }));
          if (parsed.length > 0) {
            restored = parsed;
            historyRef.current[activeBot] = parsed;
          }
        }
      } catch {
        // 忽略反序列化错误
      }
    }

    if (restored && restored.length > 0) {
      setMessages(restored);
    } else {
      const newBot = bots.find(b => b.id === activeBot) || bots[0];
      setMessages([{
        role: 'assistant',
        content: newBot.welcomeMessage,
        timestamp: new Date(),
      }]);
    }

    prevBotRef.current = activeBot;
  }, [activeBot]);

  // 持续同步当前 bot 的对话到 sessionStorage（防止页面刷新丢失）
  // 只在 isLoading 结束时保存（避免流式过程中每个 token 都序列化全部消息导致卡死）
  const prevIsLoading = useRef(isLoading);
  useEffect(() => {
    // 从 loading -> 非 loading，说明一轮对话完成，此时保存
    if (prevIsLoading.current && !isLoading && messages.length > 1) {
      try {
        sessionStorage.setItem(`chat_${activeBot}`, JSON.stringify(messages));
      } catch {
        // 忽略存储错误
      }
    }
    prevIsLoading.current = isLoading;
  }, [isLoading, messages, activeBot]);

  // 解析 URL 参数：bot + query（只执行一次）
  useEffect(() => {
    const bot = searchParams.get('bot');
    if (bot && !pendingQuery) {
      const validBots = ['jobs', 'interview', 'career', 'decision', 'assessment'];
      if (validBots.includes(bot)) {
        // 切换 activeBot 会触发 useEffect 自动加载该 bot 的历史对话或欢迎消息
        setActiveBot(bot);
      }
    }
    const query = searchParams.get('query');
    if (query && !pendingQuery) {
      setPendingQuery(query);
    }
    const jobId = searchParams.get('jobId');
    if (jobId && !pendingJobId) {
      setPendingJobId(jobId);
    }
  }, [searchParams, pendingQuery, pendingJobId]);

  // 解析JD链接
  const handleFetchJd = async (url: string) => {
    if (!url.trim()) return;
    setJdUrl(url);
    setJdError('');
    setJdLoading(true);
    try {
      const res = await fetch('/api/fetch-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (data.code === 200 && data.data?.content) {
        setJdText(data.data.content);
        setInputValue(prev => prev + (prev ? '\n\n' : '') + `[已解析的岗位JD内容]\n${data.data.content}\n[/已解析的岗位JD内容]\n\n`);
      } else {
        setJdError('该链接无法自动解析，请手动粘贴岗位描述');
        setJdText('');
      }
    } catch {
      setJdError('该链接无法自动解析，请手动粘贴岗位描述');
      setJdText('');
    } finally {
      setJdLoading(false);
    }
  };

  // 文件上传处理
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 文件大小检查（10MB）
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('文件大小不能超过10MB');
      return;
    }
    
    // 支持的文件格式（白名单）
    const supportedFormats = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!supportedFormats.includes(fileExt)) {
      toast.error('支持的格式：PDF、DOC、DOCX、TXT、JPG、PNG、GIF');
      return;
    }
    
    // MIME 类型白名单校验（额外安全层）
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];
    if (file.type && !allowedMimeTypes.includes(file.type)) {
      toast.error('文件类型不支持');
      return;
    }
    
    try {
      // 读取文件内容
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setUploadedFile({ name: file.name, content: content.slice(0, 5000) }); // 限制内容长度
        toast.success(`已上传：${file.name}`);
      };
      reader.onerror = () => {
        toast.error('文件读取失败');
      };
      
      // 根据文件类型选择读取方式
      if (['.txt'].includes(fileExt)) {
        reader.readAsText(file);
      } else {
        // PDF/DOCX 等，尝试作为文本读取（可能乱码，但能提取部分内容）
        reader.readAsText(file);
      }
    } catch {
      toast.error('文件处理失败');
    }
    
    // 清空 input，允许重复上传同一文件
    e.target.value = '';
  };

  // 删除已上传文件
  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  // 面试模式选择处理
  const handleInterviewModeSelect = (mode: 'text' | 'video') => {
    if (mode === 'video') {
      toast.info('视频面试功能即将上线，敬请期待！');
      return;
    }
    setInterviewMode(mode);
    // 添加系统提示消息
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '✅ 已进入文字面试模式\n\n请提供以下信息开始面试：\n1. 您应聘的岗位名称\n2. 岗位JD（可直接粘贴或上传文件）\n3. 您的简历（可选）\n\n我将以专业面试官的身份，为您模拟真实面试场景。',
      timestamp: new Date()
    }]);
  };

  // 退出面试模式
  const handleExitInterviewMode = () => {
    setInterviewMode(null);
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    // ============================================================
    // 问题1修复：先检查登录状态，未登录则弹出登录弹窗
    // ============================================================
    try {
      const meResponse = await fetch('/api/auth/me');
      const meData = await meResponse.json();
      
      if (!meData.ok) {
        // 未登录，弹出登录弹窗
        setShowLoginModal(true);
        return;
      }
    } catch {
      // 网络错误，也弹出登录弹窗
      setShowLoginModal(true);
      return;
    }

    // ============================================================
    // 问题4修复：如果有上传文件，拼接文件内容
    // ============================================================
    let finalMessage = messageText;
    if (uploadedFile) {
      finalMessage = `【上传文件：${uploadedFile.name}】\n${uploadedFile.content}\n\n【用户消息】\n${messageText}`;
      // 发送后清空文件
      setUploadedFile(null);
    }

    const userMessage: Message = {
      role: 'user',
      content: finalMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // 埋点：发送对话消息
    AnalyticsTracker.track(AnalyticsEvent.CHAT_SEND, {
      bot_type: activeBot,
      message_length: finalMessage.length,
    });

    try {
      const meResponse = await fetch('/api/auth/me');
      const meData = await meResponse.json();
      const userId = meData.ok ? meData.data?.user?.id ?? null : null;
      
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
      // 使用 null 替代 undefined，避免 JSON.stringify 丢失字段
      const storedConvId = localStorage.getItem(`conversationId_${activeBot}`);
      // 岗位百科深度优化跳转：携带 jobId（仅首条消息，发后清空）
      const jobIdToSend = pendingJobId;
      if (jobIdToSend) setPendingJobId(null);
      let requestBody: object = {
        message: messageText,
        botType: activeBot,
        conversationId: storedConvId || null,
        jobId: jobIdToSend || null,
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

      // 契约化：配额耗尽走 jsonError → 429 + { ok:false, error:{ code:'QUOTA_EXCEEDED', ... } }
      // 同时兼容 /api/interview / /api/partner 旧 403 + { error:'quota_exceeded' } 格式
      if (response.status === 429 || response.status === 403) {
        const data = await response.json().catch(() => null);
        const isQuotaExceeded =
          (data?.ok === false && data?.error?.code === 'QUOTA_EXCEEDED') ||
          data?.error === 'quota_exceeded';
        if (isQuotaExceeded) {
          refreshQuota();
          setShowQuotaDialog(true);
          setMessages(prev => prev.slice(0, -1));
          setIsLoading(false);
          return;
        }
      }

      if (!response.ok) {
        throw new Error(`请求失败 (${response.status})`);
      }

      // 创建空的助手消息占位
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // 使用SSE流式解析hook
      streamActions.reset();
      
      // 监听流式内容变化，更新消息
      const _originalStartStream = streamActions.startStream;
      
      // 手动处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取AI响应');
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      let sseBuffer = '';
      const firstTokenTimer = setTimeout(() => {
        // 15秒未收到第一个token
        setMessages(prev => {
          const newMsgs = [...prev];
          const last = newMsgs[newMsgs.length - 1];
          if (last && last.role === 'assistant' && !last.content) {
            newMsgs[newMsgs.length - 1] = { ...last, content: '🤔 AI正在思考，请耐心等待...' };
          }
          return newMsgs;
        });
      }, 15000);

      const timeoutTimer = setTimeout(() => {
        // 30秒超时
        setMessages(prev => {
          const newMsgs = [...prev];
          const last = newMsgs[newMsgs.length - 1];
          if (last && last.role === 'assistant') {
            if (!last.content || last.content.includes('AI正在思考')) {
              newMsgs[newMsgs.length - 1] = { 
                ...last, 
                content: '⏱️ 请求超时，请点击重试。如持续超时，请检查网络后稍后再试。' 
              };
            }
          }
          return newMsgs;
        });
        setIsLoading(false);
        reader.cancel().catch(() => {});
      }, 30000);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            clearTimeout(firstTokenTimer);
            clearTimeout(timeoutTimer);
            break;
          }

          sseBuffer += decoder.decode(value, { stream: true });

          // 按 \n\n 分割SSE事件
          const events = sseBuffer.split('\n\n');
          sseBuffer = events.pop() ?? '';

          for (const event of events) {
            if (!event.trim()) continue;

            let eventType = 'message';
            let dataLine = '';

            for (const line of event.split('\n')) {
              if (line.startsWith('event:')) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                dataLine = line.slice(5).trim();
              }
            }

            if (!dataLine) continue;

            // 结构化数据事件 — 追加到消息文本中，由AIResponseRenderer统一渲染
            if (eventType === 'structured_data') {
              try {
                const parsed = JSON.parse(dataLine);
                if (parsed.type && parsed.data) {
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    const last = newMsgs[newMsgs.length - 1];
                    if (last && last.role === 'assistant') {
                      // 将结构化数据以JSON块形式追加到文本末尾，AIResponseRenderer会自动解析
                      newMsgs[newMsgs.length - 1] = {
                        ...last,
                        content: last.content + '\n\n' + JSON.stringify({ type: parsed.type, ...parsed.data }),
                      };
                    }
                    return newMsgs;
                  });
                }
              } catch {
                // 忽略解析错误
              }
              continue;
            }

            // conversation_id 事件 — 保存到 localStorage 供后续请求使用
            if (eventType === 'conversation_id') {
              try {
                const parsed = JSON.parse(dataLine);
                if (parsed.conversation_id) {
                  localStorage.setItem(`conversationId_${activeBot}`, parsed.conversation_id);
                  console.log('[chat] Saved conversationId:', parsed.conversation_id, 'for bot:', activeBot);
                }
              } catch {
                // 忽略解析错误
              }
              continue;
            }

            // 检查 [DONE] 标记
            if (dataLine === '[DONE]') {
              clearTimeout(firstTokenTimer);
              clearTimeout(timeoutTimer);
              break;
            }

            try {
              const parsed = JSON.parse(dataLine);

              // ============================================================
              // 优先解析 OpenAI 流式格式 {choices:[{delta:{content:'xxx'}}]}
              // ============================================================
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                const content = parsed.choices[0].delta.content;
                clearTimeout(firstTokenTimer);
                clearTimeout(timeoutTimer);
                fullContent += content;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const last = newMsgs[newMsgs.length - 1];
                  if (last && last.role === 'assistant') {
                    newMsgs[newMsgs.length - 1] = { ...last, content: fullContent };
                  }
                  return newMsgs;
                });
                continue;
              }

              // ============================================================
              // 兼容旧格式：{type:'text', content:'xxx'}
              // ============================================================
              if (parsed.type === 'text' && parsed.content) {
                // 过滤 [DONE] 标记
                const cleanContent = parsed.content.replace(/\[DONE\]/gi, '');
                if (!cleanContent) continue;
                
                clearTimeout(firstTokenTimer);
                clearTimeout(timeoutTimer);
                fullContent += cleanContent;
                const displayContent = stripDataMarkers(fullContent);
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { 
                    ...newMsgs[newMsgs.length - 1], 
                    content: displayContent 
                  };
                  return newMsgs;
                });
              } else if (parsed.type === 'done') {
                clearTimeout(firstTokenTimer);
                clearTimeout(timeoutTimer);
              } else if (parsed.type === 'error') {
                clearTimeout(firstTokenTimer);
                clearTimeout(timeoutTimer);
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const last = newMsgs[newMsgs.length - 1];
                  if (last && last.role === 'assistant' && (!last.content || last.content.includes('AI正在思考'))) {
                    newMsgs[newMsgs.length - 1] = { 
                      ...last, 
                      content: `❌ ${parsed.message || 'AI生成出错，请重试'}` 
                    };
                  }
                  return newMsgs;
                });
              }
            } catch {
              // 兼容非JSON纯文本
              if (dataLine && !dataLine.startsWith('{')) {
                // 过滤 [DONE] 标记
                const cleanData = dataLine.replace(/\[DONE\]/gi, '');
                if (!cleanData.trim()) continue;
                
                clearTimeout(firstTokenTimer);
                clearTimeout(timeoutTimer);
                fullContent += cleanData;
                const displayContent = stripDataMarkers(fullContent);
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { 
                    ...newMsgs[newMsgs.length - 1], 
                    content: displayContent 
                  };
                  return newMsgs;
                });
              }
            }
          }
        }
      } finally {
        clearTimeout(firstTokenTimer);
        clearTimeout(timeoutTimer);
        try { reader.releaseLock(); } catch { /* ignore */ }
      }

      // 保存conversationId
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
      if (fullContent && !fullContent.includes('免责声明')) {
        const disclaimer = currentBot.welcomeMessage.split('---')[1] || '';
        if (disclaimer) {
          setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1] = { 
              ...newMsgs[newMsgs.length - 1], 
              content: fullContent + disclaimer 
            };
            return newMsgs;
          });
        }
      }
    } catch {
      setMessages(prev => {
        const newMsgs = [...prev];
        const last = newMsgs[newMsgs.length - 1];
        if (last && last.role === 'assistant') {
          newMsgs[newMsgs.length - 1] = { 
            ...last, 
            content: last.content || '❌ 生成失败，请检查网络后重试' 
          };
        }
        return newMsgs;
      });
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

  // 处理 pendingQuery（从 URL 解析的岗位分析请求）
  useEffect(() => {
    if (pendingQuery && !isLoading && messages.length > 0) {
      const queryToSend = pendingQuery;
      setPendingQuery(null); // 清空，只发送一次
      setTimeout(() => {
        sendMessage(queryToSend);
      }, 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuery, isLoading, messages.length]);

  // 清空当前 bot 对话
  const handleClearMessages = () => {
    const bot = activeBot;
    // 清空 sessionStorage
    try { sessionStorage.removeItem(`chat_${bot}`); } catch {}
    // 清空内存缓存
    delete historyRef.current[bot];
    // 重置为欢迎消息
    const currentBot = bots.find(b => b.id === bot) || bots[0];
    setMessages([{
      role: 'assistant',
      content: currentBot.welcomeMessage,
      timestamp: new Date(),
    }]);
    setShowClearConfirm(false);
  };

  const handleTabChange = (botId: string) => {
    // 切换 bot：上面的 useEffect 会自动保存当前对话并恢复目标 bot 的历史
    // 不再清除 conversationId，这样切回来还能续接同一会话
    setActiveBot(botId);
    // 切换Tab时重置聊天区域滚动位置
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = 0;
      }
    });
  };

  // ===== 导出对话功能 =====
  const EXPORT_DAILY_LIMIT = 3;
  
  function getExportKey(): string {
    return `export_count_${new Date().toISOString().slice(0, 10)}`;
  }
  
  function getTodayExportCount(): number {
    try {
      const count = localStorage.getItem(getExportKey());
      return count ? parseInt(count, 10) : 0;
    } catch { return 0; }
  }
  
  function incrementExportCount(): void {
    try {
      const key = getExportKey();
      const count = getTodayExportCount() + 1;
      localStorage.setItem(key, String(count));
    } catch { /* ignore */ }
  }
  
  function getRemainingExports(): number {
    const isMember = quota?.is_member || quota?.is_lifetime_member;
    if (isMember) return 999; // 会员无限
    return Math.max(0, EXPORT_DAILY_LIMIT - getTodayExportCount());
  }
  
  function messagesToMarkdown(): string {
    const botName = currentBot.name;
    const date = new Date().toLocaleString('zh-CN');
    let md = `# 职途星 - ${botName} 对话记录\n\n`;
    md += `> 导出时间：${date}\n\n`;
    md += `---\n\n`;
    
    for (const msg of messages) {
      if (msg.role === 'user') {
        md += `### 🧑 你\n\n${msg.content}\n\n`;
      } else {
        md += `### 🤖 ${botName}\n\n${msg.content}\n\n`;
      }
      md += `---\n\n`;
    }
    
    md += `\n> 由 [职途星](https://zhituxing.tech) 生成 · 内容由AI生成，仅供参考\n`;
    return md;
  }
  
  function messagesToHtml(msgs?: Message[]): string {
    const effective = msgs || messages;
    const botName = currentBot.name;
    const date = new Date().toLocaleString('zh-CN');
    let html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">`;
    html += `<title>职途星 - ${botName} 对话记录</title>`;
    html += `<style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; line-height: 1.8; }
      h1 { color: #165DFF; border-bottom: 2px solid #165DFF; padding-bottom: 10px; }
      .meta { color: #999; font-size: 14px; margin-bottom: 30px; }
      .user { background: #f0f5ff; padding: 16px 20px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #165DFF; }
      .bot { background: #f8fafd; padding: 16px 20px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #00B42A; }
      .role { font-weight: bold; font-size: 14px; margin-bottom: 8px; }
      .user .role { color: #165DFF; }
      .bot .role { color: #00B42A; }
      .content { white-space: pre-wrap; word-break: break-word; }
      .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 13px; text-align: center; }
      .footer a { color: #165DFF; }
      @media print { body { max-width: 100%; } }
    </style></head><body>`;
    html += `<h1>职途星 - ${botName} 对话记录</h1>`;
    html += `<p class="meta">导出时间：${date}</p>`;
    
    for (const msg of effective) {
      const content = msg.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code>$1</code>');
      
      if (msg.role === 'user') {
        html += `<div class="user"><div class="role">🧑 你</div><div class="content">${content}</div></div>`;
      } else {
        html += `<div class="bot"><div class="role">🤖 ${botName}</div><div class="content">${content}</div></div>`;
      }
    }
    
    html += `<div class="footer"><p>由 <a href="https://zhituxing.tech">职途星</a> 生成 · 内容由AI生成，仅供参考</p></div>`;
    html += `</body></html>`;
    return html;
  }
  
  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  const handleExport = async (format: 'md' | 'docx' | 'pdf') => {
    setShowExportMenu(false);
    
    // 检查配额
    const remaining = getRemainingExports();
    if (remaining <= 0 && !quota?.is_member && !quota?.is_lifetime_member) {
      setQuotaFeature('导出对话');
      setShowQuotaDialog(true);
      return;
    }
    
    setExportLoading(true);
    const botName = currentBot.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    
    try {
      if (format === 'md') {
        const md = messagesToMarkdown();
        downloadFile(md, `职途星_${botName}_${dateStr}.md`, 'text/markdown;charset=utf-8');
      } else if (format === 'docx') {
        const html = messagesToHtml();
        downloadFile(html, `职途星_${botName}_${dateStr}.doc`, 'application/msword;charset=utf-8');
      } else if (format === 'pdf') {
        // PDF：在新窗口打开美化版本，触发打印
        const html = messagesToHtml();
        const w = window.open('', '_blank');
        if (w) {
          w.document.write(html);
          w.document.close();
          w.onload = () => {
            w.print();
          };
        }
      }
      
      // 非会员扣减次数
      if (!quota?.is_member && !quota?.is_lifetime_member) {
        incrementExportCount();
      }
      
      toast.success(`已导出为 ${format.toUpperCase()} 格式`);
    } catch {
      toast.error('导出失败，请重试');
    } finally {
      setExportLoading(false);
    }
  };

  // 获取要导出/分享的消息（选择模式下只取勾选的，否则取全部）
  function getEffectiveMessages(): Message[] {
    if (selectMode && selectedIndices.size > 0) {
      return messages.filter((_, i) => selectedIndices.has(i));
    }
    return messages.filter(m => m.role !== 'assistant' || !m.content.startsWith('👋'));
  }
  
  // 选择模式辅助函数
  const toggleSelectMode = () => {
    if (selectMode) {
      setSelectMode(false);
      setSelectedIndices(new Set());
    } else {
      setSelectMode(true);
      // 默认全选（排除欢迎消息）
      const indices = new Set<number>();
      messages.forEach((m, i) => {
        if (!(m.role === 'assistant' && i === 0 && m.content.startsWith('👋'))) {
          indices.add(i);
        }
      });
      setSelectedIndices(indices);
    }
  };
  
  const toggleMessage = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };
  
  const _selectAllMessages = () => {
    const indices = new Set<number>();
    messages.forEach((m, i) => {
      if (!(m.role === 'assistant' && i === 0)) {
        indices.add(i);
      }
    });
    setSelectedIndices(indices);
  };
  
  // 生成分享链接
  const handleShare = async () => {
    setShowExportMenu(false);
    const effectiveMsgs = getEffectiveMessages();
    if (effectiveMsgs.length === 0) return;
    
    // 检查配额
    const remaining = getRemainingExports();
    if (remaining <= 0 && !quota?.is_member && !quota?.is_lifetime_member) {
      setQuotaFeature('分享对话');
      setShowQuotaDialog(true);
      return;
    }
    
    setShareLoading(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botName: currentBot.name,
          botGradient: currentBot.gradient,
          messages: effectiveMsgs.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShareUrl(data.url);
        if (!quota?.is_member && !quota?.is_lifetime_member) {
          incrementExportCount();
        }
      } else {
        toast.error(data.error || '生成分享链接失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setShareLoading(false);
    }
  };
  
  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      toast.success('链接已复制，发送给朋友即可查看');
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const _displayQuota = quota?.interview?.unlimited ? '无限' : (quota?.interview?.remaining ?? '加载中');
  const _quotaExhausted = !quota?.interview?.unlimited && (quota?.interview?.remaining ?? 0) <= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 职业规划免费提示 */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-700">
              AI职业规划永久免费
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-purple-700">
              无限次生成完整报告
            </span>
          </div>
          <Link href="/growth" className="text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
            立即生成
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <AgentChainStatus />
        {/* 页面标题 + 导出按钮 */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              AI职业助手
            </h1>
            <p className="text-gray-600 text-sm">
              七大AI能力协同服务，助你求职无忧
            </p>
          </div>
          
          {/* 操作按钮组（有对话内容时显示） */}
          {messages.length > 1 && (
            <div className="flex items-center gap-2">
              {/* 选择消息按钮 */}
              <button
                onClick={toggleSelectMode}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-all ${
                  selectMode
                    ? 'bg-[#165DFF] text-white border-[#165DFF]'
                    : 'text-gray-600 bg-white border-gray-200 hover:border-[#165DFF] hover:text-[#165DFF] hover:bg-blue-50'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                {selectMode ? `已选 ${selectedIndices.size}` : '选择消息'}
              </button>
              {/* 清空消息按钮 */}
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                清空消息
              </button>
              
              {/* 导出按钮 */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exportLoading || shareLoading}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-[#165DFF] hover:text-[#165DFF] hover:bg-blue-50 transition-all disabled:opacity-50"
                >
                  {exportLoading || shareLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  导出/分享
                  <span className="text-xs text-gray-400 ml-1">
                    ({quota?.is_member ? '无限' : `${getRemainingExports()}/3`})
                  </span>
                  {!quota?.is_member && (
                    <span className="text-[10px] text-gray-400 ml-0.5" title="每日0点重置">每日</span>
                  )}
                </button>
                
                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                      {/* 分享链接 */}
                      <button
                        onClick={handleShare}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Share2 className="w-4 h-4 text-green-500" />
                        生成分享链接
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => handleExport('md')}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <FileTextIcon className="w-4 h-4 text-blue-500" />
                        导出 Markdown
                      </button>
                      <button
                        onClick={() => handleExport('docx')}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <File className="w-4 h-4 text-blue-600" />
                        导出 Word 文档
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Printer className="w-4 h-4 text-red-500" />
                        导出 PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 功能Tab选择器 — 可折叠 */}
        <div className="bot-tabs mb-4">
          {/* 折叠按钮 */}
          <button
            onClick={() => setTabsCollapsed(!tabsCollapsed)}
            className="w-full flex items-center justify-center gap-1 py-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-1"
          >
            {tabsCollapsed ? (
              <><ChevronDown className="w-3.5 h-3.5" /><span>展开功能列表</span></>
            ) : (
              <><ChevronUp className="w-3.5 h-3.5" /><span>收起功能列表</span></>
            )}
          </button>
          
          {/* 展开模式：完整Tab */}
          {!tabsCollapsed && (
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl overflow-x-auto">
              {bots.map((bot) => (
                <button
                  key={bot.id}
                  onClick={() => {
                    if (bot.isVipOnly && !quota?.is_member) {
                      setQuotaFeature(bot.name);
                      setShowQuotaDialog(true);
                      return;
                    }
                    handleTabChange(bot.id);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-300 flex-shrink-0 ${
                    activeBot === bot.id
                      ? `bg-gradient-to-r ${bot.gradient} text-white shadow-lg`
                      : bot.isVipOnly && !quota?.is_member
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
          )}

          {/* 折叠模式：紧凑图标栏 */}
          {tabsCollapsed && (
            <div className="flex gap-1.5 p-1.5 bg-gray-100 rounded-xl overflow-x-auto">
              {bots.map((bot) => (
                <button
                  key={bot.id}
                  onClick={() => {
                    if (bot.isVipOnly && !quota?.is_member) {
                      setQuotaFeature(bot.name);
                      setShowQuotaDialog(true);
                      return;
                    }
                    handleTabChange(bot.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 flex-shrink-0 ${
                    activeBot === bot.id
                      ? `bg-gradient-to-r ${bot.gradient} text-white shadow`
                      : bot.isVipOnly && !quota?.is_member
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                        : 'text-gray-600 hover:bg-white hover:shadow'
                  }`}
                  title={bot.description}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    activeBot === bot.id ? 'bg-white/20' : bot.isVipOnly ? 'bg-gray-300' : 'bg-gray-200'
                  }`}>
                    {bot.icon}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${activeBot === bot.id ? 'text-white' : 'text-gray-700'}`}>
                    {bot.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 聊天区域 */}
        <Card className={`border-2 overflow-hidden flex flex-col mb-6 transition-all duration-300 ${tabsCollapsed ? "h-[calc(100vh-14rem)] max-h-[calc(100vh-8rem)]" : "h-[calc(100vh-18rem)] max-h-[calc(100vh-12rem)]"} min-h-[500px]`} style={{
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
                    disabled={isLoading}
                    className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 消息列表 */}
          <div 
            ref={chatContainerRef}
            onScroll={handleChatScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-gray-50 to-white min-h-[200px]"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* 选择模式下的勾选框 */}
                {selectMode && (
                  <button
                    onClick={() => toggleMessage(index)}
                    className="flex-shrink-0 mt-3 text-gray-400 hover:text-[#165DFF] transition-colors"
                  >
                    {selectedIndices.has(index) ? (
                      <CheckSquare className="w-5 h-5 text-[#165DFF]" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                )}
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
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    <AIResponseRenderer
                      rawText={msg.content}
                      streaming={index === messages.length - 1 && isLoading}
                      role="assistant"
                    />
                  )}
                  {/* 加载动画 */}
                  {index === messages.length - 1 && isLoading && !msg.content && msg.role !== 'user' && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span className="text-xs">AI正在生成...</span>
                    </div>
                  )}
                  {/* 超时重试 */}
                  {msg.content.includes('请求超时') && (
                    <button
                      onClick={() => sendMessage(msg.content.replace('[超时] ', '').replace('请求超时，请重试', '').trim())}
                      className="mt-2 px-4 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      重新生成
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* ============================================================ */}
          {/* 问题2修复：面试模式选择 UI */}
          {/* ============================================================ */}
          {activeBot === 'interview' && !interviewMode && messages.length <= 1 && (
            <div className="p-4 border-b bg-gradient-to-r from-green-50 to-white">
              <p className="text-sm font-medium text-gray-700 mb-3">选择面试模式：</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleInterviewModeSelect('text')}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-green-500 hover:text-white rounded-xl transition-all disabled:opacity-50 group"
                >
                  <FileText className="w-5 h-5 text-gray-500 group-hover:text-white" />
                  <span className="font-medium">文字面试</span>
                </button>
                <button
                  onClick={() => handleInterviewModeSelect('video')}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-green-500 hover:text-white rounded-xl transition-all disabled:opacity-50 group"
                >
                  <Video className="w-5 h-5 text-gray-500 group-hover:text-white" />
                  <span className="font-medium">视频面试</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full group-hover:bg-white/20 group-hover:text-white">即将上线</span>
                </button>
              </div>
            </div>
          )}

          {/* 面试模式已选中提示 */}
          {activeBot === 'interview' && interviewMode && (
            <div className="px-4 py-2 bg-green-50 border-b border-green-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span>当前模式：<strong>{interviewMode === 'text' ? '文字面试' : '视频面试'}</strong></span>
              </div>
              <button
                onClick={handleExitInterviewMode}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                退出
              </button>
            </div>
          )}

          {/* 粘贴JD链接 */}
          {(activeBot === 'interview' || activeBot === 'jd_assistant') && (
            <div className="px-4 pb-2 bg-white/80 backdrop-blur-sm">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={jdUrl}
                  onChange={e => setJdUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleFetchJd(jdUrl)}
                  placeholder="粘贴招聘链接，自动解析岗位JD"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleFetchJd(jdUrl)}
                  disabled={isLoading || !jdUrl.trim()}
                  className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-1"
                >
                  {jdLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LinkIcon className="w-4 h-4" />
                  )}
                  解析JD
                </button>
                {jdUrl && !jdLoading && (
                  <button
                    onClick={() => { setJdUrl(''); setJdText(''); setJdError(''); }}
                    className="px-2 py-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="清除"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              {jdError && (
                <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {jdError}
                </p>
              )}
              {jdText && !jdError && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  JD已解析，内容已附加到输入框
                </p>
              )}
            </div>
          )}

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
                  href="/profile/info?from=/assistant"
                  className="flex items-center gap-1 text-[#165DFF] hover:text-[#165DFF]/80 font-medium"
                >
                  去填写
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : null}
            
            {/* 未登录提示条 */}
            {!user && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">登录后可保存对话记录和获取个性化推荐</span>
                </div>
                <Link href="/auth">
                  <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100">
                    立即登录
                  </Button>
                </Link>
              </div>
            )}
            
            <div className="flex gap-3">
              {/* ============================================================ */}
              {/* 问题4修复：文件上传按钮 */}
              {/* ============================================================ */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex-shrink-0 w-12 h-12 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50"
                title="上传文件（PDF/DOC/TXT/图片）"
              >
                <Paperclip className="w-5 h-5 text-gray-400 hover:text-blue-500" />
              </button>
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
            
            {/* 已上传文件显示 */}
            {uploadedFile && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <Paperclip className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-700 truncate max-w-[200px]">{uploadedFile.name}</span>
                <button
                  onClick={handleRemoveFile}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <p className="text-xs text-gray-400 mt-2 text-center">
              AI 辅助建议，仅供参考
            </p>
          </div>
        </Card>

        {/* 底部提示 */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
          <button
            onClick={() => handleTabChange('jobs')}
            className="flex items-center gap-2 hover:text-[#165DFF] transition-colors cursor-pointer"
          >
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <span>全行业岗位百科</span>
          </button>
          <button
            onClick={() => handleTabChange('interview')}
            className="flex items-center gap-2 hover:text-[#00B42A] transition-colors cursor-pointer"
          >
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600"></div>
            <span>模拟面试官</span>
          </button>
          <button
            onClick={() => handleTabChange('career')}
            className="flex items-center gap-2 hover:text-[#722ED1] transition-colors cursor-pointer"
          >
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"></div>
            <span>职业生涯规划</span>
          </button>
          <button
            onClick={() => handleTabChange('decision')}
            className="flex items-center gap-2 hover:text-[#FF7D00] transition-colors cursor-pointer"
          >
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600"></div>
            <span>考研就业决策</span>
          </button>
        </div>
      </div>

      {/* 清空消息确认弹窗 */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              清空对话
            </DialogTitle>
            <DialogDescription>
              清空后无法恢复，确定要清空当前对话历史吗？
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              取消
            </Button>
            <Button
              onClick={handleClearMessages}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              确认清空
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 配额用完弹窗 */}
      {/* 分享链接弹窗 */}
      <Dialog open={!!shareUrl} onOpenChange={() => setShareUrl(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-green-500" />
              分享链接已生成
            </DialogTitle>
            <DialogDescription>
              将此链接发送给朋友，对方无需登录即可查看对话内容
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
              <input
                readOnly
                value={shareUrl || ''}
                className="flex-1 text-sm bg-transparent outline-none text-gray-700"
              />
              <Button
                onClick={copyShareLink}
                className="bg-gradient-to-r from-[#165DFF] to-[#0E4FD9] hover:opacity-90 text-white h-9 px-4 text-sm flex-shrink-0"
              >
                {shareCopied ? '已复制 ✓' : '复制链接'}
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              💡 提示：分享链接包含当前对话的完整内容，对方可在浏览器中查看
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showQuotaDialog} onOpenChange={setShowQuotaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#FF7D00]" />
              {quotaFeature || 'VIP功能'}需要会员权限
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>你正在尝试使用「{quotaFeature || 'VIP功能'}」，该功能仅对会员开放。开通会员可解锁全部高级功能。</p>
              <div className="space-y-2">
                <p className="font-medium text-gray-900">会员专属权益：</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>无限次AI模拟面试</li>
                  <li>完整版能力测评报告</li>
                  <li>胜任力评估雷达图</li>
                  <li>考研就业决策完整版</li>
                  <li>AI职业规划完整版</li>
                </ul>
                <div className="flex flex-col gap-2 pt-2">
                  <Link href="/membership" onClick={() => setShowQuotaDialog(false)}>
                    <Button className="w-full bg-gradient-to-r from-[#FF7D00] to-[#FF9A2E] hover:opacity-90 text-white">
                      开通会员 解锁全部功能
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

      {/* ============================================================ */}
      {/* 问题1修复：登录弹窗 */}
      {/* ============================================================ */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Tv className="w-6 h-6 text-[#165DFF]" />
              登录后使用AI助手
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-3">
              <p className="text-gray-600">登录后可保存对话记录和获取个性化推荐</p>
              <div className="flex flex-col gap-3">
                <Link href="/auth?redirect=/assistant" onClick={() => setShowLoginModal(false)}>
                  <Button className="w-full bg-gradient-to-r from-[#165DFF] to-[#0E4FD9] hover:opacity-90 text-white h-12 text-base">
                    立即登录
                  </Button>
                </Link>
                <Link href="/auth?redirect=/assistant" onClick={() => setShowLoginModal(false)}>
                  <Button variant="outline" className="w-full h-12 text-base">
                    注册新账号
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                登录即表示同意《用户协议》和《隐私政策》
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
