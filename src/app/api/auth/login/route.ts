export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { setAuthCookies } from '@/lib/auth-cookies';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // P1-4: 速率限制 5次/60秒
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rl = checkRateLimit(`login:${ip}`, { maxRequests: 5, windowMs: 60000 });
    if (!rl.success) {
      return NextResponse.json({ error: '请求过于频繁，请稍后重试' }, { status: 429 });
    }
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('登录失败:', authError.message);
      return NextResponse.json({ 
        error: '邮箱或密码错误'
      }, { status: 401 });
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json({ error: '登录失败，请重试' }, { status: 500 });
    }

    // 查询数据库中的会员状态
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type, membership_expires_at')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    const userType = profile?.user_type || 'free';
    const isLifetime = userType === 'lifetime';
    const isExpired = !isLifetime && profile?.membership_expires_at
      ? new Date(profile.membership_expires_at) < new Date()
      : false;
    const isMember = userType !== 'free' && !isExpired;

    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        nickname: authData.user.user_metadata?.nickname || `用户${authData.user.email?.split('@')[0]?.slice(-4) || ''}`,
        is_member: isMember,
        user_type: userType
      }
    });
    
    setAuthCookies(
      response,
      authData.session.access_token,
      authData.session.refresh_token,
      authData.session.expires_at ?? 0
    );
    
    return response;
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}
