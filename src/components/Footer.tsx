'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // 后台管理页 / 个人中心主页有独立侧边栏，不显示 Footer
  if (pathname?.startsWith('/admin') || pathname === '/profile') {
    return null;
  }

  return (
    <footer className="bg-[#1E3A8A] border-t border-blue-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* 品牌列 */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-lg">职</span>
              </div>
              <span className="text-xl font-bold text-white">职途星</span>
            </div>
            <p className="text-blue-200/70 text-sm leading-relaxed mb-4">
              全行业全岗位 AI 模拟甄选与职业能力发展平台，帮助每一位大学生找到属于自己的职业道路。
            </p>
            <div className="space-y-1.5 text-blue-200/80 text-xs">
              <p>客服微信：zhituxing_kefu</p>
              <p>商务合作：business@zhituxing.com</p>
              <p>项目地址：桂林电子科技大学</p>
            </div>
          </div>

          {/* 产品 */}
          <nav aria-label="产品链接">
            <h4 className="text-sm font-semibold text-blue-100 mb-4 uppercase tracking-wider">产品</h4>
            <ul className="space-y-2.5">
              {[
                { name: 'AI职业规划', href: '/career-planning' },
                { name: '岗位匹配', href: '/match' },
                { name: '能力测评', href: '/assessment' },
                { name: 'AI模拟面试', href: '/assistant?bot=interview' },
                { name: '技能图谱', href: '/skills-graph' },
              ].map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-blue-200/80 hover:text-blue-100 text-sm transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 资源 */}
          <nav aria-label="资源链接">
            <h4 className="text-sm font-semibold text-blue-100 mb-4 uppercase tracking-wider">资源</h4>
            <ul className="space-y-2.5">
              {[
                { name: '岗位百科', href: '/jobs' },
                { name: '学习路径', href: '/learning-path' },
                { name: '使用流程', href: '/guide' },
                { name: '常见问题', href: '/faq' },
                { name: '求职干货', href: '/resources' },
              ].map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-blue-200/80 hover:text-blue-100 text-sm transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 关于 */}
          <nav aria-label="关于链接">
            <h4 className="text-sm font-semibold text-blue-100 mb-4 uppercase tracking-wider">关于</h4>
            <ul className="space-y-2.5">
              {[
                { name: '联系我们', href: '/contact' },
                { name: '会员中心', href: '/membership' },
                { name: '数据来源', href: '/data-source' },
                { name: '隐私政策', href: '/privacy' },
                { name: '用户协议', href: '/terms' },
              ].map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-blue-200/80 hover:text-blue-100 text-sm transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* 底栏 */}
      <div className="border-t border-blue-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-blue-200/80 text-xs">Made with <Heart className="w-3 h-3 inline text-red-400/60" /> for 大学生求职</p>
          <div className="flex items-center gap-4 text-blue-200/80 text-xs">
            <Link href="/data-source" className="hover:text-blue-200 transition-colors">数据来源</Link>
            <Link href="/privacy" className="hover:text-blue-200 transition-colors">隐私政策</Link>
            <Link href="/terms" className="hover:text-blue-200 transition-colors">用户协议</Link>
            <Link href="/contact" className="hover:text-blue-200 transition-colors">联系我们</Link>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-preferences'))}
              className="hover:text-blue-200 transition-colors cursor-pointer bg-transparent border-0 p-0 m-0 text-blue-200/80 text-xs"
            >
              管理 Cookie 偏好
            </button>
          </div>
        </div>
        {/* 免责声明 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 text-center">
          <p className="text-blue-200/70 text-xs">
            本平台岗位信息来源于国聘网、国家24365大学生就业服务平台、中国公共招聘网、广西人才网等合规招聘平台，仅供参考。职途星不对岗位信息的准确性和时效性承担责任。
          </p>
        </div>
      </div>
    </footer>
  );
}
