'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, Loader2, ChevronLeft, ChevronRight, Upload } from 'lucide-react';

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
            <Link href="/jobs/submit">
              <Button className="bg-[#FF7D00] hover:bg-[#FF7D00]/90 text-white h-11 px-6 shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <Upload className="w-4 h-4 mr-2" />
                上传JD
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 职业规划提示 */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2 text-sm">
          <span className="text-purple-700">
            💡 先生成你的职业规划，获得更精准的个性化建议
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-purple-700">
            完善信息，精准度提升100%
          </span>
          <Link href="/profile/info" className="text-[#165DFF] underline hover:text-[#165DFF]/80 ml-2">
            完善信息
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/career-planning" className="text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
            立即生成
            <ChevronRight className="w-4 h-4" />
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
                className="cursor-pointer hover:border-[#165DFF] hover:shadow-[0_8px_24px_rgba(22,93,255,0.15)] transition-all duration-300 hover:-translate-y-2 group"
                onClick={() => handleJobClick(job.name)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-bold text-[#165DFF] group-hover:text-[#165DFF]/80 transition-colors line-clamp-1">
                      {job.name}
                    </h3>
                    {job.isFreshFriendly && (
                      <Badge className="bg-green-100 text-green-700 text-xs whitespace-nowrap rounded-full px-2 py-0.5 border border-green-200">
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

                  <div className="flex items-center gap-1 text-green-600 text-sm group-hover:text-[#165DFF] transition-colors">
                    <Sparkles className="w-4 h-4" />
                    <span className="group-hover:underline">AI深度分析</span>
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
    </div>
  );
}
