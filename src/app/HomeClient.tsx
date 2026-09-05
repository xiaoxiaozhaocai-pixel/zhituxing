'use client';

import { useState, useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  Compass, TrendingUp, Briefcase, CheckCircle2, ArrowRight,
  Sparkles, Building2, Mic, Search, Shield, Zap, FileText,
  MessageSquare, Target, Layers,
} from 'lucide-react';

// ============================================================
// 数据：痛点共鸣 + 5核心链路 + 数据信任
// ============================================================

const painPoints = [
  {
    icon: <Compass className="w-5 h-5" />,
    title: '我到底适合做什么？',
    desc: '专业不对口、兴趣不清晰？小职陪你一步步理清方向。',
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: '投了很多简历没回音',
    desc: '不用盲投，小职做认知校正+精准匹配，帮你少走弯路。',
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: '考研还是直接就业？',
    desc: '用你的真实画像做推演，不靠拍脑袋做决定。',
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
];

const corePaths = [
  {
    icon: <Compass className="w-5 h-5" />,
    title: '认知校正',
    desc: '先搞清楚你到底适合什么方向，不盲目开跑',
    href: '/career-planning',
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: '简历评估',
    desc: '诊断简历，让你投出去更有针对性',
    href: '/resume-optimize',
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: '能力翻译',
    desc: '把专业与经历，翻译成岗位听得懂的语言',
    href: '/skill-portrait',
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
  {
    icon: <Mic className="w-5 h-5" />,
    title: '模拟面试',
    desc: '实战演练，从容应对面试官',
    href: '/assistant?bot=interview',
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: '岗位匹配',
    desc: '基于你的画像，精准推荐，告别海投',
    href: '/match',
    color: 'from-[#165DFF] to-[#3D7FFF]',
  },
];

// 首页「数据信任区」逐项数据：第一项「真实JD」由组件内 useEffect 动态拉取
// /api/jobs/stats（真实岗位总数）+ 引擎行业雷达数，避免硬编码失真（历史曾写死
// 「20,000+ / 27大行业」，与真实库不符，违反守四真）。后两项为产品定位文案，保持不变。

// ============================================================
// 首页组件 — 主界面：小职对话 = 唯一主入口；5核心链路；岗位信息
// ============================================================

export default function HomeClient({ industryCount }: { industryCount: number }) {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // 数据信任区 · 真实JD动态化（守四真，避免写死失真数字）
  const [jdStats, setJdStats] = useState({ total: '8,930+', industries: industryCount });

  useEffect(() => {
    let active = true;
    // JD真实总数：拉取岗位库统计接口
    fetch('/api/jobs/stats')
      .then((r) => r.json())
      .then((d) => {
        if (active && d?.ok && typeof d?.data?.total === 'number') {
          setJdStats((prev) => ({
            ...prev,
            total: new Intl.NumberFormat('en-US').format(d.data.total) + '+',
          }));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const trustStats = [
    { icon: <Building2 className="w-5 h-5" />, value: jdStats.total, label: '真实JD', desc: `覆盖${jdStats.industries}大行业` },
    { icon: <Shield className="w-5 h-5" />, value: '免费', label: '基础对话', desc: '高级分析会员专享' },
    { icon: <Zap className="w-5 h-5" />, value: '全链路', label: '求职陪伴', desc: '先想清楚，再投简历' },
  ];

  return (
    <div className="min-h-screen bg-white text-[#1E293B]">

      {/* ============================================================
          HERO — 小职对话（唯一主入口，人格化定式）
          ============================================================ */}
      <section className="relative pt-16 sm:pt-24 pb-14 sm:pb-16 overflow-hidden">
        {/* 有机装饰 */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] blob-primary -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] blob-accent translate-y-1/4 -translate-x-1/4 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] blob-warm -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-60" />

        {/* 网格纹理 */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(22,93,255,0.02)_1px,transparent_1px),linear-gradient(to_right,rgba(22,93,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 text-center relative z-10">
          {/* 登录横幅 */}
          {mounted && !authLoading && (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8 ${isAuthenticated ? 'text-[#165DFF]' : 'text-amber-700'}`}>
              {isAuthenticated ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#165DFF]" />
                  欢迎回来{user?.nickname ? `，${user.nickname}` : ''}，继续和小职聊聊
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  注册即享 <strong>3次免费</strong> AI职业诊断
                  <Link href="/login" className="font-semibold text-amber-600 hover:underline ml-1">立即注册 →</Link>
                </>
              )}
            </div>
          )}

          {/* 主标题 */}
          <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-5 leading-[1.1] tracking-tight ${mounted ? 'anim-up' : 'opacity-0'}`}>
            <span className="text-gradient">
              先想清楚<br className="sm:hidden" />再投简历
            </span>
          </h1>

          <p className={`text-lg sm:text-xl text-[#64748B] max-w-xl mx-auto mb-10 leading-relaxed ${mounted ? 'anim-up-d1' : 'opacity-0'}`}>
            我是小职，懂桂电的AI朋友 👋<br />
            想清楚方向，一步步陪你走。
          </p>

          {/* ============================================================
              小职对话 — 唯一主入口（人格化对话框）
              ============================================================ */}
          <Link href="/chat" className={`block max-w-2xl mx-auto mb-14 anim-up-d2`}>
            <div className="group relative rounded-3xl bg-white/70 backdrop-blur-sm border border-[#E2E8F0] shadow-xl shadow-[#165DFF]/5 hover:shadow-2xl hover:shadow-[#165DFF]/10 hover:-translate-y-1 transition-all duration-300 p-7 sm:p-9 text-left overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 blob-primary opacity-20 pointer-events-none" />

              <div className="relative z-10 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center text-white shadow-lg shadow-[#165DFF]/25 group-hover:scale-105 transition-transform duration-300">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[#165DFF] text-sm font-semibold">小职对话 · 起点</div>
                  <div className="text-[#64748B] text-xs">从这里开始，让我真正懂你</div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#165DFF] ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>

              <div className="relative z-10 mt-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-5">
                <p className="text-[#334155] text-base sm:text-lg leading-relaxed">
                  “我该找什么方向的工作？帮我看看我的简历适合什么岗位？”
                </p>
                <p className="mt-3 text-[#94A3B8] text-sm">
                  小职会先做<strong className="text-[#165DFF]">认知校正</strong>，再给你<strong className="text-[#165DFF]">路径建议</strong>和<strong className="text-[#165DFF]">岗位匹配</strong>
                </p>
              </div>

              <div className="relative z-10 mt-4 flex items-center justify-between text-sm">
                <span className="text-[#94A3B8]">点击开始对话</span>
                <span className="inline-flex items-center gap-1 text-[#165DFF] font-semibold">
                  找小职聊聊 <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>

          {/* 岗位信息入口（原有，不新增） */}
          <div className={`flex items-center justify-center gap-2 ${mounted ? 'anim-up-d3' : 'opacity-0'}`}>
            <Link href="/jobs" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-all duration-300">
              <Briefcase className="w-4 h-4" />
              浏览岗位信息
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          痛点共鸣 — 玻璃卡片三列
          ============================================================ */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 heading-tight">
            小职知道你在焦虑什么 🤔
          </h2>
          <p className="text-[#64748B] text-center mb-10 max-w-md mx-auto">
            你不是一个人，桂电的学姐学长也都经历过这些
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {painPoints.map((item, i) => (
              <div
                key={i}
                className="bento-card group cursor-default"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-[#1E293B] mb-2">{item.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          5 核心链路 — 从「我知道焦虑」到「我带你走」
          ============================================================ */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-[#F8FAFC] to-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 heading-tight">
            5条核心链路，陪你走完求职全程
          </h2>
          <p className="text-[#64748B] text-center mb-10 max-w-md mx-auto">
            每一步都有小职，不用自己瞎折腾
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {corePaths.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className={`bento-card group ${i === 0 ? 'bento-featured' : ''}`}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                  {item.icon}
                </div>
                <h3 className="text-base font-bold text-[#1E293B] mb-1.5 relative z-10">{item.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed relative z-10">{item.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[#165DFF] opacity-0 group-hover:opacity-100 transition-opacity duration-300 relative z-10">
                  开始 <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>

          {/* 求职工具库引导（收纳其余能力，入口统一收敛） */}
          <div className="mt-8 flex justify-center">
            <Link href="/growth" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-all duration-300">
              <Layers className="w-4 h-4" />
              更多求职工具库
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          数据信任区
          ============================================================ */}
      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {trustStats.map((item, i) => (
              <div key={i} className="text-center p-8 rounded-2xl bg-gradient-to-br from-[#F8FAFC] to-[#EEF2FF] border border-[#E2E8F0] hover-lift">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-[#165DFF]/15">
                  {item.icon}
                </div>
                <div className="text-3xl font-extrabold text-gradient mb-1">{item.value}</div>
                <div className="font-semibold text-[#1E293B] mb-1">{item.label}</div>
                <div className="text-[#94A3B8] text-sm">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          收尾 CTA — 柔和引导，回到唯一主入口
          ============================================================ */}
      <section className="py-10 sm:py-12">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <p className="text-[#64748B] mb-5 text-base">
            不用想那么多，先跟小职聊两句。
          </p>
          <Link href="/chat">
            <button className="btn-gradient px-8 py-3.5 rounded-2xl font-semibold text-base flex items-center gap-2 mx-auto">
              <MessageSquare className="w-5 h-5" />
              找小职聊聊
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <p className="mt-5 text-[#94A3B8] text-sm">
            免费开聊 · 马上体验 · 让小职帮你找到方向
          </p>
        </div>
      </section>
    </div>
  );
}
