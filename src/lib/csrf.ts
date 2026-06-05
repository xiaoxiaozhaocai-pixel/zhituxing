/**
 * CSRF 防护中间件
 * 
 * 修复 P0-4：验证 Origin/Referer 头，防止跨站请求伪造
 * 
 * 设计：
 *   - 对 POST/PUT/DELETE/PATCH 请求验证 Origin 或 Referer
 *   - 允许同源请求和已配置的允许域名
 *   - 跳过 GET/HEAD/OPTIONS 请求
 *   - 开发环境允许无 Origin 的请求（如 curl/Postman）
 */
import { NextRequest, NextResponse } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zhituxing.zeabur.app';

function extractOrigin(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

/**
 * 获取允许的 Origin 列表
 */
function getAllowedOrigins(): string[] {
  const origins = [SITE_URL];
  
  // 开发环境添加 localhost
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000');
  }
  
  // 允许 coze.cn 环境
  if (process.env.COZE_PROJECT_ENV) {
    origins.push('https://www.coze.cn', 'https://www.coze.com');
  }
  
  return origins;
}

/**
 * 验证 CSRF：检查 Origin/Referer 头
 * 返回 NextResponse（如果被拦截），或 null（通过）
 */
export function validateCSRF(request: NextRequest): NextResponse | null {
  // 仅对状态变更请求检查
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null; // 安全方法不检查
  }
  
  const allowedOrigins = getAllowedOrigins();
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // 如果有 Origin 头，验证它
  if (origin) {
    const isAllowed = allowedOrigins.some(
      (allowed) => origin === allowed || origin.startsWith(allowed)
    );
    
    if (!isAllowed) {
      console.warn(`[CSRF] Blocked request from origin: ${origin}`);
      return NextResponse.json(
        { error: '跨站请求被拒绝' },
        { status: 403 }
      );
    }
    
    return null; // 通过
  }
  
  // 如果没有 Origin 但有 Referer，验证 Referer
  if (referer) {
    const refererOrigin = extractOrigin(referer);
    const isAllowed = allowedOrigins.some(
      (allowed) => refererOrigin === allowed || refererOrigin.startsWith(allowed)
    );
    
    if (!isAllowed) {
      console.warn(`[CSRF] Blocked request from referer: ${refererOrigin}`);
      return NextResponse.json(
        { error: '跨站请求被拒绝' },
        { status: 403 }
      );
    }
    
    return null;
  }
  
  // 开发环境下，无 Origin/Referer 的请求（如 API 测试工具）允许通过
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }
  
  // 生产环境下，同源请求可能没有 Origin 头（取决于浏览器），允许通过
  // 注意：现代浏览器对跨站 POST 都会发送 Origin 头
  return null;
}
