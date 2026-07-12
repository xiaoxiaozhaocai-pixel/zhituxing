'use client';

import Link from 'next/link';
import { ArrowRight, Check, Users, Target, TrendingUp, Shield, Sparkles, BarChart3, Search, Zap, Building2, ChevronRight, Star, Award, Clock, Compass } from 'lucide-react';

// ─── 数据 ──────────────────────────────────────────────

const stats = [
  { value: '500+', label: '桂电在校生', icon: <Users className="w-5 h-5" /> },
  { value: '85%', label: '画像完整度', icon: <Target className="w-5 h-5" /> },
  { value: '92%', label: 'AI匹配准确率', icon: <TrendingUp className="w-5 h-5" /> },
  { value: '3min', label: '平均响应速度', icon: <Zap className="w-5 h-5" /> },
];

const features = [
  { title: 'AI智能匹配', desc: '基于大模型深度解析候选人画像，精准匹配岗位需求', icon: <Sparkles className="w-6 h-6" /> },
  { title: '多维人才画像', desc: '技能树、职业倾向、性格特质、项目经历全方位展示', icon: <BarChart3 className="w-6 h-6" /> },
  { title: '主动人才搜索', desc: '按专业、技能、年级等多维度筛选，快速锁定目标人才', icon: <Search className="w-6 h-6" /> },
  { title: '面试安排', desc: '线上面试+日程管理，一键发起，高效沟通', icon: <Clock className="w-6 h-6" /> },
  { title: '数据看板', desc: '实时查看招聘进展、候选人漏斗、岗位热度分析', icon: <Target className="w-6 h-6" /> },
  { title: '品牌展示', desc: '专属企业主页，展示雇主品牌，吸引优秀人才', icon: <Building2 className="w-6 h-6" /> },
];

const steps = [
  { num: '01', title: '注册认证', desc: '填写企业信息，完成资质认证' },
  { num: '02', title: '发布岗位', desc: '描述岗位需求与技能要求，AI自动匹配' },
  { num: '03', title: '筛选推荐', desc: '查看AI推荐的匹配候选人，主动邀约' },
  { num: '04', title: '面试入职', desc: '在线面试沟通，高效完成招聘闭环' },
];

const candidateHighlights = [
  { label: '专业技能', items: ['Python / Java / C++', '前端开发 (React/Vue)', '嵌入式开发', '数据分析与AI'] },
  { label: '软技能', items: ['项目协作能力', '沟通表达能力', '自主学习能力', '问题解决能力'] },
  { label: '认证标签', items: ['英语四六级', '计算机等级考试', '专业资格证书', '竞赛获奖经历'] },
];

const plans = [
  {
    name: '免费版',
    price: '¥0',
    period: '/月',
    desc: '适合初步了解',
    features: ['查看候选人基础画像', '每月5次主动搜索', '发布3个岗位', '基础数据看板'],
    cta: '免费开通',
    highlighted: false,
  },
  {
    name: '专业版',
    price: '¥299',
    period: '/月',
    desc: '适合中小团队',
    features: ['完整人才画像查看', '无限次主动搜索', '无限岗位发布', 'AI智能推荐候选人', '面试安排管理', '高级数据看板'],
    cta: '立即开通',
    highlighted: true,
  },
  {
    name: '企业版',
    price: '¥999',
    period: '/月',
    desc: '适合大规模招聘',
    features: ['专业版全部功能', '企业品牌主页', 'API对接', '专属客户经理', '定制人才报告', '批量操作与导出'],
    cta: '联系顾问',
    highlighted: false,
  },
];

// ─── Section Wrapper ───────────────────────────────────

function Section({ id, className = '', children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`section-padding ${className}`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
}

function SectionTitle({ badge, title, desc }: { badge?: string; title: string; desc?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-14">
      {badge && (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#165DFF]/8 text-[#165DFF] text-xs font-semibold border border-[#165DFF]/15 mb-5">
          <Sparkles className="w-3 h-3" />
          {badge}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl font-bold text-[#1E293B] heading-tight mb-4">
        {title}
      </h2>
      {desc && <p className="text-lg text-[#64748B] leading-relaxed">{desc}</p>}
    </div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────

export default function EnterprisePage() {
  return (
    <main>
      {/* ──────── Hero ──────── */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white">
        {/* 背景装饰 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] blob-primary opacity-60" />
          <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] blob-accent opacity-40" />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-24 sm:py-32 w-full">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#165DFF]/8 border border-[#165DFF]/15 text-[#165DFF] text-sm font-medium mb-8">
              <Building2 className="w-4 h-4" />
              雇主招聘平台
            </div>

            {/* 主标题 */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1E293B] heading-display leading-[1.1] mb-6">
              找到真正适合的
              <span className="text-gradient block mt-2">桂电人才</span>
            </h1>

            <p className="text-lg sm:text-xl text-[#64748B] leading-relaxed max-w-2xl mb-10">
              职途星汇聚桂电优秀在校生，通过AI深度分析每位同学的能力画像与职业倾向，
              帮您精准定位、高效招募真正匹配岗位需求的明日之星。
            </p>

            {/* CTA */}
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/employer/auth/signup">
                <button className="btn-gradient px-8 py-3.5 rounded-xl text-base font-semibold inline-flex items-center gap-2">
                  免费开始招聘
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[#475569] font-medium hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-all">
                了解更多
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ──────── 数据指标 ──────── */}
      <section className="relative -mt-20 pb-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="glass-strong rounded-2xl p-8 sm:p-10 shadow-lg">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#165DFF]/8 text-[#165DFF] mb-3 mx-auto">
                    {stat.icon}
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-[#1E293B] heading-tight mb-1">{stat.value}</div>
                  <div className="text-sm text-[#64748B]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────── 功能介绍 ──────── */}
      <Section id="features">
        <SectionTitle
          badge="核心功能"
          title="一站式校招人才匹配平台"
          desc="从搜索到入职，我们让校招更高效"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bento-card group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#165DFF]/10 to-[#3D7FFF]/10 flex items-center justify-center text-[#165DFF] mb-4 group-hover:scale-110 transition-transform duration-300">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-[#1E293B] mb-2">{f.title}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ──────── 四步流程 ──────── */}
      <Section className="bg-gradient-to-b from-[#f0f5ff]/30 to-white">
        <SectionTitle
          badge="简单四步"
          title="4步完成招聘"
          desc="从注册到入职，流程简洁高效"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              <div className="glass-card rounded-2xl p-6 text-center relative z-10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#165DFF]/20">
                  <span className="text-white font-bold text-lg">{step.num}</span>
                </div>
                <h3 className="text-lg font-semibold text-[#1E293B] mb-2">{step.title}</h3>
                <p className="text-sm text-[#64748B]">{step.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 z-0">
                  <ArrowRight className="w-5 h-5 text-[#165DFF]/30" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ──────── 候选人画像展示 ──────── */}
      <Section>
        <SectionTitle
          badge="人才画像"
          title="每位候选人都是一个丰富的画像"
          desc="AI深入分析每位同学的技能、特质与潜力"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {candidateHighlights.map((section, i) => (
            <div key={i} className="bento-card">
              <h3 className="text-base font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#165DFF]" />
                {section.label}
              </h3>
              <ul className="space-y-2.5">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-[#475569]">
                    <Check className="w-4 h-4 text-[#165DFF] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* ──────── 定价 ──────── */}
      <Section className="bg-gradient-to-b from-[#f0f5ff]/30 to-white">
        <SectionTitle
          badge="定价方案"
          title="选择适合您的方案"
          desc="灵活定价，满足不同规模企业的招聘需求"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-gradient-to-b from-[#165DFF] to-[#2563EB] text-white shadow-xl shadow-[#165DFF]/20 scale-105 md:scale-110 relative'
                  : 'bg-white border border-[#E2E8F0] hover:border-[#165DFF]/20 hover:shadow-lg'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-[#165DFF] text-xs font-semibold shadow-md">
                  最受欢迎
                </div>
              )}
              <div className={`text-3xl font-bold heading-tight mb-1 ${plan.highlighted ? 'text-white' : 'text-[#1E293B]'}`}>
                {plan.price}
                <span className={`text-base font-normal ${plan.highlighted ? 'text-blue-200' : 'text-[#94A3B8]'}`}>{plan.period}</span>
              </div>
              <div className={`text-sm mb-6 ${plan.highlighted ? 'text-blue-200' : 'text-[#64748B]'}`}>{plan.desc}</div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm">
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.highlighted ? 'text-blue-200' : 'text-[#165DFF]'}`} />
                    <span className={plan.highlighted ? 'text-blue-50' : 'text-[#475569]'}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? 'bg-white text-[#165DFF] hover:bg-blue-50 shadow-md'
                    : 'border border-[#165DFF] text-[#165DFF] hover:bg-[#165DFF]/5'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* ──────── CTA底部 ──────── */}
      <Section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] blob-primary opacity-40" />
        </div>
        <div className="relative glass-strong rounded-3xl p-12 sm:p-16 text-center max-w-4xl mx-auto shadow-lg">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E293B] heading-tight mb-4">
            准备好找到你的
            <span className="text-gradient">下一位优秀人才</span>了吗？
          </h2>
          <p className="text-lg text-[#64748B] mb-8 max-w-xl mx-auto">
            加入职途星，连接桂电优秀在校生，让招聘更智能、更高效。
          </p>
          <Link href="/employer/auth/signup">
            <button className="btn-gradient px-10 py-4 rounded-xl text-base font-semibold inline-flex items-center gap-2 shadow-lg">
              免费开始招聘
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </Section>
    </main>
  );
}
