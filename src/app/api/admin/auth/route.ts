export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * 检查用户是否为admin
 * 从环境变量 ADMIN_USER_IDS 读取admin的UUID列表
 */
function isAdminUser(userId: string): boolean {
  const adminIds = process.env.ADMIN_USER_IDS;
  if (!adminIds) {
    console.warn('[admin/auth] ADMIN_USER_IDS not configured');
    return false;
  }
  const adminList = adminIds.split(',').map(id => id.trim().toLowerCase());
  return adminList.includes(userId.toLowerCase());
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ isAdmin: false, error: '未登录' }, { status: 401 });
    }

    // 直接使用UUID格式的userId，不再转Number
    const admin = isAdminUser(userId);
    
    return NextResponse.json({ 
      isAdmin: admin, 
      userId: userId 
    });
  } catch (error) {
    console.error('[admin/auth] Error:', error);
    return NextResponse.json({ isAdmin: false, error: '权限校验失败' }, { status: 500 });
  }
}
