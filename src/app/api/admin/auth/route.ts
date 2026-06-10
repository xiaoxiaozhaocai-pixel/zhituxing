export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import crypto from 'crypto';

export const runtime = 'nodejs';

function verifyAdminToken(token: string): boolean {
  // 方式1：哈希比较（推荐，需先设置 ADMIN_TOKEN_HASH + ADMIN_TOKEN_SALT）
  const storedHash = process.env.ADMIN_TOKEN_HASH;
  const salt = process.env.ADMIN_TOKEN_SALT || 'zhituxing';
  if (storedHash) {
    const hash = crypto.createHash('sha256').update(token + salt).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
    } catch {
      return false;
    }
  }
  
  // 方式2：明文比较（兼容旧 ADMIN_TOKEN 配置）
  const plainToken = process.env.ADMIN_TOKEN;
  if (plainToken) {
    try {
      return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(plainToken));
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * 检查用户是否为管理员
 * 支持两种方式：
 *   1. admin_token cookie（管理后台登录）
 *   2. Supabase JWT + ADMIN_USER_IDS（平台用户中的管理员）
 */
export async function GET(request: NextRequest) {
  try {
    // 方式1：检查 admin_token cookie（管理后台登录）
    const cookieHeader = request.headers.get('cookie') || '';
    const adminTokenMatch = cookieHeader.match(/admin_token=([^;]+)/);
    const adminToken = adminTokenMatch ? adminTokenMatch[1] : null;
    
    if (adminToken && verifyAdminToken(adminToken)) {
      return NextResponse.json({ 
        isAdmin: true, 
        userId: 'admin',
        authMethod: 'admin_token'
      });
    }

    // 方式2：检查 Supabase JWT + ADMIN_USER_IDS
    const userId = await getAuthenticatedUserId(request);
    if (userId) {
      const adminIds = process.env.ADMIN_USER_IDS;
      if (adminIds) {
        const adminList = adminIds.split(',').map(id => id.trim().toLowerCase());
        if (adminList.includes(userId.toLowerCase())) {
          return NextResponse.json({ 
            isAdmin: true, 
            userId,
            authMethod: 'supabase_jwt'
          });
        }
      }
      return NextResponse.json({ isAdmin: false, userId, authMethod: 'supabase_jwt' });
    }

    return NextResponse.json({ isAdmin: false, error: '未登录' }, { status: 401 });
  } catch (error) {
    console.error('[admin/auth] Error:', error);
    return NextResponse.json({ isAdmin: false, error: '权限校验失败' }, { status: 500 });
  }
}
