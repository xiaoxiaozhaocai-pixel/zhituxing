'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Sparkles, Loader2, ChevronLeft, ChevronRight, Upload, Send, X, MessageCircle, User, ArrowRight } from 'lucide-react';

// 行业列表（与数据库值对应）
const industries = [
  '全部', 
  '互联网 / IT', '金融', '制造', '教育 / 培训', '医疗健康 / 生物', '医疗健康 / 生物制药',
  '快消', '人力资源服务 / 咨询', '企业服务/咨询', '文化传媒 / 广告',
  '房地产 / 建筑', '化工 / 能源 / 环保', '金融/经济/投资/财会',
  '餐饮/酒店/旅游/娱乐', '国企 / 事业单位', '其他'
];

// 城市列表
const cities = [
  '全国', '北京', '上海', '广州', '深圳', '成都', '杭州', '重庆', '武汉', 
  '西安', '苏州', '天津', '南京', '长沙', '郑州', '东莞', '青岛', '沈阳', 
  '合肥', '佛山', '宁波', '昆明', '福州', '无锡', '厦门', '济南', '大连', 
  '哈尔滨', '温州', '石家庄', '南宁'
];

// 企业类型
const companyTypes = ['全部', '民营企业', '国有企业', '外资企业', '上市公司', '事业单位', '创业公司'];

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
  friendliness: string;
  isFreshFriendly: boolean;
  jdContent: string;
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
    freshOnly: false
  });
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      if (searchQuery) {
        params.set('keyword', searchQuery);
      }
      
      const response = await fetch(`/api/jobs?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.data);
        setPagination(prev => ({
          ...prev,
          total: data.total,
          totalPages: data.totalPages
        }));
      }
    } catch (error) {
      console.error('获取岗位数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filters, searchQuery]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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
  }, [showAssistant]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const response = await fetch('/api/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content })
      });

      if (!response.ok) throw new Error('请求失败');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let fullContent = '';
      let done = false;

      // 添加一个空的assistant消息用于流式更新
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }]);

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
                if (data.error) {
                  fullContent = `抱歉，服务暂时不可用: ${data.error}`;
                  done = true;
                  break;
                }
                if (data.content) {
                  fullContent += data.content;
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
                if (data.done) {
                  done = true;
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('职搭子对话失败:', error);
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: '抱歉，我遇到了一些问题，请稍后再试。',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // 搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchJobs();
  };

  // 跳转到AI助手
  const handleJobClick = (jobName: string) => {
    router.push(`/assistant?query=${encodeURIComponent(jobName)}`);
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
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-4 text-sm text-white">
          <span className="flex items-center gap-1">
            💡 先生成你的职业规划，获得更精准的岗位推荐
          </span>
          <span className="text-purple-200">|</span>
          <span className="flex items-center gap-1">
            完善信息，精准度提升100%
          </span>
          <Link href="/career-planning" className="underline hover:text-purple-200 font-medium flex items-center gap-1 ml-2">
            生成规划 →
          </Link>
          <span className="text-purple-200">|</span>
          <Link href="/profile/info" className="underline hover:text-purple-200 font-medium flex items-center gap-1">
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
              />
            </div>
            <Link href="/upload-jd-reward">
              <Button type="button" variant="outline" className="h-12 px-4 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400">
                <Upload className="w-4 h-4 mr-2" />
                上传JD领会员
              </Button>
            </Link>
            <Button type="submit" className="h-12 px-8 bg-[#165DFF] hover:bg-[#165DFF]/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <Search className="w-4 h-4 mr-2" />
              智能查询
            </Button>
          </form>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 行业筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">行业</label>
              <select
                value={filters.industry}
                onChange={(e) => handleFilterChange('industry', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:border-[#165DFF] focus:ring-2 focus:ring-[#165DFF]/20 transition-all"
              >
                {industries.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
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
              >
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
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
              >
                {companyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* 应届生友好 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
              <label className="flex items-center h-10 px-3 rounded-lg border border-gray-200 hover:border-[#165DFF] cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={filters.freshOnly}
                  onChange={(e) => handleFilterChange('freshOnly', e.target.checked)}
                  className="w-4 h-4 text-[#165DFF] rounded border-gray-300 focus:ring-[#165DFF]"
                />
                <span className="ml-2 text-sm">仅显示应届友好岗位</span>
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
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">未找到符合条件的岗位</p>
            <p className="text-sm mt-2">试试调整筛选条件</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="cursor-pointer border-2 border-blue-100 hover:border-[#165DFF] hover:shadow-[0_8px_24px_rgba(22,93,255,0.15)] transition-all duration-300 hover:-translate-y-2 group"
                onClick={() => handleJobClick(job.name)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-bold text-[#165DFF] group-hover:text-[#165DFF]/80 transition-colors line-clamp-1">
                      {job.name}
                    </h3>
                    {job.isFreshFriendly && (
                      <Badge className="bg-green-100 text-green-700 text-xs whitespace-nowrap rounded-md px-2 py-0.5 border border-green-200 font-medium">
                        应届友好
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p className="flex items-center gap-2">
                      <span className="w-16 text-gray-500">薪资</span>
                      <span className="font-bold text-[#FF7D00]">{job.salary}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-16 text-gray-500">城市</span>
                      <span>{job.city}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-16 text-gray-500">企业</span>
                      <span className="truncate">{job.companyType}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {job.skills.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-[#165DFF] hover:text-white transition-all duration-300 cursor-default">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-[#165DFF] text-sm group-hover:text-blue-700 transition-colors font-medium">
                    <Sparkles className="w-4 h-4" />
                    <span className="group-hover:underline">AI深度分析</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
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
                  className={`max-w-[80%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-[#165DFF] text-white rounded-tr-sm' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                  {isTyping && msg.role === 'assistant' && index === messages.length - 1 && (
                    <span className="inline-block ml-2 animate-pulse">...</span>
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
          
          {/* 输入框 */}
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
    </div>
  );
}
