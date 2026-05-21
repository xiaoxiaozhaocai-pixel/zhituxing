export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 从 cookie 认证用户
async function authenticateUser(request: NextRequest): Promise<string | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return user.id;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 所有功能已免费开放，返回空订阅
    return NextResponse.json({
      success: true,
      data: null,
      message: '所有功能已免费开放'
    });
  } catch (error) {
    console.error('获取订阅失败:', error);
    return NextResponse.json({
      success: true,
      data: null,
      message: '所有功能已免费开放'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticateUser(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 所有功能已免费开放，无需订阅
    return NextResponse.json({
      success: true,
      message: '所有功能已免费开放',
      subscription: null
    });
  } catch (error) {
    console.error('创建订阅失败:', error);
    return NextResponse.json({
      success: true,
      message: '所有功能已免费开放',
      subscription: null
    });
  }
}
