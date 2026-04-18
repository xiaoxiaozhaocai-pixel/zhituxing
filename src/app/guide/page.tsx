import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { User, Brain, CheckCircle } from 'lucide-react';

const steps = [
  {
    step: 1,
    icon: <User className="w-12 h-12 text-[#165DFF]" />,
    title: '输入你的信息',
    description: '输入你的专业、年级、兴趣和求职意向',
    details: [
      '填写你的基本信息（专业、年级、学历）',
      '描述你的兴趣爱好和特长',
      '告诉我们你的求职意向城市和行业'
    ]
  },
  {
    step: 2,
    icon: <Brain className="w-12 h-12 text-[#165DFF]" />,
    title: 'AI智能分析',
    description: '基于15+行业真实招聘数据，多维度匹配适合你的岗位',
    details: [
      '分析500万+全行业真实职业数据',
      '匹配你的性格、能力和兴趣',
      '计算岗位适配度和成功率'
    ]
  },
  {
    step: 3,
    icon: <CheckCircle className="w-12 h-12 text-[#165DFF]" />,
    title: '获取专属方案',
    description: '获得岗位详情、成长路径和求职技巧，可下载完整报告',
    details: [
      '查看推荐岗位的详细信息',
      '获取大一到大四的分阶段成长计划',
      '下载PDF格式的完整职业规划报告'
    ]
  }
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            3步搞定全行业职业规划
          </h1>
          <p className="text-lg text-gray-600">
            简单三步，获得专属你的职业发展方案
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={step.step} className="relative">
              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-12 top-24 bottom-0 w-0.5 bg-[#165DFF]/20 hidden md:block" />
              )}

              <div className="flex flex-col md:flex-row gap-6">
                {/* Step Number & Icon */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-white rounded-full shadow-lg border-4 border-[#165DFF]/20 flex items-center justify-center relative">
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-[#165DFF] text-white rounded-full flex items-center justify-center text-lg font-bold">
                      {step.step}
                    </span>
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <Card className="border-2 border-gray-100 hover:border-[#165DFF]/20 transition-all duration-300">
                    <CardContent className="p-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-3">
                        {step.title}
                      </h2>
                      <p className="text-lg text-gray-600 mb-6">
                        {step.description}
                      </p>
                      <ul className="space-y-3">
                        {step.details.map((detail, detailIndex) => (
                          <li key={detailIndex} className="flex items-start">
                            <div className="w-6 h-6 bg-[#165DFF]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                              <CheckCircle className="w-4 h-4 text-[#165DFF]" />
                            </div>
                            <span className="text-gray-700">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-br from-[#165DFF]/5 to-[#165DFF]/10 border-[#165DFF]/20">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                准备好了吗？立即开始你的职业规划之旅
              </h3>
              <p className="text-gray-600 mb-6">
                每月5次免费AI服务，助你找到理想工作
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/assistant">
                  <button className="bg-[#165DFF] hover:bg-[#165DFF]/90 text-white px-8 py-3 rounded-lg font-medium transition-colors">
                    立即开始
                  </button>
                </Link>
                <Link href="/">
                  <button className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 rounded-lg font-medium transition-colors">
                    返回首页
                  </button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
