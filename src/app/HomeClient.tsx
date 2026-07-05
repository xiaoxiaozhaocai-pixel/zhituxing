'use client';

import { useState, useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, TrendingUp, Briefcase, CheckCircle2, ArrowRight,
  Sparkles, Building2, Mic, Search, Shield, Zap, FileText,
  MessageSquare } from 'lucide-react';

const painPoints = [
  {
    icon: <Compass className="w-5 h-5" />,
    title: '我到底适合做什么？',
    desc: '专业不对口、兴趣不清晰？小职帮你一步步理清思路。',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: '投了很多简历没回音',
    desc: '不用盲投，小职精准匹配帮你提升回复率。',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: '考研还是直接就业？',
    desc: '数据推演帮你做选择，不靠感觉做决定。',
    color: 'from-blue-500 to-blue-600',
  },
];

const featureCards = [
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: '我的成长',
    desc: '职业规划、测评、评估一站查看',
    href: '/growth',
    grad: 'from-blue-500 to-cyan-500',
    featured: true,
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: '岗位匹配',
    desc: '精准推荐，告别海投',
    href: '/match',
    grad: 'from-blue-500 to-cyan-500',
  },
  {
    icon: <Briefcase className="w-5 h-5" />,
    title: '岗位百科',
    desc: '真实岗位库，27大行业',
    href: '/jobs',
    grad: 'from-emerald-500 to-teal-600',
  },
  {
    icon: <Mic className="w-5 h-5" />,
    title: 'AI模拟面试',
    desc: '实战演练，从容应对',
    href: '/assistant?bot=interview',
    grad: 'from-rose-500 to-pink-600',
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: '简历优化',
    desc: '智能诊断+一键优化',
    href: '/resume-optimize',
    grad: 'from-sky-500 to-blue-600',
  },
];

// 默认值（首屏 SSR + 网络失败兜底，弹性表述避免虚假宣传）
const DEFAULT_TRUST_STATS = [
  { icon: <Building2 className="w-5 h-5" />, value: '4000+', label: '真实岗位', desc: '覆盖27大行业' },
  { icon: <Shield className="w-5 h-5" />, value: '100%', label: '免费使用', desc: '核心功能永久免费' },
  { icon: <Zap className="w-5 h-5" />, value: '6大', label: 'AI能力', desc: '全链路求职陪伴' },
];

// 数字格式化：≥1000 显示 "X.X千+"，避免精确数字带来的虚假感
function formatJobCount(n: number): string {
  if (n >= 10000) return `${Math.floor(n / 1000) / 10}万+`;
  if (n >= 1000) return `${Math.floor(n / 100) / 10}千+`;
  return `${n}+`;
}

export default function HomeClient() {
  const _router = useRouter();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [trustStats, setTrustStats] = useState(DEFAULT_TRUST_STATS);
  useEffect(() => { setMounted(true); }, []);

  // 拉取真实岗位统计（失败则保留默认弹性文案，不阻塞首屏）
  useEffect(() => {
    let cancelled = false;
    fetch('/api/jobs/stats', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (cancelled || !res?.ok || !res?.data) return;
        const { total } = res.data as { total: number };
        if (typeof total === 'number' && total > 0) {
          setTrustStats((prev) => {
            const next = [...prev];
            next[0] = {
              ...prev[0],
              value: formatJobCount(total),
              // industries 字段当前数据完整性不足（87% JD 缺失 industry 标签），
              // 暂不动态显示"覆盖N大行业"避免误导，保留默认弹性文案
            };
            return next;
          });
        }
      })
      .catch(() => { /* 静默失败，保留默认值 */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1E293B]">

      {/* ============================================================
          HERO — 有机装饰 + 玻璃卡片
          ============================================================ */}
      <section className="relative pt-20 sm:pt-28 pb-16 sm:pb-20 overflow-hidden">
        {/* 有机形状装饰 */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] blob-primary -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] blob-accent translate-y-1/4 -translate-x-1/4 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] blob-warm -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
        
        {/* 网格纹理 */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(22,93,255,0.02)_1px,transparent_1px),linear-gradient(to_right,rgba(22,93,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 text-center relative z-10">
          {/* 登录横幅 */}
          {mounted && !authLoading && (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6 ${isAuthenticated ? 'text-[#165DFF]' : 'text-amber-700'}`}>
              {isAuthenticated ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#165DFF]" />
                  欢迎回来{user?.nickname ? `，${user.nickname}` : ''}！
                  <Link href="/assistant?bot=career" className="font-semibold text-[#165DFF] hover:underline ml-1">继续规划 →</Link>
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
          
          <p className={`text-lg sm:text-xl text-[#64748B] max-w-xl mx-auto mb-8 leading-relaxed ${mounted ? 'anim-up-d1' : 'opacity-0'}`}>
            我是小职，你的AI职业规划师 👋<br />
            不用焦虑，一步步陪你走。
          </p>

          {/* CTA 按钮组 */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 ${mounted ? 'anim-up-d2' : 'opacity-0'}`}>
            <Link href="/assistant?bot=career">
              <button className="btn-gradient px-8 py-3.5 rounded-2xl font-semibold text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                找小职聊聊
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/jobs">
              <button className="px-8 py-3.5 rounded-2xl font-semibold text-base text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-all duration-300 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                浏览岗位
              </button>
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
            你不是一个人，每个大学生都经历过这些
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
          小职品牌展示区 — 「主入口」品牌锚点
          ============================================================ */}
      <section className="py-8 sm:py-10">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#EEF2FF] via-white to-[#F5F3FF] border border-[#E2E8F0] p-7 sm:p-10">
            {/* 装饰光斑 */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#165DFF]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#3D7FFF]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-[#165DFF]/3 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              {/* 左侧：品牌形象 */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center text-white shadow-xl shadow-[#165DFF]/20 transition-transform duration-500 hover:scale-110 cursor-default">
                  <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>
              </div>

              {/* 中间：品牌文案 */}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-bold text-[#1E293B] mb-1.5 heading-tight">
                  我叫小职，你的AI朋友
                </h3>
                <p className="text-[#64748B] text-sm sm:text-base mb-3 max-w-md mx-auto sm:mx-0">
                  懂桂电学生的AI朋友，陪你走好求职每一步。
                </p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="px-3 py-1 rounded-full bg-[#EEF2FF] text-[#165DFF] text-xs font-medium">免费使用</span>
                  <span className="px-3 py-1 rounded-full bg-[#EEF2FF] text-[#165DFF] text-xs font-medium">24小时在线</span>
                  <span className="px-3 py-1 rounded-full bg-[#EEF2FF] text-[#165DFF] text-xs font-medium">桂电专属</span>
                </div>
              </div>

              {/* 右侧：CTA */}
              <div className="flex-shrink-0">
                <Link href="/assistant?bot=career">
                  <button className="btn-gradient px-6 py-3 rounded-2xl font-semibold text-sm flex items-center gap-2 whitespace-nowrap shadow-lg shadow-[#165DFF]/20 hover:shadow-xl hover:shadow-[#165DFF]/30 transition-all duration-300">
                    <MessageSquare className="w-4 h-4" />
                    找小职聊聊
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          功能展示 — Bento Grid
          ============================================================ */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-[#F8FAFC] to-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 heading-tight">
            6大AI能力，全链路陪你求职
          </h2>
          <p className="text-[#64748B] text-center mb-10 max-w-md mx-auto">
            从迷茫到入职，每一步都有AI
          </p>
          
          <div className="bento-grid">
            {featureCards.map((card, i) => (
              <Link
                key={i}
                href={card.href}
                className={`bento-card group ${card.featured ? 'bento-featured' : ''}`}
              >
                {/* 编号水印 */}
                <span className="absolute top-4 right-5 text-6xl font-black text-[#F1F5F9] select-none pointer-events-none group-hover:text-[#E2E8F0] transition-colors">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.grad} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                  {card.icon}
                </div>
                <h3 className="text-lg font-bold text-[#1E293B] mb-1.5 relative z-10">{card.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed relative z-10">{card.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[#165DFF] opacity-0 group-hover:opacity-100 transition-opacity duration-300 relative z-10">
                  开始使用 <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
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
          会员预告
          ============================================================ */}
      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#EEF2FF] via-white to-[#F5F3FF] border border-[#E2E8F0] p-8 sm:p-12 text-center">
            <div className="absolute top-0 right-0 w-48 h-48 blob-primary opacity-50 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 blob-accent opacity-40 pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium mb-5">
                <Sparkles className="w-4 h-4" /> 会员专属
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1E293B] mb-3 heading-tight">
                解锁小职完全体
              </h2>
              <p className="text-[#64748B] mb-7 max-w-lg mx-auto">
                无限AI对话 · 完整岗位匹配 · 学习路径规划 · 面试模拟……
              </p>
              <Link href="/membership">
                <button className="btn-member px-8 py-3.5 rounded-2xl font-semibold text-base flex items-center gap-2 mx-auto">
                  <Sparkles className="w-5 h-5" />
                  查看会员方案
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CTA 区
          ============================================================ */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#165DFF] via-[#3D7FFF] to-[#6366F1]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        
        <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3 heading-tight">
            交个朋友？
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-lg mx-auto">
            完全免费，马上开聊。让小职帮你找到方向。
          </p>
          <Link href="/assistant?bot=career">
            <button className="bg-white text-[#165DFF] hover:bg-[#F8FAFC] px-10 py-4 rounded-2xl font-bold text-base transition-all duration-300 hover:scale-105 shadow-2xl shadow-black/20 flex items-center gap-2 mx-auto">
              <Compass className="w-5 h-5" />
              找小职聊聊
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
