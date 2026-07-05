'use client';

import Link from 'next/link';
import { Heart, Bot, Compass, FileText, MessageSquare, Sparkles, Briefcase, GraduationCap, Crown, HelpCircle, Phone, Building2 } from 'lucide-react';
import { usePathname } from 'next/navigation';

/**
 * 与 Navbar 对齐的页脚（蓝白主题，禁用暗色）
 *
 * 链接来源严格对齐 Navbar 的 mainNavItems / agentNavItems / agentNavItems2 / exploreNavItems / moreNavItems，
 * 不再出现 Navbar 没有的 /growth、/match、/skills-graph、/learning-path、/guide 等孤儿入口。
 */
export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin') || pathname === '/profile') return null;

  const linkClasses =
    'text-[#64748B] hover:text-[#165DFF] text-sm transition-colors duration-200 inline-flex items-center gap-1.5';
  const subLinkClasses =
    'text-[#94A3B8] hover:text-[#165DFF] text-xs transition-colors';

  // 与 Navbar 完全对齐
  const agentLinks = [
    { name: '职搭子', href: '/assistant', icon: <Bot className="w-3.5 h-3.5" /> },
    { name: '职业规划', href: '/career-planning', icon: <Compass className="w-3.5 h-3.5" /> },
    { name: '简历助手', href: '/resume-optimize', icon: <FileText className="w-3.5 h-3.5" /> },
    { name: 'AI模拟面试', href: '/assistant?bot=interview', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { name: '考研就业决策', href: '/assistant?bot=decision', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  const exploreLinks = [
    { name: '岗位百科', href: '/jobs', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { name: '干货库', href: '/resources', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  ];

  const aboutLinks = [
    { name: '会员中心', href: '/membership', icon: <Crown className="w-3.5 h-3.5" /> },
    { name: '常见问题', href: '/faq', icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { name: '联系我们', href: '/contact', icon: <Phone className="w-3.5 h-3.5" /> },
    { name: '高校合作', href: '/university', icon: <Building2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <footer className="relative bg-gradient-to-b from-[#f8fafd] via-white to-[#f0f5ff]/40 border-t border-[#E2E8F0]">
      {/* 顶部装饰光斑 */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#165DFF]/30 to-transparent" />
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-[#165DFF]/[0.04] blur-3xl" />

      {/* 主网格 */}
      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* 品牌（col-span 2） */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center shadow-md shadow-[#165DFF]/20 group-hover:shadow-lg group-hover:shadow-[#165DFF]/30 transition-all">
                <span className="text-white font-bold text-base">职</span>
              </div>
              <div>
                <div className="text-base font-bold text-[#1E293B] tracking-tight">职途星</div>
                <div className="text-[10px] text-[#94A3B8] -mt-0.5">AI职业规划助手</div>
              </div>
            </Link>
            <p className="text-[#64748B] text-sm leading-relaxed mb-5 max-w-sm">
              懂桂电学生的AI朋友，陪你从迷茫到入职，走好求职每一步。
            </p>
            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#475569] text-xs border border-[#E2E8F0] shadow-sm">
                🏫 桂林电子科技大学
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#165DFF]/8 to-[#3D7FFF]/8 text-[#165DFF] text-xs border border-[#165DFF]/15">
                🤖 AI 驱动求职
              </span>
            </div>
          </div>

          {/* 智能体 */}
          <div>
            <h4 className="text-xs font-semibold text-[#1E293B] uppercase tracking-widest mb-5">功能</h4>
            <ul className="space-y-3">
              {agentLinks.map((l) => (
                <li key={l.name}>
                  <Link href={l.href} className={linkClasses}>
                    {l.icon}{l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 探索 */}
          <div>
            <h4 className="text-xs font-semibold text-[#1E293B] uppercase tracking-widest mb-5">探索</h4>
            <ul className="space-y-3">
              {exploreLinks.map((l) => (
                <li key={l.name}>
                  <Link href={l.href} className={linkClasses}>
                    {l.icon}{l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 关于 */}
          <div>
            <h4 className="text-xs font-semibold text-[#1E293B] uppercase tracking-widest mb-5">关于</h4>
            <ul className="space-y-3">
              {aboutLinks.map((l) => (
                <li key={l.name}>
                  <Link href={l.href} className={linkClasses}>
                    {l.icon}{l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 底栏 */}
      <div className="relative border-t border-[#E2E8F0]/70">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[#94A3B8] text-xs flex items-center gap-1.5">
            Made with <Heart className="w-3 h-3 text-rose-400 fill-rose-400" /> for 大学生求职
          </p>
          <div className="flex items-center gap-5">
            <Link href="/data-source" className={subLinkClasses}>数据来源</Link>
            <Link href="/privacy" className={subLinkClasses}>隐私政策</Link>
            <Link href="/terms" className={subLinkClasses}>用户协议</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pb-5 text-center">
          <p className="text-[#94A3B8] text-[11px] leading-relaxed">
            岗位信息来源于国聘网、国家24365大学生就业服务平台、中国公共招聘网、广西人才网等合规平台，仅供参考。
          </p>
        </div>
      </div>
    </footer>
  );
}
