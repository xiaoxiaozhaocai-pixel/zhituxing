'use client';

import Link from 'next/link';
import { 
  Sparkles, Target, Users, Shield, GraduationCap, 
  Briefcase, MessageSquare, TrendingUp, Heart,
  ArrowRight, MapPin
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const highlights = [
  {
    icon: <GraduationCap className="w-6 h-6" />,
    title: '专注大学生',
    description: '面向在校大学生和应届毕业生，提供从大一到毕业的全周期职业规划服务'
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'AI 驱动',
    description: '基于大模型智能分析20000+真实岗位数据，精准匹配你的专业和技能'
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: '数据合规',
    description: '岗位数据均来源于政府及公益性招聘平台，信息真实可靠、来源可溯'
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: '持续迭代',
    description: '每周更新岗位数据，持续优化AI模型，让你的求职信息始终领先一步'
  }
];

const features = [
  { icon: <MessageSquare className="w-5 h-5" />, name: 'AI职业规划', desc: '基于真实岗位数据的个性化职业方向推荐' },
  { icon: <Briefcase className="w-5 h-5" />, name: '岗位匹配', desc: '20000+岗位智能筛选，精准匹配你的条件' },
  { icon: <Target className="w-5 h-5" />, name: '能力测评', desc: '多维度评估硬技能、软技能与职业性格' },
  { icon: <Sparkles className="w-5 h-5" />, name: '模拟面试', desc: 'AI模拟真实面试场景，告别面试紧张' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm text-blue-100 mb-6">
            <MapPin className="w-4 h-4" />
            广西 · 桂林电子科技大学
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-6">
            让每个大学生<br />都有专属的AI求职伙伴
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            职途星由桂电学生团队打造，致力于用AI技术降低求职信息差，
            帮助大学生科学规划职业方向，找到真正适合自己的工作。
          </p>
          <div className="flex gap-4 justify-center mt-8">
            <Link href="/jobs">
              <Button className="bg-white text-blue-600 hover:bg-blue-50 h-12 px-8 text-base">
                <Briefcase className="w-5 h-5 mr-2" />
                开始探索岗位
              </Button>
            </Link>
            <Link href="/assistant">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 h-12 px-8 text-base">
                <MessageSquare className="w-5 h-5 mr-2" />
                和小职聊聊
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Story */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">我们的故事</h2>
          <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
            作为大学生，我们深知求职过程中的迷茫与焦虑——
            不知道什么岗位适合自己、不了解行业真实需求、不会写简历、害怕面试。
            于是我们决定，用自己学到的技术，为同样处境的同学打造一个真正有用的AI求职助手。
          </p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {highlights.map((item, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-16">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">核心功能</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-4 p-4 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{feature.name}</h4>
                  <p className="text-sm text-gray-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-12 border border-blue-100">
          <Heart className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">和我们一起成长</h3>
          <p className="text-gray-600 mb-6">
            职途星还在持续迭代中，欢迎提出建议和反馈
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/contact">
              <Button className="bg-blue-600 hover:bg-blue-700">
                联系我们
              </Button>
            </Link>
            <Link href="/faq">
              <Button variant="outline" className="border-blue-300 text-blue-600">
                常见问题
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
