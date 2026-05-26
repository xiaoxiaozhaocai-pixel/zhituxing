export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { execSql } from '@/lib/exec-sql';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 使用参数化查询防止SQL注入
    const numericUserId = Number(userId);
    if (isNaN(numericUserId)) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }
    
    const result = await execSql(
      `SELECT is_admin FROM user_profiles WHERE user_id = %L`,
      numericUserId
    ) as Array<Record<string, unknown>>;

    const isAdmin = (result?.[0]?.is_admin as boolean) === true;
    return NextResponse.json({ isAdmin, userId: numericUserId });
  } catch (error) {
    console.error('[admin/auth] Error:', error);
    return NextResponse.json({ error: '权限校验失败' }, { status: 500 });
  }
}
