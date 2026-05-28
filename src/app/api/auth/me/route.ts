import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 从 cookie 读取 sb-access-token
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 动态导入 Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 验证 token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    // 返回用户信息
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.user_metadata?.phone || user.phone || null,
        nickname: user.user_metadata?.nickname || '用户' + (user.email?.split('@')[0]?.slice(-4) || '')
      }
    });
  } catch (err) {
    console.error('[auth/me] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
