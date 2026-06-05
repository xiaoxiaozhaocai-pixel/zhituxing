/**
 * 管理后台认证中间件
 * 
 * 修复 P0-2：管理后台 API 路由统一认证
 * 认证方式：验证 x-admin-token header 或 cookie 中的 admin_token
 */
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

/**
 * 验证管理员身份
 * 返回 admin 用户信息或 null
 */
export function verifyAdminAuth(request: NextRequest): { valid: boolean } {
  // 1. 检查 x-admin-token header
  const headerToken = request.headers.get('x-admin-token');
  if (headerToken && ADMIN_TOKEN && headerToken === ADMIN_TOKEN) {
    return { valid: true };
  }

  // 2. 检查 admin_token cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieMatch = cookieHeader.match(/admin_token=([^;]+)/);
  if (cookieMatch && ADMIN_TOKEN && cookieMatch[1] === ADMIN_TOKEN) {
    return { valid: true };
  }

  // 3. 检查 Authorization Bearer token
  const authHeader = request.headers.get('authorization') || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch && ADMIN_TOKEN && bearerMatch[1] === ADMIN_TOKEN) {
    return { valid: true };
  }

  return { valid: false };
}

/**
 * 管理后台路由用的 requireAdmin
 * 未认证返回 401 JSON
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const { valid } = verifyAdminAuth(request);
  if (!valid) {
    return NextResponse.json(
      { code: 401, message: '未授权访问' },
      { status: 401 }
    );
  }
  return null; // null 表示通过
}
