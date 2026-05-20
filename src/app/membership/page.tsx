'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMembership } from '@/contexts/MembershipContext';
import PaywallModal from '@/components/PaywallModal';
import {
  Crown, Check, Zap, BarChart3, Network, Route, Download, Sparkles, Shield, Star
} from 'lucide-react';

const BENEFITS = [
  { icon: <Zap className="w-5 h-5" />, title: 'AI对话', desc: '免费用户每日3次，基础版50次，会员不限次数', free: '3次/天', basic: '50次/天', member: '无限' },
  { icon: <BarChart3 className="w-5 h-5" />, title: '匹配分析', desc: '查看岗位匹配+薪资估算', free: '基础匹配', basic: '基础分析', member: '完整分析' },
  { icon: <Network className="w-5 h-5" />, title: '技能图谱', desc: '技能关系+路径探索', free: '1层关系', basic: '1层关系', member: '无限层级' },
  { icon: <Route className="w-5 h-5" />, title: '学习路径', desc: '个性化学习计划+进度追踪', free: '3条路径', basic: '5条路径', member: '全部路径' },
  { icon: <Download className="w-5 h-5" />, title: '测评报告', desc: '历史对比+成长曲线+PDF导出', free: '最近1次', basic: '最近3次', member: '全部历史' },
  { icon: <Sparkles className="w-5 h-5" />, title: '岗位搜索', desc: '搜索职位、查看详情', free: '无限制', basic: '无限制', member: '无限制' },
];

const PLANS = [
  {
    key: 'monthly',
    name: '基础版',
    price: 9.9,
    originalPrice: 19.9,
    period: '月',
    highlight: false,
    tag: '入门首选',
    features: ['30天基础体验', '每日50次AI对话', '岗位搜索无限制', '基础匹配分析', '1层技能图谱'],
  },
  {
    key: 'semester',
    name: '学期会员',
    price: 29.9,
    originalPrice: 49.9,
    period: '半年',
    highlight: false,
    features: ['180天全功能体验', '无限AI对话', '完整匹配分析', '技能图谱全览'],
  },
  {
    key: 'annual',
    name: '年度会员',
    price: 99,
    originalPrice: 199,
    period: '年',
    highlight: true,
    tag: '最受欢迎',
    features: ['365天全功能体验', '无限AI对话', '完整匹配分析', '技能图谱全览', '测评报告下载', '学习路径定制'],
  },
  {
    key: 'lifetime',
    name: '永久会员',
    price: 199,
    originalPrice: 399,
    period: '永久',
    highlight: false,
    tag: '超值',
    features: ['一次付费永久使用', '全功能无限制', '优先体验新功能', '专属客服支持'],
  },
];

export default function MembershipPage() {
  const { isMember, membershipPlan, expiresAt, upgrade } = useMembership();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const handleUpgrade = async (planKey: string) => {
    setUpgrading(planKey);
    await upgrade(planKey);
    setUpgrading(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4">
        {/* 标题 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200 mb-4">
            <Crown className="w-5 h-5" /> 职途星会员
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            解锁全部职业发展功能
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            从"能对话"到"有数据价值"——量化匹配、结构化页面、会员体系，助你精准规划职业路径
          </p>
        </div>

        {/* 当前会员状态 */}
        {isMember && (
          <Card className="mb-8 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 flex items-center gap-2">
                      {membershipPlan || '会员用户'}
                      <Badge className="bg-amber-500 text-white text-xs">VIP</Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {expiresAt
                        ? `有效期至 ${new Date(expiresAt).toLocaleDateString('zh-CN')}`
                        : '永久有效'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-600">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm font-medium">全功能已解锁</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 权益对比 */}
        <Card className="mb-8 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" /> 权益对比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">功能</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">免费用户</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-blue-600">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4" /> 基础版
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-amber-600">
                      <div className="flex items-center justify-center gap-1">
                        <Crown className="w-4 h-4" /> 会员
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {BENEFITS.map((b) => (
                    <tr key={b.title} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{b.icon}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-700">{b.title}</div>
                            <div className="text-xs text-gray-400">{b.desc}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-400">{b.free}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                          <Check className="w-4 h-4" /> {b.basic}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600">
                          <Check className="w-4 h-4" /> {b.member}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 套餐选择 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {PLANS.map((plan) => (
            <Card
              key={plan.key}
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                plan.highlight
                  ? 'border-amber-300 ring-2 ring-amber-100 shadow-md'
                  : 'border-gray-200'
              }`}
            >
              {plan.tag && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  {plan.tag}
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-gray-800">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    <span className="text-base">¥</span>{plan.price}
                  </span>
                  <span className="text-sm text-gray-400 line-through">¥{plan.originalPrice}</span>
                  <span className="text-xs text-gray-400">/{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white'
                      : 'bg-[#165DFF] hover:bg-[#165DFF]/90 text-white'
                  }`}
                  onClick={() => isMember ? null : handleUpgrade(plan.key)}
                  disabled={isMember || upgrading === plan.key}
                >
                  {upgrading === plan.key ? (
                    '升级中...'
                  ) : isMember ? (
                    '当前已是会员'
                  ) : (
                    <span className="flex items-center gap-1">
                      <Crown className="w-4 h-4" /> 立即开通
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 底部提示 */}
        <p className="text-center text-xs text-gray-400">
          演示模式：点击套餐即可直接升级（实际项目中需接入支付系统）
        </p>
      </div>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature="会员功能" />
    </div>
  );
}
