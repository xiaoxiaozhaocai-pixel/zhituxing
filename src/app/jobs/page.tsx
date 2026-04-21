'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Sparkles, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect } from 'react';

const industries = [
  '全部', '互联网/电商', '金融（银行/证券/保险）', '制造（汽车/电子/机械）',
  '教育（K12/高等教育/职业教育）', '医疗（医院/医药/器械）', '零售（商超/电商零售）',
  '地产（住宅/商业地产）', '物流（快递/供应链）', '广告/传媒', '新能源（光伏/风电）',
  '化工', '建筑', '律所', '国企（综合类）', '外企（外资制造业/服务业）'
];

const jobCategories = [
  '全部', '技术类（前端/后端/测试/运维）', '产品类（产品经理/产品运营）',
  '运营类（用户/内容/活动/电商）', '市场类（品牌/新媒体/推广）',
  '职能类（HR/行政/财务/法务/采购）', '销售类（To B/To C/商务）',
  '设计类（UI/UX/平面）', '管培生类'
];

const cities = [
  '全国', '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京',
  '重庆', '天津', '苏州', '长沙', '青岛', '郑州', '大连', '厦门', '合肥', '济南', '福州'
];

const companyTypes = ['全部', '民营企业', '国有企业', '外资企业', '上市公司', '事业单位'];

const friendlinessLevels = [
  '全部', '极度友好', '友好', '一般', '不友好'
];

const mockJobs = [
  { id: 1, name: 'Java开发工程师', industry: '互联网/电商', city: '北京', companyType: '民营企业', salary: '15-25K', friendliness: '极度友好', tags: ['后端开发', 'Spring', '微服务'] },
  { id: 2, name: '产品经理', industry: '互联网/电商', city: '上海', companyType: '上市公司', salary: '20-35K', friendliness: '友好', tags: ['产品设计', '数据分析', '项目管理'] },
  { id: 3, name: '前端开发工程师', industry: '互联网/电商', city: '深圳', companyType: '外资企业', salary: '18-30K', friendliness: '极度友好', tags: ['React', 'Vue', 'TypeScript'] },
  { id: 4, name: 'HRBP', industry: '互联网/电商', city: '杭州', companyType: '民营企业', salary: '12-20K', friendliness: '友好', tags: ['人力资源', '组织发展', '招聘'] },
  { id: 5, name: 'UI设计师', industry: '广告/传媒', city: '北京', companyType: '民营企业', salary: '10-18K', friendliness: '极度友好', tags: ['UI设计', 'Figma', '视觉设计'] },
  { id: 6, name: '新媒体运营', industry: '广告/传媒', city: '广州', companyType: '民营企业', salary: '8-15K', friendliness: '友好', tags: ['内容运营', '社交媒体', '文案策划'] },
  { id: 7, name: '管培生', industry: '国企（综合类）', city: '上海', companyType: '国有企业', salary: '10-18K', friendliness: '极度友好', tags: ['轮岗培训', '管理培训', '储备干部'] },
  { id: 8, name: '数据分析师', industry: '金融（银行/证券/保险）', city: '深圳', companyType: '上市公司', salary: '15-28K', friendliness: '友好', tags: ['Python', 'SQL', '数据可视化'] },
  { id: 9, name: 'Python开发工程师', industry: '互联网/电商', city: '成都', companyType: '民营企业', salary: '14-24K', friendliness: '极度友好', tags: ['Python', 'Django', 'AI应用'] },
  { id: 10, name: '销售经理', industry: '零售（商超/电商零售）', city: '武汉', companyType: '民营企业', salary: '12-20K', friendliness: '一般', tags: ['B2B销售', '客户开发', '商务谈判'] },
  { id: 11, name: '行政专员', industry: '教育（K12/高等教育/职业教育）', city: '西安', companyType: '事业单位', salary: '6-10K', friendliness: '极度友好', tags: ['行政事务', '后勤管理', '文件处理'] },
  { id: 12, name: '会计', industry: '金融（银行/证券/保险）', city: '南京', companyType: '国有企业', salary: '8-14K', friendliness: '友好', tags: ['财务核算', '税务申报', '财务报表'] },
  { id: 13, name: '护士', industry: '医疗（医院/医药/器械）', city: '重庆', companyType: '事业单位', salary: '7-12K', friendliness: '极度友好', tags: ['临床护理', '医疗护理', '患者管理'] },
  { id: 14, name: '教师', industry: '教育（K12/高等教育/职业教育）', city: '天津', companyType: '事业单位', salary: '8-15K', friendliness: '极度友好', tags: ['学科教学', '班级管理', '教学研究'] },
  { id: 15, name: '电商运营', industry: '零售（商超/电商零售）', city: '杭州', companyType: '民营企业', salary: '10-18K', friendliness: '友好', tags: ['电商运营', '店铺管理', '营销推广'] },
  { id: 16, name: '机械工程师', industry: '制造（汽车/电子/机械）', city: '苏州', companyType: '外资企业', salary: '12-20K', friendliness: '友好', tags: ['机械设计', '工艺规划', '设备维护'] },
  { id: 17, name: '法务专员', industry: '律所', city: '北京', companyType: '民营企业', salary: '10-18K', friendliness: '一般', tags: ['合同审核', '法律咨询', '合规管理'] },
  { id: 18, name: '供应链管理', industry: '物流（快递/供应链）', city: '上海', companyType: '上市公司', salary: '12-22K', friendliness: '友好', tags: ['供应链优化', '仓储物流', '采购管理'] },
  { id: 19, name: '品牌经理', industry: '广告/传媒', city: '广州', companyType: '民营企业', salary: '15-28K', friendliness: '一般', tags: ['品牌策略', '市场推广', '媒体关系'] },
  { id: 20, name: '工艺工程师', industry: '新能源（光伏/风电）', city: '深圳', companyType: '上市公司', salary: '13-22K', friendliness: '友好', tags: ['工艺开发', '生产优化', '质量控制'] },
  { id: 21, name: '算法工程师', industry: '互联网/电商', city: '北京', companyType: '上市公司', salary: '25-45K', friendliness: '友好', tags: ['机器学习', '深度学习', 'NLP'] },
  { id: 22, name: '测试工程师', industry: '互联网/电商', city: '杭州', companyType: '民营企业', salary: '12-20K', friendliness: '极度友好', tags: ['功能测试', '自动化测试', '性能测试'] },
  { id: 23, name: '运维工程师', industry: '互联网/电商', city: '上海', companyType: '民营企业', salary: '14-24K', friendliness: '友好', tags: ['Linux', 'Docker', 'K8s'] },
  { id: 24, name: '商务拓展', industry: '互联网/电商', city: '北京', companyType: '外资企业', salary: '15-28K', friendliness: '一般', tags: ['商务合作', '渠道拓展', '客户关系'] },
];

function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    industry: '全部',
    jobCategory: '全部',
    city: '全部',
    companyType: '全部',
    friendliness: '全部',
  });

  // 从URL参数初始化搜索词
  useEffect(() => {
    const query = searchParams.get('query');
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  // 筛选后的岗位列表
  const filteredJobs = useMemo(() => {
    return mockJobs.filter(job => {
      // 搜索词匹配
      const searchMatch = searchQuery.trim() === '' || 
        job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // 行业匹配
      const industryMatch = filters.industry === '全部' || job.industry === filters.industry;

      // 城市匹配
      const cityMatch = filters.city === '全国' || filters.city === '全部' || job.city === filters.city;

      // 企业类型匹配
      const companyMatch = filters.companyType === '全部' || job.companyType === filters.companyType;

      // 友好度匹配
      let friendlinessMatch = true;
      if (filters.friendliness !== '全部') {
        friendlinessMatch = job.friendliness === filters.friendliness;
      }

      return searchMatch && industryMatch && cityMatch && companyMatch && friendlinessMatch;
    });
  }, [searchQuery, filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 搜索时跳转到AI助手页面
    if (searchQuery.trim()) {
      router.push(`/assistant?query=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleJobClick = (jobName: string) => {
    router.push(`/assistant?query=${encodeURIComponent(jobName)}`);
  };

  const handleReset = () => {
    setSearchQuery('');
    setFilters({
      industry: '全部',
      jobCategory: '全部',
      city: '全部',
      companyType: '全部',
      friendliness: '全部',
    });
  };

  // 检查是否有激活的筛选条件
  const hasActiveFilters = filters.industry !== '全部' || filters.jobCategory !== '全部' || 
    filters.city !== '全部' || filters.companyType !== '全部' || filters.friendliness !== '全部';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            全行业岗位百科
          </h1>
          <p className="text-gray-600">覆盖15+主流行业，8大岗位类别，支持智能搜索</p>
        </div>

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
            <Button 
              type="button"
              variant="outline" 
              className="h-12 md:hidden"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              筛选
            </Button>
          </form>

          {/* Quick Filter Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-sm text-gray-500">快捷筛选：</span>
            <button
              onClick={() => setFilters({ ...filters, industry: '互联网/电商' })}
              className={`text-sm px-3 py-1 rounded-full transition-colors ${
                filters.industry === '互联网/电商' 
                  ? 'bg-[#165DFF] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              互联网/电商
            </button>
            <button
              onClick={() => setFilters({ ...filters, city: '北京' })}
              className={`text-sm px-3 py-1 rounded-full transition-colors ${
                filters.city === '北京' 
                  ? 'bg-[#165DFF] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              北京
            </button>
            <button
              onClick={() => setFilters({ ...filters, companyType: '上市公司' })}
              className={`text-sm px-3 py-1 rounded-full transition-colors ${
                filters.companyType === '上市公司' 
                  ? 'bg-[#165DFF] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              上市公司
            </button>
            <button
              onClick={() => setFilters({ ...filters, friendliness: '极度友好' })}
              className={`text-sm px-3 py-1 rounded-full transition-colors ${
                filters.friendliness === '极度友好' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              应届生友好
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="text-sm px-3 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                清除筛选
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 md:hidden">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">行业大类</label>
                <Select
                  value={filters.industry}
                  onValueChange={(value) => setFilters({ ...filters, industry: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">工作城市</label>
                <Select
                  value={filters.city}
                  onValueChange={(value) => setFilters({ ...filters, city: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">企业类型</label>
                <Select
                  value={filters.companyType}
                  onValueChange={(value) => setFilters({ ...filters, companyType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {companyTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">应届生友好度</label>
                <Select
                  value={filters.friendliness}
                  onValueChange={(value) => setFilters({ ...filters, friendliness: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {friendlinessLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            共找到 <span className="font-bold text-[#165DFF]">{filteredJobs.length}</span> 个相关岗位
          </p>
          {searchQuery && (
            <p className="text-sm text-gray-500">
              搜索关键词：<span className="font-medium">{searchQuery}</span>
            </p>
          )}
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {filteredJobs.map((job) => (
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
                  {job.friendliness === '极度友好' && (
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
                  {job.tags.slice(0, 3).map((tag, idx) => (
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

        {/* Empty State */}
        {filteredJobs.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">未找到匹配的岗位</h3>
            <p className="text-gray-500 mb-4">试试调整筛选条件或搜索其他关键词</p>
            <Button variant="outline" onClick={handleReset}>重置筛选</Button>
          </div>
        )}

        {/* AI Query Hint */}
        <Card className="border-2 border-[#165DFF]/30 bg-gradient-to-r from-[#165DFF]/5 to-transparent">
          <CardContent className="p-6 text-center">
            <Sparkles className="w-8 h-8 text-[#165DFF] mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">没找到想要的岗位？</h3>
            <p className="text-gray-600 mb-4">试试让AI帮你搜索，获取更精准的岗位推荐和薪资分析</p>
            <Button 
              className="bg-[#165DFF] hover:bg-[#165DFF]/90"
              onClick={() => router.push('/assistant')}
            >
              去问AI助手
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function JobsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <JobsPage />
    </Suspense>
  );
}
