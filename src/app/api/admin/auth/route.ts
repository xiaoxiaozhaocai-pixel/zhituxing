export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';

export const runtime = 'nodejs';

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
    
    if (adminToken && process.env.ADMIN_TOKEN && adminToken === process.env.ADMIN_TOKEN) {
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
