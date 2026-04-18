'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

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
  '全部', '极度友好（★★★★★）', '友好（★★★★☆）', '一般（★★★☆☆）', '不友好（★★☆☆☆）'
];

const mockJobs = [
  { id: 1, name: 'Java开发工程师', industry: '互联网/电商', city: '北京', companyType: '民营企业', salary: '15-25K', friendliness: '★★★★★' },
  { id: 2, name: '产品经理', industry: '互联网/电商', city: '上海', companyType: '上市公司', salary: '20-35K', friendliness: '★★★★☆' },
  { id: 3, name: '前端开发工程师', industry: '互联网/电商', city: '深圳', companyType: '外资企业', salary: '18-30K', friendliness: '★★★★★' },
  { id: 4, name: 'HRBP', industry: '互联网/电商', city: '杭州', companyType: '民营企业', salary: '12-20K', friendliness: '★★★★☆' },
  { id: 5, name: 'UI设计师', industry: '广告/传媒', city: '北京', companyType: '民营企业', salary: '10-18K', friendliness: '★★★★★' },
  { id: 6, name: '新媒体运营', industry: '广告/传媒', city: '广州', companyType: '民营企业', salary: '8-15K', friendliness: '★★★★☆' },
  { id: 7, name: '管培生', industry: '国企（综合类）', city: '上海', companyType: '国有企业', salary: '10-18K', friendliness: '★★★★★' },
  { id: 8, name: '数据分析师', industry: '金融（银行/证券/保险）', city: '深圳', companyType: '上市公司', salary: '15-28K', friendliness: '★★★★☆' },
  { id: 9, name: 'Python开发工程师', industry: '互联网/电商', city: '成都', companyType: '民营企业', salary: '14-24K', friendliness: '★★★★★' },
  { id: 10, name: '销售经理', industry: '零售（商超/电商零售）', city: '武汉', companyType: '民营企业', salary: '12-20K', friendliness: '★★★☆☆' },
  { id: 11, name: '行政专员', industry: '教育（K12/高等教育/职业教育）', city: '西安', companyType: '事业单位', salary: '6-10K', friendliness: '★★★★★' },
  { id: 12, name: '会计', industry: '金融（银行/证券/保险）', city: '南京', companyType: '国有企业', salary: '8-14K', friendliness: '★★★★☆' },
  { id: 13, name: '护士', industry: '医疗（医院/医药/器械）', city: '重庆', companyType: '事业单位', salary: '7-12K', friendliness: '★★★★★' },
  { id: 14, name: '教师', industry: '教育（K12/高等教育/职业教育）', city: '天津', companyType: '事业单位', salary: '8-15K', friendliness: '★★★★★' },
  { id: 15, name: '电商运营', industry: '零售（商超/电商零售）', city: '杭州', companyType: '民营企业', salary: '10-18K', friendliness: '★★★★☆' },
  { id: 16, name: '机械工程师', industry: '制造（汽车/电子/机械）', city: '苏州', companyType: '外资企业', salary: '12-20K', friendliness: '★★★★☆' },
  { id: 17, name: '法务专员', industry: '律所', city: '北京', companyType: '民营企业', salary: '10-18K', friendliness: '★★★☆☆' },
  { id: 18, name: '供应链管理', industry: '物流（快递/供应链）', city: '上海', companyType: '上市公司', salary: '12-22K', friendliness: '★★★★☆' },
  { id: 19, name: '品牌经理', industry: '广告/传媒', city: '广州', companyType: '民营企业', salary: '15-28K', friendliness: '★★★☆☆' },
  { id: 20, name: '工艺工程师', industry: '新能源（光伏/风电）', city: '深圳', companyType: '上市公司', salary: '13-22K', friendliness: '★★★★☆' },
];

export default function JobsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    industry: '全部',
    jobCategory: '全部',
    city: '全部',
    companyType: '全部',
    friendliness: '全部',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/assistant?query=${encodeURIComponent(searchQuery)}`;
    }
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

  const handleJobClick = (jobName: string) => {
    router.push(`/assistant?query=${encodeURIComponent(jobName)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            全行业岗位百科
          </h1>
          <p className="text-gray-600">覆盖15+主流行业，8大岗位类别</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Search Input */}
            <form onSubmit={handleSearch} className="w-full lg:w-80">
              <Input
                placeholder="搜索岗位名称，如：Java开发"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </form>

            {/* Industry Filter */}
            <div className="w-full lg:w-auto">
              <Select
                value={filters.industry}
                onValueChange={(value) => setFilters({ ...filters, industry: value })}
              >
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="行业大类" />
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

            {/* Job Category Filter */}
            <div className="w-full lg:w-auto">
              <Select
                value={filters.jobCategory}
                onValueChange={(value) => setFilters({ ...filters, jobCategory: value })}
              >
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="岗位大类" />
                </SelectTrigger>
                <SelectContent>
                  {jobCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City Filter */}
            <div className="w-full lg:w-auto">
              <Select
                value={filters.city}
                onValueChange={(value) => setFilters({ ...filters, city: value })}
              >
                <SelectTrigger className="w-full lg:w-36">
                  <SelectValue placeholder="工作城市" />
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

            {/* Company Type Filter */}
            <div className="w-full lg:w-auto">
              <Select
                value={filters.companyType}
                onValueChange={(value) => setFilters({ ...filters, companyType: value })}
              >
                <SelectTrigger className="w-full lg:w-36">
                  <SelectValue placeholder="企业类型" />
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

            {/* Friendliness Filter */}
            <div className="w-full lg:w-auto">
              <Select
                value={filters.friendliness}
                onValueChange={(value) => setFilters({ ...filters, friendliness: value })}
              >
                <SelectTrigger className="w-full lg:w-44">
                  <SelectValue placeholder="应届生友好度" />
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

            {/* Reset Button */}
            <Button
              variant="ghost"
              onClick={handleReset}
              className="w-full lg:w-auto border border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              重置筛选
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Jobs List */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {mockJobs.map((job) => (
                <Card
                  key={job.id}
                  className="cursor-pointer hover:border-[#165DFF] hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  onClick={() => handleJobClick(job.name)}
                >
                  <CardContent className="p-5">
                    <h3 className="text-base font-bold text-[#165DFF] mb-3 line-clamp-1">
                      {job.name}
                    </h3>
                    <div className="text-xs text-gray-500 mb-3 space-y-1">
                      <p>{job.industry} | {job.city}</p>
                      <p>{job.companyType}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#FF7D00]">{job.salary}</span>
                      <span className="text-xs text-gray-500">{job.friendliness}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>1</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">2</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">3</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              共 {mockJobs.length} 条岗位信息，当前第 1 页
            </p>
          </div>

          {/* Right Sidebar Ad */}
          <div className="lg:w-64">
            <div className="sticky top-32">
              <Card className="bg-gradient-to-br from-[#165DFF]/5 to-[#165DFF]/10 border-[#165DFF]/20">
                <CardContent className="p-6 text-center">
                  <p className="text-gray-700 mb-4 font-medium">
                    🔥 开通会员 无限次查岗位+做规划
                  </p>
                  <Link href="/membership">
                    <Button className="w-full bg-[#FF7D00] hover:bg-[#e67000] text-white">
                      立即开通
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
