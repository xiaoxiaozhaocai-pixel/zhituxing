import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Breadcrumb from '@/components/Breadcrumb';
import { BarChart3, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';

const dimensions = [
  {
    icon: '🧠',
    name: '自我认知',
    desc: '你有多了解自己擅长什么、在乎什么',
  },
  {
    icon: '🧭',
    name: '职业方向',
    desc: '是否有清晰的求职目标与路径',
  },
  {
    icon: '🔧',
    name: '技能匹配',
    desc: '是否掌握了目标岗位需要的核心能力',
  },
  {
    icon: '📋',
    name: '求职准备',
    desc: '简历、面试、行动节奏是否到位',
  },
];

export default function AssessmentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-24 pb-16">
      <Breadcrumb theme="light" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" />
      <div className="max-w-4xl mx-auto px-4">
        {/* 主卡片 */}
        <Card className="border-blue-100 overflow-hidden mb-6">
          <div className="h-1.5 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF]" />
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <BarChart3 className="w-8 h-8 text-[#165DFF]" />
            </div>
            <h1 className="text-3xl font-bold text-[#1E293B] mb-3">能力测评</h1>
            <p className="text-[#64748B] text-lg mb-2">先认识自己，再找到方向</p>
            <p className="text-[#94A3B8] max-w-lg mx-auto">
              用 12 道题、3 分钟，从四个维度快速摸清你的求职准备度，测评结果直接帮你知道下一步该做什么。
            </p>

            {/* 维度卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl mx-auto mt-8">
              {dimensions.map((d) => (
                <Card key={d.name} className="border-[#E2E8F0]">
                  <CardContent className="py-4">
                    <div className="text-2xl mb-1">{d.icon}</div>
                    <div className="font-medium text-[#1E293B] text-sm mb-1">{d.name}</div>
                    <div className="text-xs text-[#94A3B8]">{d.desc}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
              <Link href="/assessment/quiz">
                <Button className="w-full sm:w-auto bg-[#165DFF] hover:bg-[#3D7FFF] gap-2">
                  <Sparkles className="w-4 h-4" />
                  开始测评 · 3 分钟出结果
                </Button>
              </Link>
              <Link href="/growth">
                <Button variant="outline" className="w-full sm:w-auto gap-2">
                  <RefreshCw className="w-4 h-4" />
                  查看历史测评
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 价值说明 */}
        <Card className="border-[#E2E8F0]">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <ArrowRight className="w-4 h-4 text-[#165DFF]" />
              </div>
              <div>
                <h3 className="font-medium text-[#1E293B] text-base mb-1">测评之后，你会知道</h3>
                <ul className="text-sm text-[#64748B] space-y-1.5">
                  <li>· 你的优势维度与待提升短板</li>
                  <li>· 你当前处于求职准备的哪个阶段</li>
                  <li>· 下一步该先去生成职业规划，还是去匹配岗位、补技能</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
