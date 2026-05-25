'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Crown, Check, Zap, BarChart3, Network, Route, Download, Sparkles, Star, Shield
} from 'lucide-react';

const MEMBERSHIP_PLANS = [
  {
    name: '学期会员',
    price: 29.9,
    period: '学期',
    description: '适合短期求职准备',
    features: [
      '无限AI对话次数',
      '完整岗位匹配分析',
      '技能图谱全功能',
      '学习路径规划',
      '测评报告PDF导出',
      '4个月有效期'
    ],
    popular: false
  },
  {
    name: '年度会员',
    price: 99,
    period: '年',
    description: '最受欢迎的选择',
    features: [
      '无限AI对话次数',
      '完整岗位匹配分析',
      '技能图谱全功能',
      '学习路径规划',
      '测评报告PDF导出',
      'AI模拟面试无限次',
      '职业规划深度分析',
      '12个月有效期'
    ],
    popular: true
  },
  {
    name: '永久会员',
    price: 199,
    period: '永久',
    description: '一次购买终身使用',
    features: [
      '所有年度会员权益',
      '永久有效无限制',
      '优先新功能体验',
      '专属客服支持',
      '简历优化服务',
      '求职指导咨询'
    ],
    popular: false
  }
];

const FREE_BENEFITS = [
  { icon: <Zap className="w-5 h-5" />, title: 'AI对话', desc: '每日10次对话' },
  { icon: <BarChart3 className="w-5 h-5" />, title: '匹配分析', desc: '基础岗位匹配' },
  { icon: <Network className="w-5 h-5" />, title: '技能图谱', desc: '查看技能关系' },
  { icon: <Sparkles className="w-5 h-5" />, title: '岗位搜索', desc: '搜索职位、查看详情' },
];

export default function MembershipPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* 标题 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200 mb-4">
            <Crown className="w-5 h-5" /> 会员中心
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            解锁全部功能，加速职业发展
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            选择适合你的会员套餐，享受无限AI对话、深度分析、专业报告等高级功能
          </p>
        </div>

        {/* 会员套餐卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {MEMBERSHIP_PLANS.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                plan.popular 
                  ? 'border-blue-500 ring-2 ring-blue-500/20 scale-[1.02]' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs px-3 py-1 rounded-bl-lg">
                  最受欢迎
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {plan.name}
                  {plan.popular && <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                </CardTitle>
                <p className="text-sm text-gray-500">{plan.description}</p>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">¥{plan.price}</span>
                  <span className="text-sm text-gray-500 ml-1">/{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600' 
                      : 'bg-gray-800 hover:bg-gray-900'
                  }`}
                >
                  立即开通
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 免费用户权益 */}
        <Card className="mb-8 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" /> 免费用户权益
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FREE_BENEFITS.map((b) => (
                <div key={b.title} className="flex items-center gap-3 p-4 rounded-lg bg-gray-50">
                  <span className="text-blue-500">{b.icon}</span>
                  <div>
                    <div className="font-medium text-gray-800">{b.title}</div>
                    <div className="text-sm text-gray-500">{b.desc}</div>
                  </div>
                  <Check className="w-5 h-5 text-green-500 ml-auto" />
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              免费用户可体验基础功能，升级会员解锁全部能力 ✨
            </p>
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">
            所有套餐均支持发票开具，如有问题请联系客服
          </p>
          <p className="text-xs text-gray-400">
            职途星 — 让每个大学生都能获得专业的就业指导
          </p>
        </div>
      </div>
    </div>
  );
}
