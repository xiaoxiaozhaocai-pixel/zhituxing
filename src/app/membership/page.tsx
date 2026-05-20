'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Crown, Check, Zap, BarChart3, Network, Route, Download, Sparkles, Star
} from 'lucide-react';

const BENEFITS = [
  { icon: <Zap className="w-5 h-5" />, title: 'AI对话', desc: '所有功能完全免费，不限次数' },
  { icon: <BarChart3 className="w-5 h-5" />, title: '匹配分析', desc: '查看岗位匹配+薪资估算' },
  { icon: <Network className="w-5 h-5" />, title: '技能图谱', desc: '技能关系+路径探索' },
  { icon: <Route className="w-5 h-5" />, title: '学习路径', desc: '个性化学习计划+进度追踪' },
  { icon: <Download className="w-5 h-5" />, title: '测评报告', desc: '历史对比+成长曲线+PDF导出' },
  { icon: <Sparkles className="w-5 h-5" />, title: '岗位搜索', desc: '搜索职位、查看详情' },
];

export default function MembershipPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4">
        {/* 标题 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200 mb-4">
            <Star className="w-5 h-5" /> 完全免费
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            职途星，全部功能免费开放
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            无需付费，所有功能完全免费使用。AI对话、岗位匹配、技能图谱、学习路径，统统不限次数！
          </p>
        </div>

        {/* 免费提示卡片 */}
        <Card className="mb-8 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800 mb-2">
                  ¥0.00
                  <span className="text-sm font-normal text-gray-500 ml-2">永久免费</span>
                </div>
                <Badge className="bg-green-500 text-white">全功能已解锁</Badge>
              </div>
              <p className="text-sm text-gray-600 text-center max-w-md">
                我们相信每个大学生都应该获得高质量的就业指导，因此所有功能完全免费开放，无任何隐藏收费。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 功能列表 */}
        <Card className="mb-8 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
              <Star className="w-5 h-5 text-green-500" /> 免费功能列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className="text-green-500">{b.icon}</span>
                  <div>
                    <div className="font-medium text-gray-800">{b.title}</div>
                    <div className="text-sm text-gray-500">{b.desc}</div>
                  </div>
                  <Check className="w-5 h-5 text-green-500 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <p className="text-center text-sm text-gray-500">
          职途星致力于帮助大学生找到职业方向，所有功能永久免费开放 ✨
        </p>
      </div>
    </div>
  );
}
