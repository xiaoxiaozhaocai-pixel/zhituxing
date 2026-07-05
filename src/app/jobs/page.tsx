'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Send, Loader2, Briefcase, Sparkles,
  Search, ChevronLeft, ChevronRight, Upload, MessageCircle,
  User, ArrowRight, RefreshCw, Link as LinkIcon,
  MapPin, GraduationCap, Clock, SlidersHorizontal, ChevronDown, ChevronUp
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import AIResponseRenderer from '@/components/AIResponseRenderer';
import { SkeletonCardList } from '@/components/SkeletonCard';
import Breadcrumb from '@/components/Breadcrumb';

// 动态筛选选项类型
interface FilterOption {
  label: string;
  value: string;
  count: number;
}

// 默认筛选选项（加载前显示）
const defaultIndustries: FilterOption[] = [{ label: '全部', value: '全部', count: 0 }];
const defaultCities: FilterOption[] = [{ label: '全国', value: '全国', count: 0 }];
const defaultEducation: FilterOption[] = [{ label: '不限', value: '不限', count: 0 }];
const defaultExperience: FilterOption[] = [{ label: '不限', value: '不限', count: 0 }];
const defaultCompanyTypes: FilterOption[] = [{ label: '全部', value: '全部', count: 0 }];

// 排序选项
const sortOptions = [
  { value: 'default', label: '默认排序' },
  { value: 'salary_desc', label: '薪资最高' },
  { value: 'created_desc', label: '最新发布' },
];

// 接口返回的岗位数据类型
interface Job {
  id: number;
  name: string;
  industry: string;
  city: string;
  companyType: string;
  salary: string;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  softSkills?: string[];
  education?: string;
  experience?: string;
  friendliness: string;
  isFreshFriendly: boolean;
  jdContent: string;
  // 结构化字段
  coreDutyModule?: string;
  hardSkills?: string[];
  majorRequire?: string;
  bonusSkillCert?: string;
  postCategory?: string;
  graduateFriendlyLevel?: string;
  competencyWeights?: {
    learning?: number;
    teamwork?: number;
    communicate?: number;
    professional?: number;
    problem_solve?: number;
  } | null;
  raw_jd?: string; // 原始招聘JD文本
}

// 聊天消息类型
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function JobsPage() {
  const router = useRouter();
  
  // 状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    industry: '全部',
    city: '全国',
    companyType: '全部',
    freshOnly: false,
    education: '不限',
    experience: '不限',
    sortBy: 'default'
  });
  const [filterOpen, setFilterOpen] = useState(false); // 移动端筛选区折叠状态
  const [selectedJob, setSelectedJob] = useState<Job | null>(null); // 选中的岗位，用于弹窗展示
  const [showRawJd, setShowRawJd] = useState(false); // 原始JD折叠状态
  const [industries, setIndustries] = useState<FilterOption[]>(defaultIndustries);
  const [cities, setCities] = useState<FilterOption[]>(defaultCities);
  const [educationOpts, setEducationOpts] = useState<FilterOption[]>(defaultEducation);
  const [experienceOpts, setExperienceOpts] = useState<FilterOption[]>(defaultExperience);
  const [companyTypeOpts, setCompanyTypeOpts] = useState<FilterOption[]>(defaultCompanyTypes);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });

  // 职搭子聊天状态
  const [showAssistant, setShowAssistant] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingSeconds, setTypingSeconds] = useState(0);
  const [chatError, setChatError] = useState<string | null>(null);
  const [jdUrlInput, setJdUrlInput] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [jdUrlLoading, setJdUrlLoading] = useState(false);
  const [jdUrlError, setJdUrlError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 获取岗位数据
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString()
      });
      
      if (filters.industry !== '全部') {
        params.set('industry', filters.industry);
      }
      if (filters.city !== '全国') {
        params.set('city', filters.city);
      }
      if (filters.companyType !== '全部') {
        params.set('companyType', filters.companyType);
      }
      if (filters.freshOnly) {
        params.set('freshOnly', 'true');
      }
      if (filters.education !== '不限') {
        params.set('education', filters.education);
      }
      if (filters.experience !== '不限') {
        params.set('experience', filters.experience);
      }
      if (filters.sortBy !== 'default') {
        params.set('sortBy', filters.sortBy);
      }
      if (searchQuery) {
        params.set('keyword', searchQuery);
      }
      
      const response = await fetch(`/api/jobs?${params.toString()}`);
      const data = await response.json();

      if (data.ok && data.data) {
        setJobs(data.data.items);
        setPagination(prev => ({
          ...prev,
          total: data.data.total,
          totalPages: data.data.totalPages
        }));
      }
    } catch (error) {
      console.error('获取岗位数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters, searchQuery]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // 获取动态筛选选项
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setFiltersLoading(true);
        const res = await fetch('/api/filters');
        if (res.ok) {
          const data = await res.json();
          if (data.industries) setIndustries(data.industries);
          if (data.cities) setCities(data.cities);
          if (data.education) setEducationOpts(data.education);
          if (data.experience) setExperienceOpts(data.experience);
          if (data.companyTypes) setCompanyTypeOpts(data.companyTypes);
        }
      } catch (error) {
        console.error('获取筛选选项失败:', error);
      } finally {
        setFiltersLoading(false);
      }
    };
    fetchFilters();
  }, []);

  // 初始化职搭子欢迎消息
  useEffect(() => {
    if (showAssistant && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `👋 你好！我是「职搭子」，全行业岗位百科的专属助手~

✨ 我能帮你：
🔍 解读岗位JD：分析某个岗位的具体要求和发展前景
📊 薪资对比：对比不同岗位、行业的薪资水平
🎯 求职建议：根据你的背景推荐适合的岗位
💼 简历优化：告诉你投某类岗位需要注意什么

直接问我任何关于岗位和求职的问题吧！`,
          timestamp: new Date()
        }
      ]);
    }
  }, [showAssistant, messages.length]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // JD 链接解析
  const handleFetchJdUrl = async () => {
    if (!jdUrl.trim()) return;
    setJdUrlLoading(true);
    setJdUrlError(null);
    try {
      const res = await fetch('/api/fetch-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jdUrl.trim() }),
      });
      const data = await res.json();
      if (data.code === 200 && data.data?.content) {
        setJdUrlInput(prev => {
          const prefix = `\n【我粘贴的招聘链接内容】\n${data.data.content}\n【内容结束】\n\n`;
          return prev ? prev + prefix : prefix;
        });
        setJdUrl('');
        setJdUrlError(null);
      } else {
        setJdUrlError(data.message || '无法解析该链接，请手动粘贴岗位描述');
      }
    } catch {
      setJdUrlError('网络错误，请检查链接或手动粘贴岗位描述');
    } finally {
      setJdUrlLoading(false);
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      setChatError(null);
      setTypingSeconds(0);
      typingTimerRef.current = setInterval(() => {
        setTypingSeconds(prev => prev + 1);
      }, 1000);

      const response = await fetch('/api/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content })
      });

      if (!response.ok) {
        let errorMsg = `请求失败(HTTP ${response.status})`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errData.msg || errorMsg;
        } catch { /* ignore */ }
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let fullContent = '';
      let done = false;
      let hasReceivedData = false;

      // 添加一个空的assistant消息用于流式更新
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }]);

      // 60秒超时
      const streamTimeout = setTimeout(() => {
        if (!hasReceivedData) {
          done = true;
          reader.cancel().catch(() => {});
        }
      }, 60000);

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        done = streamDone;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'error') {
                  fullContent = '';
                  setChatError(data.message || 'AI服务出现错误');
                  done = true;
                  break;
                }
                if (data.error) {
                  fullContent = '';
                  setChatError(`服务暂时不可用: ${data.error}`);
                  done = true;
                  break;
                }
                // 从 data.content.content.answer 或 data.content.answer 获取文本
                const answer = data.content?.content?.answer || data.content?.answer;
                if (answer && typeof answer === 'string') {
                  hasReceivedData = true;
                  fullContent += answer;
                  // 实时更新最后一条消息
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: fullContent
                    };
                    return updated;
                  });
                }
                if (data.done || data.type === 'done') {
                  done = true;
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }

      clearTimeout(streamTimeout);

      // 如果没有收到任何数据
      if (!hasReceivedData && !fullContent && !chatError) {
        setChatError('AI未返回任何内容，请重试');
        // 移除空的assistant消息
        setMessages(prev => prev.slice(0, -1));
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '未知错误';
      console.error('职搭子对话失败:', errMsg);
      setChatError(errMsg);
      // 移除可能残留的空assistant消息
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsTyping(false);
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }
  };

  // 搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchJobs();
  };

  // 生成岗位分析提示词
  const generateJobAnalysisPrompt = (job: Job): string => {
    const cleanJobName = job.name.replace(/（[^）]+）|\([^)]+\)/g, '').trim();
    const skillsText = job.skills?.length > 0 ? job.skills.join('、') : '暂无';
    const softSkillsText = job.softSkills && job.softSkills.length > 0 ? job.softSkills.join('、') : '暂无';
    
    return `请帮我深度分析以下岗位：

岗位名称：${cleanJobName}
工作城市：${job.city || '不限'}
薪资范围：${job.salary || '面议'}
学历要求：${job.education || '不限'}
经验要求：${job.experience || '不限'}
行业领域：${job.industry || '综合'}
技能要求：${skillsText}
软技能要求：${softSkillsText}
${job.jdContent ? `\n岗位描述：\n${job.jdContent.slice(0, 500)}${job.jdContent.length > 500 ? '...' : ''}` : ''}

请从以下几个方面进行深度分析：
1. 岗位前景与发展空间
2. 技能要求解读与学习建议
3. 面试准备重点
4. 薪资谈判技巧
5. 职业发展路径建议`;
  };

  // 跳转到AI助手（带完整岗位信息）
  const handleJobClick = (job: Job) => {
    const prompt = generateJobAnalysisPrompt(job);
    router.push(`/assistant?bot=jobs&jobId=${job.id}&query=${encodeURIComponent(prompt)}`);
  };

  // 分页
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 筛选变化
  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb theme="light" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4" />
      {/* Header */}
      <div className="bg-gradient-to-r from-[#165DFF] to-[#4080FF] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">全行业岗位百科</h1>
              <p className="text-blue-100 text-lg">收录10000+真实校招/应届生岗位JD，助你找到最适合自己的工作</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 h-11 px-6"
                onClick={() => setShowAssistant(true)}
                data-gui-allowed="open-assistant"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                问职搭子
              </Button>
              <Link href="/jobs/submit">
                <Button className="bg-[#FF7D00] hover:bg-[#FF7D00]/90 text-white h-11 px-6 shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <Upload className="w-4 h-4 mr-2" />
                  上传JD
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 职业规划提示 - 紫色渐变 */}
      <div className="bg-gradient-to-r from-[#165DFF] to-[#3D7FFF]">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-4 text-sm text-white">
          <span className="flex items-center gap-1">
            💡 先生成你的职业规划，获得更精准的岗位推荐
          </span>
          <span className="text-blue-200">|</span>
          <span className="flex items-center gap-1">
            完善信息，精准度提升100%
          </span>
          <Link href="/career-planning" className="underline hover:text-blue-200 font-medium flex items-center gap-1 ml-2">
            生成规划 →
          </Link>
          <span className="text-blue-200">|</span>
          <Link href="/profile/info?from=/jobs" className="underline hover:text-blue-200 font-medium flex items-center gap-1">
            完善信息 →
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="搜索岗位名称、技能标签，如：Java开发、Python、数据分析..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base rounded-lg border-2 border-gray-200 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 transition-all duration-300"
                data-gui-allowed="search-input"
              />
            </div>
            <Link href="/upload-jd-reward">
              <Button type="button" variant="outline" className="h-12 px-4 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400">
                <Upload className="w-4 h-4 mr-2" />
                上传JD领会员
              </Button>
            </Link>
            <Button type="submit" data-gui-allowed="search-submit" className="h-12 px-8 bg-[#165DFF] hover:bg-[#165DFF]/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <Search className="w-4 h-4 mr-2" />
              智能查询
            </Button>
          </form>
        </div>

        {/* Filters */}
        {/* 移动端折叠按钮 */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-200"
            data-gui-allowed="mobile-filter-toggle"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-500" />
              <span className="font-medium">筛选条件</span>
              {/* 已选筛选条件数量 badge */}
              {(() => {
                const count = [
                  filters.industry !== '全部',
                  filters.city !== '全国',
                  filters.education !== '不限',
                  filters.experience !== '不限',
                  filters.companyType !== '全部',
                  filters.freshOnly,
                ].filter(Boolean).length;
                return count > 0 ? (
                  <span className="bg-[#165DFF] text-white text-xs px-2 py-0.5 rounded-full">{count}</span>
                ) : null;
              })()}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* 筛选区域 - 桌面端始终显示，移动端根据状态显示 */}
        <div className={`${filterOpen ? 'block' : 'hidden'} md:block bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {/* 行业筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">行业</label>
              <select
                value={filters.industry}
                onChange={(e) => handleFilterChange('industry', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 transition-all"
                disabled={filtersLoading}
                data-gui-allowed="filter-industry"
              >
                {industries.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}{opt.count > 0 ? ` (${opt.count})` : ''}</option>
                ))}
              </select>
            </div>

            {/* 城市筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">城市</label>
              <select
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 transition-all"
                disabled={filtersLoading}
                data-gui-allowed="filter-city"
              >
                {cities.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}{opt.count > 0 ? ` (${opt.count})` : ''}</option>
                ))}
              </select>
            </div>

            {/* 学历要求 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">学历要求</label>
              <select
                value={filters.education}
                onChange={(e) => handleFilterChange('education', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 transition-all"
                disabled={filtersLoading}
                data-gui-allowed="filter-education"
              >
                {educationOpts.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}{opt.count > 0 ? ` (${opt.count})` : ''}</option>
                ))}
              </select>
            </div>

            {/* 工作经验 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">工作经验</label>
              <select
                value={filters.experience}
                onChange={(e) => handleFilterChange('experience', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 transition-all"
                disabled={filtersLoading}
                data-gui-allowed="filter-experience"
              >
                {experienceOpts.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}{opt.count > 0 ? ` (${opt.count})` : ''}</option>
                ))}
              </select>
            </div>

            {/* 企业类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">企业类型</label>
              <select
                value={filters.companyType}
                onChange={(e) => handleFilterChange('companyType', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 transition-all"
                disabled={filtersLoading}
                data-gui-allowed="filter-company-type"
              >
                {companyTypeOpts.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}{opt.count > 0 ? ` (${opt.count})` : ''}</option>
                ))}
              </select>
            </div>

            {/* 排序 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">排序</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 transition-all"
                data-gui-allowed="filter-sort"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 应届生友好 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
              <label className="flex items-center h-10 px-3 rounded-lg border border-gray-200 hover:border-[#165DFF] cursor-pointer transition-all" data-gui-allowed="filter-fresh-only">
                <input
                  type="checkbox"
                  checked={filters.freshOnly}
                  onChange={(e) => handleFilterChange('freshOnly', e.target.checked)}
                  className="w-4 h-4 text-[#165DFF] rounded border-gray-300 focus:ring-[#165DFF]"
                />
                <span className="ml-2 text-sm whitespace-nowrap">应届友好</span>
              </label>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="text-blue-800">
            共找到 <span className="font-bold text-xl">{pagination.total.toLocaleString()}</span> 个岗位
          </div>
          <div className="text-blue-600 text-sm">
            第 {pagination.page} / {pagination.totalPages} 页
          </div>
        </div>

        {/* Jobs Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SkeletonCardList count={8} />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-lg font-medium text-gray-700 mb-2">暂无岗位数据，敬请期待</p>
            <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">我们正在马不停蹄更新中～先去看看AI为你匹配的岗位吧</p>
            <Link href="/match">
              <Button className="bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] hover:from-[#3D7FFF] hover:to-[#5A9BFF] shadow-lg px-6 py-5">
                <Briefcase className="w-4 h-4 mr-2" />
                去查看匹配推荐
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="cursor-pointer border-2 border-blue-100 hover:border-[#165DFF] hover:shadow-[0_8px_24px_rgba(22,93,255,0.15)] transition-all duration-300 hover:-translate-y-2 group"
                onClick={() => setSelectedJob(job)}
                data-gui-allowed="job-card"
                data-job-id={job.id}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-bold text-[#165DFF] group-hover:text-[#165DFF]/80 transition-colors line-clamp-1">
                      {/* 去掉标题中的括号城市信息，避免与 city 字段冲突 */}
                      {job.name.replace(/（[^）]+）|\([^)]+\)/g, '').trim()}
                    </h3>
                    {job.isFreshFriendly && (
                      <Badge className="bg-green-100 text-green-700 text-xs whitespace-nowrap rounded-md px-2 py-0.5 border border-green-200 font-medium">
                        应届友好
                      </Badge>
                    )}
                  </div>
                  
                  {/* 薪资 - 突出显示 */}
                  <div className="mb-3">
                    <span className="text-lg font-bold text-[#FF7D00]">{job.salary}</span>
                  </div>

                  {/* 信息标签行：城市 | 学历 | 经验 */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-4">
                    {job.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {job.city}
                      </span>
                    )}
                    {job.education && job.education !== '不限' && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                        {job.education}
                      </span>
                    )}
                    {job.experience && job.experience !== '不限' && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {job.experience}
                      </span>
                    )}
                  </div>

                  {/* 技能标签 */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {((job.hardSkills && job.hardSkills.length > 0 ? job.hardSkills : job.skills) || []).slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-[#165DFF] hover:text-white transition-all duration-300 cursor-default">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* AI深度分析按钮 - 使用 stopPropagation 阻止事件冒泡 */}
                  <button
                    className="flex items-center gap-1 text-[#165DFF] text-sm group-hover:text-blue-700 transition-colors font-medium hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJobClick(job);
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>AI深度分析</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && jobs.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="border-2 hover:border-[#165DFF] transition-all"
              data-gui-allowed="pagination-prev"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              上一页
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? "default" : "outline"}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 ${pagination.page === pageNum ? 'bg-[#165DFF]' : ''} border-2 hover:border-[#165DFF] transition-all`}
                    data-gui-allowed="pagination-page"
                    data-page={pageNum}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="border-2 hover:border-[#165DFF] transition-all"
              data-gui-allowed="pagination-next"
            >
              下一页
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* 职搭子对话浮窗 */}
      <Dialog open={showAssistant} onOpenChange={setShowAssistant}>
        <DialogContent className="max-w-lg w-full max-h-[70vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                </div>
                职搭子
              </DialogTitle>
              <span className="text-xs text-gray-500">岗位百科专属助手</span>
            </div>
          </DialogHeader>
          
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                  </div>
                )}
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' 
                      ? 'bg-[#165DFF] text-white rounded-tr-sm' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                  ) : (
                    <AIResponseRenderer rawText={msg.content} role="assistant" streaming={isTyping && index === messages.length - 1 && !chatError} />
                  )}
                  {isTyping && msg.role === 'assistant' && index === messages.length - 1 && !chatError && (
                    <span className="inline-block ml-2 animate-pulse text-gray-400 text-xs">
                      {typingSeconds >= 30 ? '生成时间较长，请耐心等待...' : typingSeconds >= 15 ? 'AI正在思考，请耐心等待...' : ''}
                    </span>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* 错误提示 + 重试按钮 */}
          {chatError && (
            <div className="px-4 py-3 bg-red-50 border-t border-red-100 flex items-center gap-2">
              <span className="text-sm text-red-600 flex-1">{chatError}</span>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  setChatError(null);
                  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                  if (lastUserMsg) {
                    setInputMessage(lastUserMsg.content);
                    // 移除最后的空assistant消息
                    setMessages(prev => {
                      const last = prev[prev.length - 1];
                      if (last && last.role === 'assistant' && !last.content) {
                        return prev.slice(0, -1);
                      }
                      return prev;
                    });
                  }
                }}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                重试
              </Button>
            </div>
          )}
          
          {/* 输入框 */}
          {/* JD 链接粘贴 */}
          {showAssistant && (
            <div className="px-4 pb-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  placeholder="粘贴招聘链接，自动解析岗位JD"
                  value={jdUrlInput}
                  onChange={(e) => setJdUrlInput(e.target.value)}
                  disabled={isTyping || jdUrlLoading}
                  className="flex-1 text-sm border-blue-200 focus:border-blue-400"
                />
                <Button
                  onClick={handleFetchJdUrl}
                  disabled={!jdUrlInput.trim() || isTyping || jdUrlLoading}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50 whitespace-nowrap"
                >
                  {jdUrlLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-1" />
                      解析JD
                    </>
                  )}
                </Button>
              </div>
              {jdUrlError && (
                <p className="text-xs text-amber-600 mt-1">{jdUrlError}</p>
              )}
            </div>
          )}
          <div className="p-4 border-t flex-shrink-0">
            <div className="flex gap-2">
              <Input
                placeholder="问我任何关于岗位和求职的问题..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isTyping}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!inputMessage.trim() || isTyping}
                className="bg-[#165DFF] hover:bg-[#165DFF]/90"
              >
                {isTyping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 岗位详情弹窗 - 合规版：只展示结构化摘要 */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => { if (!open) { setSelectedJob(null); }}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#165DFF]">
                  {selectedJob.name.replace(/（[^）]+）|\([^)]+\)/g, '').trim()}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-3 mt-2">
                  {selectedJob.industry && (
                    <span className="text-gray-600">{selectedJob.industry}</span>
                  )}
                  {selectedJob.city && (
                    <span className="flex items-center gap-1 text-gray-600">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedJob.city}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-4">
                {/* 薪资 + 基本信息 */}
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className="text-sm text-gray-500">薪资</span>
                    <p className="text-lg font-bold text-[#FF7D00]">{selectedJob.salary}</p>
                  </div>
                  {selectedJob.education && (
                    <div>
                      <span className="text-sm text-gray-500">学历</span>
                      <p className="text-gray-900">{selectedJob.education}</p>
                    </div>
                  )}
                  {selectedJob.experience && (
                    <div>
                      <span className="text-sm text-gray-500">经验</span>
                      <p className="text-gray-900">{selectedJob.experience}</p>
                    </div>
                  )}
                </div>

                <Separator />
                {/* 职位要求 - 卡片式拆解 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="text-base">📋</span> 职位要求
                  </h4>

                  {/* 核心职责 - 蓝色卡片 */}
                  {selectedJob.coreDutyModule && (
                    <div className="border border-blue-100 rounded-lg p-3 bg-blue-50/50">
                      <p className="text-xs font-semibold text-blue-600 mb-1.5">🎯 核心职责</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{selectedJob.coreDutyModule}</p>
                    </div>
                  )}

                  {/* 专业要求 + 加分证书 - 双列卡片 */}
                  <div className="grid grid-cols-2 gap-3">
                    {selectedJob.majorRequire && (
                      <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50">
                        <p className="text-xs font-semibold text-blue-600 mb-1.5">📚 专业要求</p>
                        <p className="text-sm text-gray-700">{selectedJob.majorRequire}</p>
                      </div>
                    )}
                    {selectedJob.bonusSkillCert && (
                      <div className="border border-orange-100 rounded-lg p-3 bg-orange-50/50">
                        <p className="text-xs font-semibold text-orange-600 mb-1.5">🏅 加分证书</p>
                        <p className="text-sm text-gray-700">{selectedJob.bonusSkillCert}</p>
                      </div>
                    )}
                  </div>

                  {/* 应届友好 - 绿色卡片 */}
                  {selectedJob.graduateFriendlyLevel && (
                    <div className="border border-green-100 rounded-lg p-3 bg-green-50/50">
                      <p className="text-xs font-semibold text-green-600 mb-1.5">🎓 应届友好</p>
                      <span className="inline-block bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 text-xs font-medium">
                        {selectedJob.graduateFriendlyLevel}
                      </span>
                    </div>
                  )}

                  {/* JD原文折叠 */}
                  {selectedJob.jdContent ? (
                    <details className="border rounded-lg overflow-hidden">
                      <summary className="px-3 py-2 text-xs text-gray-500 bg-gray-50 cursor-pointer hover:bg-gray-100">
                        查看完整职位描述原文
                      </summary>
                      <div className="p-3 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {selectedJob.jdContent}
                      </div>
                    </details>
                  ) : (
                    <p className="text-sm text-gray-400">暂无职位描述</p>
                  )}
                </div>
                {/* 技能要求 - 只展示前3个 */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-base">💡</span> 技能要求
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {/* 硬技能 - 前3个 */}
                    {((selectedJob.hardSkills && selectedJob.hardSkills.length > 0 ? selectedJob.hardSkills : selectedJob.skills) || []).slice(0, 3).map((skill, idx) => (
                      <Badge key={idx} className="bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1">
                        {skill}
                      </Badge>
                    ))}
                    {/* 软技能 - 前3个 */}
                    {(selectedJob.softSkills || []).slice(0, 3).map((skill, idx) => (
                      <Badge key={`soft-${idx}`} className="bg-green-50 text-green-700 border border-green-100 rounded-full px-3 py-1">
                        {skill}
                      </Badge>
                    ))}
                    {/* 无技能 */}
                    {(!selectedJob.hardSkills?.length && !selectedJob.skills?.length && !selectedJob.softSkills?.length) && (
                      <p className="text-sm text-gray-400">暂无技能要求</p>
                    )}
                  </div>
                </div>

                {/* 标签 */}
                <div className="flex items-center gap-2">
                  {selectedJob.isFreshFriendly && (
                    <Badge className="bg-green-100 text-green-700 border border-green-200">
                      应届友好
                    </Badge>
                  )}
                </div>
              </div>

              {/* 免责声明 + 原始JD折叠区域 */}
              {selectedJob.raw_jd && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2">
                    以上信息由AI从公开招聘平台自动解析，可能与原始发布内容存在差异，具体以原始发布为准
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <button
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                      onClick={() => setShowRawJd(!showRawJd)}
                    >
                      <span className="text-sm font-medium text-gray-700">查看原始招聘信息</span>
                      {showRawJd ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    {showRawJd && (
                      <div className="p-4 bg-white border-t">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                          {selectedJob.raw_jd}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter className="mt-6 flex-col gap-3">
                <div className="flex gap-3 w-full">
                  <Button variant="outline" className="flex-1" onClick={() => { setSelectedJob(null); }}>
                    关闭
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-[#165DFF] to-blue-600 hover:from-[#165DFF]/90 hover:to-blue-600/90"
                    onClick={() => {
                      setSelectedJob(null);
                      handleJobClick(selectedJob);
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI深度分析
                  </Button>
                </div>
                {/* 版权声明 */}
                <p className="text-xs text-gray-400 text-center w-full mt-2">
                  岗位信息来源于国聘网、国家24365大学生就业服务平台、中国公共招聘网、广西人才网等合规招聘平台，职途星仅提供搜索和AI分析服务
                </p>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
