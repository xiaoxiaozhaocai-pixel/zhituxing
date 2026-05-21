export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 从 cookie 读取 sb-access-token（与 /api/auth/me 一致）
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 动态导入 Supabase（与 /api/auth/me 一致）
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
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
    // 从 cookie 读取 sb-access-token（与 /api/auth/me 一致）
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 动态导入 Supabase（与 /api/auth/me 一致）
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
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
