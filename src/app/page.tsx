import HomeClient from './HomeClient';

/**
 * Server Component wrapper for the home page.
 *
 * 性能优化 (perf/home 5/28)：原 page.tsx 是 'use client' 文件，Next.js
 * 16 不允许 'use client' 文件 export route segment config（dynamic /
 * revalidate / fetchCache 等），导致首页只能走 dynamic SSR，每次访问
 * 都要在服务端把 layout 里所有 client provider（AuthProvider / Membership
 * Provider / ProfileGuideProvider / Navbar / Footer / CookieConsent 等）
 * 跑一次 server-side render，TTFB ~ 4-7s（生产实测）。
 *
 * 这里加一层 Server Component wrapper，配合 `force-static` 让首页在
 * `next build` 阶段直接 prerender 成静态 HTML，请求时由 standalone
 * server 当 static file 返回（毫秒级 TTFB）。客户端 hydration 后所有
 * 交互、router、useEffect 仍正常工作。
 *
 * 注意：HomeClient 内部用到的 new Date()（getDaysToAutumnRecruit）会在
 * build 时定格一次；下次部署会重新算。若需"每日刷新"，把 dynamic
 * 改成 `force-static` + `revalidate = 86400` 走 ISR 即可。
 */
export const metadata = {
  title: '先想清楚，再投简历 — 职途星 | 桂电学生专属AI求职伙伴',
  description:
    '桂电学生专属AI求职伙伴。小职帮你做职业规划、技能匹配、模拟面试，从迷茫到清晰，不盲投不焦虑。免费使用，覆盖27大行业4000+真实岗位。',
};

export const dynamic = 'force-static';

export default function Page() {
  return <HomeClient />;
}
