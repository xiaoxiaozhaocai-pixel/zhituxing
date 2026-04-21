'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, BookOpen, GraduationCap, Briefcase, Loader2, Eye, Sparkles, ArrowRight } from 'lucide-react';

const categories = [
  { id: 'all', name: '全部', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'resume', name: '简历指南', icon: <FileText className="w-4 h-4" /> },
  { id: 'interview', name: '面试技巧', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'career', name: '职业规划', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'industry', name: '行业洞察', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'tips', name: '求职干货', icon: <BookOpen className="w-4 h-4" /> },
];

interface Article {
  id: string;
  title: string;
  summary: string | null;
  coverImage: string | null;
  category: string;
  tags: string[];
  views: number;
  isFeatured: boolean;
  author: string | null;
  createdAt: string;
}

export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, [activeCategory]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const url = activeCategory === 'all'
        ? '/api/articles?limit=50'
        : `/api/articles?category=${activeCategory}&limit=50`;
      
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setArticles(data.data.articles);
      }
    } catch (error) {
      console.error('获取文章失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  // 默认展示数据（当API无数据时）
  const defaultResources = [
    {
      id: 'default-1',
      title: '互联网行业简历模板合集',
      summary: '包含前端、后端、产品、运营等各岗位简历模板',
      category: 'resume',
      createdAt: '2026-01-15',
      views: 1256,
      isFeatured: false
    },
    {
      id: 'default-2',
      title: 'HR面试100问及参考答案',
      summary: '常见HR面试问题及专业回答技巧',
      category: 'interview',
      createdAt: '2026-01-12',
      views: 2341,
      isFeatured: true
    },
    {
      id: 'default-3',
      title: '2026年互联网行业薪资报告',
      summary: '全行业薪资水平及岗位需求分析',
      category: 'industry',
      createdAt: '2026-01-10',
      views: 1876,
      isFeatured: true
    },
    {
      id: 'default-4',
      title: '无经验如何写好第一份简历',
      summary: '应届生和实习生简历撰写技巧',
      category: 'resume',
      createdAt: '2026-01-08',
      views: 987,
      isFeatured: false
    },
    {
      id: 'default-5',
      title: '技术岗面试真题合集',
      summary: 'Java、Python、前端等技术岗位面试题',
      category: 'interview',
      createdAt: '2026-01-03',
      views: 1543,
      isFeatured: false
    },
    {
      id: 'default-6',
      title: '大学生职业规划指南',
      summary: '从大一到大四，如何规划你的职业生涯',
      category: 'career',
      createdAt: '2026-01-01',
      views: 2134,
      isFeatured: true
    },
  ];

  const displayResources = articles.length > 0 ? articles : defaultResources;
  const filteredResources = activeCategory === 'all'
    ? displayResources
    : displayResources.filter((r: Article | typeof defaultResources[0]) => r.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      {/* 职业规划提示 */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 mb-8">
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
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            求职干货库
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
                  ? 'bg-[#165DFF] text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-[#165DFF] hover:text-[#165DFF] hover:bg-blue-50'
              }`}
            >
              {category.icon}
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* Resources List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <Card
                key={resource.id}
                className="border-2 border-gray-100 hover:border-[#165DFF]/20 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(22,93,255,0.12)] hover:-translate-y-2 relative"
              >
                {'isFeatured' in resource && resource.isFeatured && (
                  <span className="absolute top-3 right-3 bg-[#FF7D00] text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-sm z-10">
                    精选
                  </span>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2 pr-16">
                    {resource.title}
                  </CardTitle>
                  <CardDescription className="mt-2 line-clamp-2 text-gray-500">
                    {resource.summary}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(resource.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {resource.views}
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href={`/resources/${resource.id}`} className="w-full">
                    <Button className="w-full bg-[#165DFF] hover:bg-[#165DFF]/90 hover:shadow-lg hover:-translate-y-0.5 text-white transition-all duration-300">
                      查看详情
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {filteredResources.length === 0 && !loading && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">暂无相关资源</p>
          </div>
        )}
      </div>
    </div>
  );
}
