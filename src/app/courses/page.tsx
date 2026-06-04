'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Users, ChevronRight, Sparkles, MessageCircle } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';

interface CourseItem {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: '入门' | '进阶' | '实战';
  category: string;
  topics: string[];
  participants?: number;
}

const COURSES: CourseItem[] = [
  {
    id: 'resume-writing',
    title: '简历撰写实战',
    description: '从零到一打造一份让HR眼前一亮的简历。覆盖个人信息、教育背景、项目经历、技能证书等模块的撰写技巧。',
    duration: '约15分钟',
    level: '入门',
    category: '求职技能',
    topics: ['简历结构', 'STAR法则', '量化成果', '关键词优化'],
    participants: 1280,
  },
  {
    id: 'interview-prep',
    title: '面试通关秘籍',
    description: '结构化面试、行为面试、技术面试全攻略。包含常见问题拆解、回答框架和模拟练习。',
    duration: '约20分钟',
    level: '进阶',
    category: '面试技巧',
    topics: ['自我介绍', '行为面试', '反问技巧', '压力面试'],
    participants: 960,
  },
  {
    id: 'career-planning',
    title: '职业规划入门',
    description: '认识自己的兴趣和优势，了解不同行业的发展路径，制定3-5年职业发展计划。',
    duration: '约12分钟',
    level: '入门',
    category: '职业发展',
    topics: ['自我认知', '行业调研', '目标设定', '行动计划'],
    participants: 754,
  },
  {
    id: 'salary-negotiation',
    title: '薪资谈判指南',
    description: '了解市场薪资水平，掌握谈判技巧，学会评估offer整体价值而非只看薪资。',
    duration: '约10分钟',
    level: '进阶',
    category: '求职技能',
    topics: ['薪资结构', '谈判话术', '福利评估', 'offer对比'],
    participants: 520,
  },
  {
    id: 'networking',
    title: '职场人脉搭建',
    description: '如何利用LinkedIn、校园资源、校友网络搭建职业人脉，获取内推机会。',
    duration: '约8分钟',
    level: '入门',
    category: '职业发展',
    topics: ['LinkedIn优化', '校友网络', '信息面试', '社交礼仪'],
    participants: 340,
  },
  {
    id: 'workplace-softskills',
    title: '职场软技能提升',
    description: '沟通协作、时间管理、向上汇报——刚入职场最需要但学校不教的能力。',
    duration: '约18分钟',
    level: '实战',
    category: '职业发展',
    topics: ['有效沟通', '时间管理', '向上汇报', '冲突处理'],
    participants: 680,
  },
];

const LEVEL_STYLES: Record<string, string> = {
  '入门': 'bg-green-50 text-green-700 border-green-200',
  '进阶': 'bg-blue-50 text-blue-700 border-blue-200',
  '实战': 'bg-purple-50 text-purple-700 border-purple-200',
};

const CATEGORY_ICONS: Record<string, string> = {
  '求职技能': '📋',
  '面试技巧': '🎯',
  '职业发展': '🚀',
};

export default function CoursesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');

  const categories = ['全部', ...new Set(COURSES.map((c) => c.category))];
  const filteredCourses = selectedCategory === '全部'
    ? COURSES
    : COURSES.filter((c) => c.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Breadcrumb theme="light" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4" />

      {/* Header */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#1E40AF] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">互动课程</h1>
              <p className="text-blue-200 mt-1">AI驱动的沉浸式学习体验，边聊边学</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 课程特色 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: '🤖', title: 'AI互动教学', desc: '像和朋友聊天一样学习，随时提问' },
            { icon: '⚡', title: '碎片化学习', desc: '每课10-20分钟，随时随地开始' },
            { icon: '📊', title: '进度追踪', desc: '记录学习进度，看到自己的成长' },
          ].map((feature, i) => (
            <Card key={i} className="border-[#E2E8F0] hover:shadow-md transition">
              <CardContent className="py-5 text-center">
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h3 className="font-semibold text-[#1E293B] mb-1">{feature.title}</h3>
                <p className="text-sm text-[#64748B]">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 分类筛选 */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-[#1E3A8A] text-white'
                  : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:border-[#1E3A8A]'
              }`}
            >
              {cat}
            </button>
          ))}
          <Link href={`/assistant?bot=course`} className="ml-auto">
            <Button variant="outline" size="sm" className="border-[#1E3A8A] text-[#1E3A8A] whitespace-nowrap">
              <MessageCircle className="w-4 h-4 mr-1" />
              自由对话学习
            </Button>
          </Link>
        </div>

        {/* 课程列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="border-[#E2E8F0] hover:border-[#1E3A8A] hover:shadow-lg transition-all duration-300 group"
            >
              <CardContent className="p-6">
                {/* 分类 + 难度 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-[#64748B]">
                    {CATEGORY_ICONS[course.category] || '📖'} {course.category}
                  </span>
                  <Badge className={`text-xs border ${LEVEL_STYLES[course.level] || ''}`}>
                    {course.level}
                  </Badge>
                  {course.participants && (
                    <span className="text-xs text-[#94A3B8] ml-auto flex items-center gap-0.5">
                      <Users className="w-3 h-3" />
                      {course.participants > 1000
                        ? `${(course.participants / 1000).toFixed(1)}k`
                        : course.participants}
                    </span>
                  )}
                </div>

                {/* 标题 */}
                <h3 className="text-lg font-bold text-[#1E293B] mb-2 group-hover:text-[#1E3A8A] transition-colors">
                  {course.title}
                </h3>

                {/* 描述 */}
                <p className="text-sm text-[#64748B] mb-4 line-clamp-2">
                  {course.description}
                </p>

                {/* 话题标签 */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {course.topics.map((topic, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                </div>

                {/* 底部：时长 + 按钮 */}
                <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                  <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {course.duration}
                  </span>
                  <Link href={`/assistant?bot=course&topic=${course.id}`}>
                    <Button
                      size="sm"
                      className="bg-[#1E3A8A] hover:bg-[#1E40AF] text-white group-hover:shadow-md transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      开始学习
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 底部 CTA */}
        {filteredCourses.length === 0 && (
          <div className="text-center py-16 text-[#94A3B8]">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-lg font-medium text-[#64748B] mb-2">暂无该分类课程</p>
            <p className="text-sm mb-4">更多课程正在制作中，敬请期待</p>
            <Button variant="outline" onClick={() => setSelectedCategory('全部')}>
              查看全部课程
            </Button>
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 text-center">
          <h3 className="text-lg font-bold text-[#1E3A8A] mb-2">💡 学习建议</h3>
          <p className="text-sm text-[#475569] max-w-2xl mx-auto">
            建议从「简历撰写实战」开始，然后根据你的求职阶段选择相应课程。
            每门课后可以立即和小职对话练习，把学到的知识变成实际能力。
          </p>
        </div>
      </div>
    </div>
  );
}
