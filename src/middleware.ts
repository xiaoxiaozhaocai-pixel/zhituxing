import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { globalRateLimiter, authRateLimiter, chatRateLimiter, jobsRateLimiter } from '@/lib/rate-limit';

// ============================================================
// 安全响应头配置
// ============================================================
const SECURITY_HEADERS = {
  // 防止点击劫持
  'X-Frame-Options': 'DENY',
  // 防止 MIME 类型嗅探
  'X-Content-Type-Options': 'nosniff',
  // 控制引用信息
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // 禁用浏览器特性
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  // XSS 保护（旧浏览器兼容）
  'X-XSS-Protection': '1; mode=block',
  // HSTS（生产环境启用）
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  // CSP - 内容安全策略
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.cn",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.cn https://fonts.gstatic.cn",
    "font-src 'self' https://fonts.gstatic.cn data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
  ].join('; '),
};

// ============================================================
// 获取客户端 IP
// ============================================================
function getClientIP(request: NextRequest): string {
  // 优先检查代理头
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // 兜底
  return 'unknown';
}

// ============================================================
// 添加安全头到响应
// ============================================================
function addSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// ============================================================
// 创建限流响应
// ============================================================
function createRateLimitResponse(resetAt: number): NextResponse {
  const response = NextResponse.json(
    { error: '请求过于频繁，请稍后再试' },
    { status: 429 }
  );
  response.headers.set('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
  return addSecurityHeaders(response);
}

// ============================================================
// 中间件主函数
// ============================================================
export function middleware(request: NextRequest): NextResponse | undefined {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);

  // --------------------------------------------------------
  // 1. 全局 IP 速率限制（100次/分钟）
  // --------------------------------------------------------
  const globalCheck = globalRateLimiter.check(ip);
  if (!globalCheck.allowed) {
    return createRateLimitResponse(globalCheck.resetAt);
  }

  // --------------------------------------------------------
  // 2. /admin 路由保护：检查登录 cookie
  // --------------------------------------------------------
  if (pathname.startsWith('/admin')) {
    // 排除登录页面本身
    if (pathname === '/admin/login') {
      return undefined;
    }
    
    const accessToken = request.cookies.get('sb-access-token');
    if (!accessToken) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      const response = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(response);
    }
  }

  // --------------------------------------------------------
  // 2.5 /assistant 和 /profile 路由保护：需要登录
  // --------------------------------------------------------
  if (pathname === '/assistant' || pathname.startsWith('/profile')) {
    const accessToken = request.cookies.get('sb-access-token');
    if (!accessToken) {
      // 重定向到登录页，并带上回调 URL
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/auth';
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(response);
    }
  }

  // --------------------------------------------------------
  // 3. /api/chat 路由：登录检查 + 5次/分钟限流
  // --------------------------------------------------------
  if (pathname.startsWith('/api/chat')) {
    const accessToken = request.cookies.get('sb-access-token');
    if (!accessToken) {
      const response = NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }
    
    const chatCheck = chatRateLimiter.check(ip);
    if (!chatCheck.allowed) {
      return createRateLimitResponse(chatCheck.resetAt);
    }
  }

  // --------------------------------------------------------
  // 4. /api/auth/login 路由：5次/分钟限流
  // --------------------------------------------------------
  if (pathname === '/api/auth/login') {
    const authCheck = authRateLimiter.check(ip);
    if (!authCheck.allowed) {
      return createRateLimitResponse(authCheck.resetAt);
    }
  }

  // --------------------------------------------------------
  // 5. /api/jobs 路由：30次/分钟限流
  // --------------------------------------------------------
  if (pathname.startsWith('/api/jobs')) {
    const jobsCheck = jobsRateLimiter.check(ip);
    if (!jobsCheck.allowed) {
      return createRateLimitResponse(jobsCheck.resetAt);
    }
  }

  // --------------------------------------------------------
  // 6. 继续请求并添加安全头
  // --------------------------------------------------------
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

// ============================================================
// 中间件匹配配置
// ============================================================
export const config = {
  matcher: [
    // 匹配所有路径，排除静态资源
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
