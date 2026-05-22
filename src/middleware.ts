import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseAccessTokenFromCookie } from '@/lib/auth-cookies';

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
  // CSP - 内容安全策略（已收紧：移除 unsafe-eval）
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://fonts.googleapis.cn",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.cn https://fonts.gstatic.cn",
    "font-src 'self' https://fonts.gstatic.cn data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.coze.cn https://api.deepseek.com",
    "frame-ancestors 'none'",
  ].join('; '),
};

// ============================================================
// 获取客户端 IP（优先级：Cloudflare > x-real-ip > x-forwarded-for）
// ============================================================
function getClientIP(request: NextRequest): string {
  // 1. 优先 Cloudflare 真实 IP
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  
  // 2. 其次 x-real-ip
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  
  // 3. 最后 x-forwarded-for（取第一个）
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
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
function createRateLimitResponse(): NextResponse {
  const response = NextResponse.json(
    { error: '请求过于频繁，请稍后再试' },
    { status: 429 }
  );
  response.headers.set('Retry-After', '60');
  return addSecurityHeaders(response);
}

// ============================================================
// 中间件主函数（异步，支持分布式限流）
// ============================================================
export async function middleware(request: NextRequest): Promise<NextResponse | undefined> {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);

  // --------------------------------------------------------
  // 1. 全局 IP 速率限制（100次/分钟）
  // --------------------------------------------------------
  const globalCheck = await checkRateLimit(`global:${ip}`, 100, 60000);
  if (!globalCheck.allowed) {
    return createRateLimitResponse();
  }

  // --------------------------------------------------------
  // 2. /admin 路由保护：检查登录 cookie
  // --------------------------------------------------------
  if (pathname.startsWith('/admin')) {
    // 排除登录页面本身
    if (pathname === '/admin/login') {
      return undefined;
    }
    
    const accessToken = parseAccessTokenFromCookie(request.headers);
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
  if (pathname.startsWith('/assistant') || pathname.startsWith('/profile')) {
    const accessToken = parseAccessTokenFromCookie(request.headers);
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
    const accessToken = parseAccessTokenFromCookie(request.headers);
    const devUserId = request.headers.get('x-user-id');
    
    // 允许 x-user-id header 绕过登录检查（用于测试和多端调用）
    // 生产环境应该通过 rate limiting 和其他安全措施保护
    if (!accessToken && !devUserId) {
      const response = NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }
    
    const chatCheck = await checkRateLimit(`chat:${ip}`, 5, 60000);
    if (!chatCheck.allowed) {
      return createRateLimitResponse();
    }
  }

  // --------------------------------------------------------
  // 4. /api/auth/login 和 /api/auth/register 路由：5次/分钟限流
  // --------------------------------------------------------
  if (pathname === '/api/auth/login' || pathname === '/api/auth/register') {
    const authCheck = await checkRateLimit(`auth:${ip}`, 5, 60000);
    if (!authCheck.allowed) {
      return createRateLimitResponse();
    }
  }

  // --------------------------------------------------------
  // 5. /api/jobs 路由：30次/分钟限流
  // --------------------------------------------------------
  if (pathname.startsWith('/api/jobs')) {
    const jobsCheck = await checkRateLimit(`jobs:${ip}`, 30, 60000);
    if (!jobsCheck.allowed) {
      return createRateLimitResponse();
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
