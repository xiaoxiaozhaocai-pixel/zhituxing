export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { setAuthCookies } from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  try {
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

    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        nickname: authData.user.user_metadata?.nickname || `用户${authData.user.email?.split('@')[0]?.slice(-4) || ''}`,
        is_member: false
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
