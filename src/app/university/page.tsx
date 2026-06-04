'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Bot,
  FileText,
  Target,
  ArrowRight,
  CheckCircle2,
  Building2,
  Users,
  Sparkles,
} from 'lucide-react';

const advantages = [
  {
    icon: <Bot className="w-8 h-8" />,
    title: 'AI 模拟面试',
    description: '基于真实面试场景的 AI 模拟训练，覆盖技术面、行为面、群面等多种形式，让学生在校即可获得真实面试体验。',
    badges: ['DeepSeek 驱动', '多场景覆盖'],
  },
  {
    icon: <FileText className="w-8 h-8" />,
    title: '智能简历优化',
    description: 'AI 深度分析简历内容，结合岗位 JD 智能优化，提升简历与目标岗位的匹配度，帮助学生脱颖而出。',
    badges: ['一键优化', 'ATS 友好'],
  },
  {
    icon: <Target className="w-8 h-8" />,
    title: '职业测评',
    description: '多维度职业能力测评，精准绘制学生技能画像，为就业指导提供数据支撑，实现个性化职业规划。',
    badges: ['数据驱动', '能力图谱'],
  },
];

const steps = [
  {
    step: '01',
    title: '提交申请',
    description: '填写高校基本信息与合作需求，我们的团队将在 24 小时内与您联系确认。',
  },
  {
    step: '02',
    title: '快速部署',
    description: '为高校开通专属管理后台，配置学生账号体系，一周内即可完成平台部署上线。',
  },
  {
    step: '03',
    title: '学生使用',
    description: '学生通过学校账号登录，即刻享受 AI 求职辅导服务，提升就业竞争力。',
  },
];

const partnerUniversities = [
  '桂林电子科技大学',
  '桂林理工大学',
  '广西师范大学',
  '南宁学院',
  '广西科技大学',
];

export default function UniversityPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#2563EB]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm bg-white/20 text-blue-100 border-blue-300/30">
              <GraduationCap className="w-4 h-4 mr-2" />
              高校合作计划
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
              为高校打造的
              <span className="block mt-2 bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
                一站式 AI 求职平台
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-blue-100/90 leading-relaxed">
              融合 DeepSeek 大模型能力，为高校就业指导中心提供 AI 模拟面试、智能简历优化、职业测评等全链路求职辅导工具，
              助力高校提升毕业生就业质量与效率。
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact?type=university">
                <Button size="lg" className="bg-white text-[#1E3A8A] hover:bg-blue-50 font-semibold text-base px-8 py-6 shadow-lg shadow-blue-900/30">
                  申请合作
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/guide">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-base px-8 py-6">
                  了解更多
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-[#1E3A8A] border-y border-blue-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '5+', label: '合作高校' },
              { value: '20,000+', label: '服务学生' },
              { value: '92%', label: '就业满意率' },
              { value: '24h', label: '响应时间' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-blue-200/70 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages Section */}
      <section className="py-20 md:py-28 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 bg-[#1E3A8A]/10 text-[#1E3A8A] border-[#1E3A8A]/20">
              核心优势
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              三大核心能力，全方位赋能高校就业
            </h2>
            <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">
              从模拟面试到简历优化再到职业测评，我们为高校提供完整的 AI 就业辅导解决方案。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {advantages.map((adv, idx) => (
              <Card key={idx} className="border-0 shadow-lg shadow-gray-200/60 hover:shadow-xl hover:shadow-blue-100/40 transition-all duration-300 group">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center text-[#1E3A8A] group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors duration-300">
                    {adv.icon}
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-gray-900">{adv.title}</h3>
                  <p className="mt-3 text-gray-500 leading-relaxed">{adv.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {adv.badges.map((b) => (
                      <Badge key={b} variant="outline" className="text-xs bg-[#1E3A8A]/5 text-[#1E3A8A] border-[#1E3A8A]/20">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 bg-[#1E3A8A]/10 text-[#1E3A8A] border-[#1E3A8A]/20">
              合作流程
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              三步轻松接入，快速落地
            </h2>
            <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">
              从申请到学生使用，仅需三步即可完成高校专属 AI 求职平台部署。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s, idx) => (
              <div key={idx} className="relative text-center">
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-[#1E3A8A]/30 to-[#1E3A8A]/10" />
                )}
                <div className="relative z-10 w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] flex items-center justify-center shadow-lg shadow-blue-200/50">
                  <span className="text-2xl font-bold text-white">{s.step}</span>
                </div>
                <h3 className="mt-6 text-xl font-bold text-gray-900">{s.title}</h3>
                <p className="mt-3 text-gray-500 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[#1E3A8A] to-[#1E40AF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles className="w-12 h-12 text-blue-200 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            携手打造高校 AI 就业新生态
          </h2>
          <p className="mt-4 text-lg text-blue-100/80 max-w-2xl mx-auto">
            已有 5+ 高校加入职途星合作计划，帮助学生获得更优质的 AI 求职辅导服务。
            立即申请，成为下一个合作高校。
          </p>
          <div className="mt-10">
            <Link href="/contact?type=university">
              <Button size="lg" className="bg-white text-[#1E3A8A] hover:bg-blue-50 font-semibold text-base px-10 py-6 shadow-xl shadow-blue-900/30">
                <Building2 className="w-5 h-5 mr-2" />
                申请合作
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Partner Universities */}
      <section className="py-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Users className="w-5 h-5 text-[#1E3A8A]" />
            <span className="text-sm font-medium text-[#1E3A8A] uppercase tracking-wider">已合作高校</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {partnerUniversities.map((name) => (
              <div
                key={name}
                className="px-6 py-3 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center gap-2 text-gray-700 font-medium hover:border-[#1E3A8A]/30 hover:shadow-md transition-all"
              >
                <GraduationCap className="w-4 h-4 text-[#1E3A8A]" />
                {name}
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-gray-400">
            更多高校正在加入中…
          </p>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500">
            有任何问题？{' '}
            <Link href="/contact" className="text-[#1E3A8A] font-medium hover:underline">
              联系我们
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
