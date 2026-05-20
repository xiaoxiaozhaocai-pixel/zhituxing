'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Brain, 
  CheckCircle, 
  Briefcase, 
  FileText,
  Rocket,
  Sparkles,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Copy,
  Check
} from 'lucide-react';
import { useState } from 'react';

const steps = [
  {
    step: 1,
    icon: <User className="w-10 h-10" />,
    title: '注册登录',
    description: '手机号一键注册，所有AI服务完全免费使用',
    details: [
      '输入手机号，60秒完成注册',
      '注册即送5次免费AI服务次数',
      '完善个人信息，获得更精准的推荐'
    ],
    color: 'bg-blue-50 border-blue-200'
  },
  {
    step: 2,
    icon: <Sparkles className="w-10 h-10" />,
    title: '职业匹配',
    description: '输入专业/年级，生成专属职业规划',
    details: [
      'AI智能分析你的专业背景',
      '生成3-5个最适合你的岗位推荐',
      '提供详细的匹配度分析和成长路径'
    ],
    color: 'bg-purple-50 border-purple-200'
  },
  {
    step: 3,
    icon: <Briefcase className="w-10 h-10" />,
    title: '岗位查询',
    description: '搜索目标岗位，查看真实JD和薪资',
    details: [
      '覆盖27个行业20,000+真实JD',
      '多维度筛选：城市/薪资/企业类型',
      '一键获取核心技能要求和准入门槛'
    ],
    color: 'bg-green-50 border-green-200'
  },
  {
    step: 4,
    icon: <Brain className="w-10 h-10" />,
    title: '模拟面试',
    description: '上传简历，体验1:1真实面试流程',
    details: [
      '1:1还原企业真实面试全流程',
      '实时点评你的回答，给出改进建议',
      '生成专属能力提升复盘报告'
    ],
    color: 'bg-orange-50 border-orange-200'
  },
  {
    step: 5,
    icon: <FileText className="w-10 h-10" />,
    title: '求职冲刺',
    description: '用简历模板+面试真题，轻松拿下offer',
    details: [
      '海量简历模板免费下载',
      '面试真题库持续更新',
      'AI简历优化，提升通过率'
    ],
    color: 'bg-pink-50 border-pink-200'
  }
];

const iconColors = [
  'text-blue-600 bg-blue-100',
  'text-purple-600 bg-purple-100',
  'text-green-600 bg-green-100',
  'text-orange-600 bg-orange-100',
  'text-pink-600 bg-pink-100'
];

export default function GuidePage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            职途星使用流程
          </h1>
          <p className="text-lg text-blue-100 mb-2">
            从注册到拿到offer，一站式求职服务
          </p>
          <p className="text-blue-200">
            只需5步，开启你的职业规划之旅
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {steps.map((item, index) => (
            <Card 
              key={item.step}
              className={`relative overflow-hidden border-2 ${item.color} transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group`}
            >
              <CardContent className="p-6">
                {/* Step Number */}
                <div className={`absolute top-4 right-4 w-8 h-8 rounded-full ${iconColors[index]} flex items-center justify-center text-sm font-bold`}>
                  {item.step}
                </div>
                
                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl ${iconColors[index]} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                  {item.icon}
                </div>
                
                {/* Title & Description */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 mb-4">{item.description}</p>
                
                {/* Details */}
                <ul className="space-y-2">
                  {item.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <Card className="mb-12 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200">
          <CardContent className="p-8 text-center">
            <Rocket className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              为什么选择职途星？
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">真实数据</h3>
                  <p className="text-sm text-gray-600">基于20,000+全行业真实招聘JD，信息准确可靠</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">AI智能</h3>
                  <p className="text-sm text-gray-600">7大AI智能体矩阵，全方位助你求职</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">完全免费</h3>
                  <p className="text-sm text-gray-600">注册即送5次免费AI服务，邀请好友得更多</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="mb-12 bg-white border-2 border-blue-100">
          <CardContent className="p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              遇到问题？我们随时为你服务
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">客服微信</p>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">zhituxing_kefu</span>
                    <button
                      onClick={() => copyToClipboard('zhituxing_kefu', 'wechat')}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {copied === 'wechat' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">商务合作邮箱</p>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">business@zhituxing.com</span>
                    <button
                      onClick={() => copyToClipboard('business@zhituxing.com', 'email')}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {copied === 'email' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">项目地址</p>
                  <p className="font-semibold text-gray-900">桂林电子科技大学</p>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-6">
              工作时间：周一至周五 9:00-18:00
            </p>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Link href="/assistant">
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              立即体验
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <p className="mt-4 text-gray-500">
            注册即送5次免费AI服务，无需信用卡
          </p>
        </div>
      </div>
    </div>
  );
}
