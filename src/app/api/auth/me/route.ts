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

    // 从 @phone.temp 邮箱提取手机号
    const phoneFromEmail = user.email?.includes('@phone.temp') 
      ? user.email.split('@')[0] 
      : null;

    // 返回用户信息
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone || phoneFromEmail,
        email: user.email,
        nickname: user.user_metadata?.nickname || '用户' + (user.phone?.slice(-4) || phoneFromEmail?.slice(-4) || '')
      }
    });
  } catch (err) {
    console.error('[auth/me] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
