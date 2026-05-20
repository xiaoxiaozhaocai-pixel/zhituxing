import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const token = request.headers.get('cookie')
      ?.split(';')
      .find(c => c.trim().startsWith('sb-access-token='))
      ?.split('=')[1];

    if (!token) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      phone: user.phone,
      email: user.email,
      nickname: user.user_metadata?.nickname || user.phone?.slice(-4) || '用户'
    });
  } catch (err) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
