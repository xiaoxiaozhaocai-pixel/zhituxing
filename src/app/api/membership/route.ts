export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ code: 401, message: '请先登录' }, { status: 401 });
    }

    // 所有功能完全免费，不查询数据库
    return NextResponse.json({
      code: 200,
      data: {
        membership: 'free',
        plan: 'free',
        features: 'all',
        remainingUses: Infinity,
        membership_type: 'free',
        membership_expires_at: null,
        user_type: 'free',
        is_expired: false,
      }
    });
  } catch (err) {
    console.error('Membership API error:', err);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
