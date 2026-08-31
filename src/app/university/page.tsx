import type { Metadata } from 'next';
import Link from 'next/link';
import { GraduationCap, ArrowRight, Building2, Users, Sparkles, Bot, FileText, Target } from 'lucide-react';
import { SCHOOLS } from '@/lib/seo/schools';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: '学校专区 — 查你的学校能投什么岗位 | 职途星',
  description:
    '职途星学校就业专区：了解你的学校概况、本专业能投哪些岗位、薪资地域分布。首批覆盖桂林电子科技大学，持续扩展中。',
  openGraph: {
    title: '学校专区 | 职途星',
    description:
      '职途星学校就业专区：了解你的学校概况、本专业能投哪些岗位、薪资地域分布。',
    locale: 'zh_CN',
    type: 'website',
    siteName: '职途星',
    url: `${SITE_URL}/university`,
  },
  alternates: {
    canonical: `${SITE_URL}/university`,
  },
};

/* ============================================================
 * 学校卡片
 * ============================================================ */
function SchoolCard({ school }: { school: (typeof SCHOOLS)[number] }) {
  return (
    <Link
      href={`/university/${school.slug}`}
      className="block p-6 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-[#165DFF]/10 flex items-center justify-center text-[#165DFF] group-hover:bg-[#165DFF] group-hover:text-white transition-colors duration-300">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-900 truncate">{school.name}</h3>
          <p className="text-xs text-slate-400">
            {school.shortName} · {school.type} · {school.city}
          </p>
        </div>
      </div>
      {school.highlights.length > 0 ? (
        <p className="text-sm text-slate-500 leading-relaxed mb-3 line-clamp-2">
          {school.highlights.join(' · ')}
        </p>
      ) : (
        <p className="text-sm text-slate-400 italic mb-3">数据待积累 — 详情持续完善中</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {school.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-xs px-2 py-0.5 bg-slate-50 text-slate-500 rounded border border-gray-100"
            >
              {t}
            </span>
          ))}
        </div>
        <span className="text-sm text-[#165DFF] font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
          查看详情 <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}

/* ============================================================
 * 页面主体
 * ============================================================ */
export default function UniversityPage() {
  const advantages = [
    {
      icon: <Bot className="w-8 h-8" />,
      title: 'AI 模拟面试',
      desc: '基于真实面试场景的AI模拟训练，覆盖技术面、行为面等多种形式。',
      badges: ['DeepSeek驱动', '多场景覆盖'],
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: '智能简历优化',
      desc: 'AI深度分析简历，结合岗位JD智能优化，提升匹配度。',
      badges: ['一键优化', 'ATS友好'],
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: '职业测评',
      desc: '多维度职业能力测评，精准绘制学生技能画像。',
      badges: ['数据驱动', '能力图谱'],
    },
  ];

  const steps = [
    { step: '01', title: '提交申请', desc: '填写高校基本信息与合作需求，24小时内联系确认。' },
    { step: '02', title: '快速部署', desc: '开通专属管理后台，配置学生账号，一周内上线。' },
    { step: '03', title: '学生使用', desc: '学生通过学校账号登录，即刻享受AI求职辅导。' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ==================== 学校专区（学生视角） ==================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#165DFF] to-[#3D7FFF]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-200 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 bg-white/20 rounded-full text-sm text-blue-50">
              <GraduationCap className="w-4 h-4" />
              学校专区
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
              查你的学校能投什么岗位
            </h1>
            <p className="mt-6 text-lg text-blue-50/90 leading-relaxed">
              了解学校概况、本专业对口岗位、薪资地域分布，用AI规划求职路线。首批覆盖桂林高校，持续扩展中。
            </p>
          </div>
        </div>
      </section>

      {/* 学校列表 */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-[#f0f5ff]/40 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 bg-[#165DFF]/10 text-[#165DFF] rounded-full text-sm font-medium">
              <GraduationCap className="w-4 h-4" />
              已开通学校
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              选择你的学校，查看就业专区
            </h2>
            <p className="mt-3 text-slate-500">真实岗位数据 · 真实统计 · 持续扩展</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SCHOOLS.map((school) => (
              <SchoolCard key={school.slug} school={school} />
            ))}
          </div>
        </div>
      </section>

      {/* ==================== 高校合作招募（院校视角，保留原有内容） ==================== */}
      <section className="py-16 md:py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 bg-[#165DFF]/10 text-[#165DFF] rounded-full text-sm font-medium">
              <Building2 className="w-4 h-4" />
              高校合作计划
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              为高校打造的 AI 求职解决方案
            </h2>
            <p className="mt-4 text-slate-500 max-w-2xl mx-auto">
              融合 DeepSeek 大模型能力，为高校就业指导中心提供AI模拟面试、智能简历优化、职业测评等全链路求职辅导工具。
            </p>
            <div className="mt-6">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-200/50 transition shadow-md"
              >
                申请合作 <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* 核心优势 */}
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {advantages.map((adv, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-xl bg-[#165DFF]/10 flex items-center justify-center text-[#165DFF] group-hover:bg-[#165DFF] group-hover:text-white transition-colors duration-300">
                  {adv.icon}
                </div>
                <h3 className="mt-6 text-xl font-bold text-slate-900">{adv.title}</h3>
                <p className="mt-3 text-slate-500 leading-relaxed">{adv.desc}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {adv.badges.map((b) => (
                    <span
                      key={b}
                      className="text-xs px-2 py-0.5 bg-[#165DFF]/5 text-[#165DFF] rounded border border-[#165DFF]/20"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 合作流程 */}
          <div className="mt-16">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 bg-[#165DFF]/10 text-[#165DFF] rounded-full text-sm font-medium">
                合作流程
              </div>
              <h3 className="text-2xl font-bold text-slate-900">三步轻松接入，快速落地</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {steps.map((s, idx) => (
                <div key={idx} className="relative text-center">
                  {idx < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-[#165DFF]/30 to-[#165DFF]/10" />
                  )}
                  <div className="relative z-10 w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center shadow-lg shadow-blue-200/50">
                    <span className="text-2xl font-bold text-white">{s.step}</span>
                  </div>
                  <h4 className="mt-6 text-lg font-bold text-slate-900">{s.title}</h4>
                  <p className="mt-3 text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 指标 */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: 'AI原生', label: 'DeepSeek大模型驱动' },
              { value: '零部署负担', label: '云端SaaS，高校无需自建' },
              { value: '按需定制', label: '支持定制题库与测评维度' },
              { value: '24h', label: '合作响应时间' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-xl md:text-2xl font-bold text-[#165DFF]">{s.value}</div>
                <div className="text-sm text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 招募 CTA */}
      <section className="py-16 bg-gradient-to-br from-[#165DFF] to-[#3D7FFF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles className="w-12 h-12 text-blue-100 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white">携手打造高校 AI 就业新生态</h2>
          <p className="mt-4 text-lg text-blue-50/80 max-w-2xl mx-auto">
            职途星正在寻找首批合作高校。立即申请，成为我们的合作伙伴。
          </p>
          <div className="mt-10">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-10 py-4 bg-white text-[#165DFF] rounded-xl font-semibold hover:bg-blue-50 transition shadow-xl"
            >
              <Building2 className="w-5 h-5" />申请合作
            </Link>
          </div>
        </div>
      </section>

      {/* 联系我们 */}
      <section className="py-12 bg-gradient-to-b from-white to-[#f0f5ff]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#165DFF]" />
            <span className="text-sm font-medium text-[#165DFF] uppercase tracking-wider">联系我们</span>
          </div>
          <p className="text-slate-500 max-w-xl mx-auto">
            如对高校合作计划感兴趣，请通过{' '}
            <Link href="/contact" className="text-[#165DFF] underline hover:text-[#3D7FFF]">
              联系我们
            </Link>{' '}
            页面提交申请，我们将在24小时内回复。
          </p>
        </div>
      </section>
    </div>
  );
}
