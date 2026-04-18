'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, BookOpen, GraduationCap, Briefcase } from 'lucide-react';

const categories = [
  { id: 'all', name: '全部', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'resume', name: '简历模板', icon: <FileText className="w-4 h-4" /> },
  { id: 'interview', name: '面试题库', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'report', name: '行业报告', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'tips', name: '求职技巧', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'campus', name: '校招信息', icon: <GraduationCap className="w-4 h-4" /> },
];

const resources = [
  {
    id: 1,
    title: '互联网行业简历模板合集',
    description: '包含前端、后端、产品、运营等各岗位简历模板',
    category: 'resume',
    date: '2026-01-15',
    isFree: true
  },
  {
    id: 2,
    title: 'HR面试100问及参考答案',
    description: '常见HR面试问题及专业回答技巧',
    category: 'interview',
    date: '2026-01-12',
    isFree: true
  },
  {
    id: 3,
    title: '2026年互联网行业薪资报告',
    description: '全行业薪资水平及岗位需求分析',
    category: 'report',
    date: '2026-01-10',
    isFree: false
  },
  {
    id: 4,
    title: '无经验如何写好第一份简历',
    description: '应届生和实习生简历撰写技巧',
    category: 'tips',
    date: '2026-01-08',
    isFree: true
  },
  {
    id: 5,
    title: '2026春季校园招聘信息汇总',
    description: '各大企业校招时间线及投递链接',
    category: 'campus',
    date: '2026-01-05',
    isFree: true
  },
  {
    id: 6,
    title: '技术岗面试真题合集',
    description: 'Java、Python、前端等技术岗位面试题',
    category: 'interview',
    date: '2026-01-03',
    isFree: false
  },
];

export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredResources = activeCategory === 'all'
    ? resources
    : resources.filter(r => r.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            📚 求职干货库
          </h1>
          <p className="text-lg text-gray-600">
            免费提供海量求职资料，助你顺利拿到offer
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-full transition-all duration-300 ${
                activeCategory === category.id
                  ? 'bg-[#165DFF] text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-[#165DFF] hover:text-[#165DFF]'
              }`}
            >
              {category.icon}
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* Resources List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            <Card
              key={resource.id}
              className="border-2 border-gray-100 hover:border-[#165DFF]/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {resource.title}
                    </CardTitle>
                    <CardDescription className="mt-2">{resource.description}</CardDescription>
                  </div>
                  {!resource.isFree && (
                    <span className="bg-[#165DFF] text-white text-xs font-medium px-2 py-1 rounded">
                      会员专享
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  {resource.date}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className={resource.isFree ? 'w-full' : 'w-full bg-[#165DFF] hover:bg-[#165DFF]/90 text-white'}
                >
                  {resource.isFree ? '查看详情' : '会员查看'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {filteredResources.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无相关资源</p>
          </div>
        )}
      </div>
    </div>
  );
}
