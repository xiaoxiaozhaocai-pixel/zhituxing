'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin') || pathname === '/profile') return null;

  const linkClasses = "text-[#94A3B8] hover:text-white text-sm transition-colors duration-200";

  return (
    <footer className="bg-[#0F172A] border-t border-white/5">
      {/* 主网格 */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* 品牌 */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] flex items-center justify-center shadow-lg shadow-[#165DFF]/20">
                <span className="text-white font-bold text-sm">职</span>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">职途星</span>
            </div>
            <p className="text-[#94A3B8] text-sm leading-relaxed mb-5 max-w-xs">
              懂桂电学生的AI朋友，陪你从迷茫到入职，走好求职每一步。
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-[#94A3B8] text-xs border border-white/5">
                🏫 桂林电子科技大学
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-[#94A3B8] text-xs border border-white/5">
                🤖 AI 驱动求职
              </span>
            </div>
          </div>

          {/* 产品 */}
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-5">产品</h4>
            <ul className="space-y-3">
              {[
                { name: '我的成长', href: '/growth' },
                { name: '岗位匹配', href: '/match' },
                { name: '简历优化', href: '/resume-optimize' },
                { name: '技能图谱', href: '/skills-graph' },
              ].map((l) => (
                <li key={l.name}><Link href={l.href} className={linkClasses}>{l.name}</Link></li>
              ))}
            </ul>
          </div>

          {/* 资源 */}
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-5">资源</h4>
            <ul className="space-y-3">
              {[
                { name: '岗位百科', href: '/jobs' },
                { name: '学习路径', href: '/learning-path' },
                { name: '使用流程', href: '/guide' },
                { name: '常见问题', href: '/faq' },
                { name: '求职干货', href: '/resources' },
              ].map((l) => (
                <li key={l.name}><Link href={l.href} className={linkClasses}>{l.name}</Link></li>
              ))}
            </ul>
          </div>

          {/* 关于 */}
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-5">关于</h4>
            <ul className="space-y-3">
              {[
                { name: '联系我们', href: '/contact' },
                { name: '高校合作', href: '/university' },
                { name: '会员中心', href: '/membership' },
                { name: '数据来源', href: '/data-source' },
                { name: '隐私政策', href: '/privacy' },
              ].map((l) => (
                <li key={l.name}><Link href={l.href} className={linkClasses}>{l.name}</Link></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 底栏 */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[#64748B] text-xs flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-rose-400" /> for 大学生求职
          </p>
          <div className="flex items-center gap-5">
            {[
              { name: '数据来源', href: '/data-source' },
              { name: '隐私政策', href: '/privacy' },
              { name: '用户协议', href: '/terms' },
            ].map((l) => (
              <Link key={l.name} href={l.href} className="text-[#64748B] hover:text-[#94A3B8] text-xs transition-colors">
                {l.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pb-5 text-center">
          <p className="text-[#475569] text-[11px] leading-relaxed">
            岗位信息来源于国聘网、国家24365大学生就业服务平台、中国公共招聘网、广西人才网等合规平台，仅供参考。
          </p>
        </div>
      </div>
    </footer>
  );
}
