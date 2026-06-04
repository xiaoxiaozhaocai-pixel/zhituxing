import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseAccessTokenFromCookie } from '@/lib/auth-cookies';

// ============================================================
// 限流常量
// ============================================================
const RATE_LIMIT = 400;
const RATE_WINDOW_MS = 60_000;

// ============================================================
// 静态资源前缀和扩展名（豁免限流）
// ============================================================
const STATIC_PREFIXES = ['/_next/static', '/_next/image', '/favicon', '/images/', '/fonts/', '/assets/'];
const STATIC_EXTENSIONS = ['.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2', '.ttf', '.css', '.js', '.map'];

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
// 获取客户端 IP（Zeabur 在 x-forwarded-for 里塞多个 IP，取第一个真实 IP）
// ============================================================
function getClientIP(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    // 取第一个非空非 unknown 的 IP
    const ips = xff.split(',').map(s => s.trim()).filter(s => s && s !== 'unknown');
    if (ips[0]) return ips[0];
  }
  return request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         'anonymous';
}

// ============================================================
// 获取限流 key（优先 user_id，回退 IP）
// ============================================================
function getRateLimitKey(req: NextRequest): string {
  const token = req.cookies.get('sb-access-token')?.value;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload?.sub) return `user:${payload.sub}`;
    } catch {}
  }
  return `ip:${getClientIP(req)}`;
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
export async function proxy(request: NextRequest): Promise<NextResponse | undefined> {
  const pathname = request.nextUrl.pathname;

  // --------------------------------------------------------
  // 0. 静态资源豁免（不参与限流）
  // --------------------------------------------------------
  if (
    STATIC_PREFIXES.some(p => pathname.startsWith(p)) ||
    STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))
  ) {
    return NextResponse.next();
  }

  // --------------------------------------------------------
  // 1. 全局限流（400次/分钟，按 user_id 或 IP）
  // --------------------------------------------------------
  const rateLimitKey = getRateLimitKey(request);
  const globalCheck = await checkRateLimit(`global:${rateLimitKey}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!globalCheck.allowed) {
    return createRateLimitResponse();
  }

  // --------------------------------------------------------
  // 2. /admin 路由保护：检查登录 cookie
  // --------------------------------------------------------
  if (pathname.startsWith('/admin')) {
    // 排除登录页面本身和登录 API
    if (pathname === '/admin/login' || pathname.startsWith('/admin/api/auth/')) {
      return undefined;
    }
    
    const accessToken = parseAccessTokenFromCookie(request.headers);
    if (!accessToken) {
      // API 路由返回 401 JSON（而非 307 重定向到登录页）
      if (pathname.startsWith('/admin/api/')) {
        const response = NextResponse.json(
          { error: '请先登录', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
        return addSecurityHeaders(response);
      }
      // 页面路由重定向到登录页
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
  // 漏洞修复：移除 x-user-id 绕过登录检查，只验证 JWT token
  // --------------------------------------------------------
  if (pathname.startsWith('/api/chat')) {
    const accessToken = parseAccessTokenFromCookie(request.headers);
    
    // 漏洞修复：之前允许 x-user-id 绕过登录检查是严重安全漏洞
    // 现在只验证 JWT token，不再信任 x-user-id header
    if (!accessToken) {
      console.log('[proxy] /api/chat returning 401 - no auth token');
      const response = NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }
    
    console.log('[proxy] /api/chat auth passed, checking rate limit');
    const chatCheck = await checkRateLimit(`chat:${rateLimitKey}`, 5, 60000);
    if (!chatCheck.allowed) {
      return createRateLimitResponse();
    }
  }

  // --------------------------------------------------------
  // 4. /api/auth/login 和 /api/auth/register 路由：5次/分钟限流
  // --------------------------------------------------------
  if (pathname === '/api/auth/login' || pathname === '/api/auth/register') {
    const authCheck = await checkRateLimit(`auth:${rateLimitKey}`, 5, 60000);
    if (!authCheck.allowed) {
      return createRateLimitResponse();
    }
  }

  // --------------------------------------------------------
  // 5. /api/jobs 路由：30次/分钟限流
  // --------------------------------------------------------
  if (pathname.startsWith('/api/jobs')) {
    const jobsCheck = await checkRateLimit(`jobs:${rateLimitKey}`, 30, 60000);
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
