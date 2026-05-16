import { NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const result = await execSql(
      `SELECT is_admin FROM user_profiles WHERE user_id = ${Number(userId)}`
    ) as Array<Record<string, unknown>>;

    const isAdmin = (result?.[0]?.is_admin as boolean) === true;
    return NextResponse.json({ isAdmin, userId: Number(userId) });
  } catch (error) {
    console.error('[admin/auth] Error:', error);
    return NextResponse.json({ error: '权限校验失败' }, { status: 500 });
  }
}
