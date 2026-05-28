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

    // 修复 5/28：登录时同步查 user_profiles 拿真实会员状态，避免登录瞬间显示"普通用户"
    let userType: string = 'free';
    let membershipType: string | null = null;
    let membershipExpiresAt: string | null = null;
    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('user_type, membership_type, membership_expires_at')
        .eq('user_id', authData.user.id)
        .maybeSingle();
      if (profileData) {
        userType = profileData.user_type || 'free';
        membershipType = profileData.membership_type || null;
        membershipExpiresAt = profileData.membership_expires_at || null;
      }
    } catch (e) {
      console.warn('[auth/login] 查询 user_profiles 失败，按 free 兜底:', e);
    }

    const isLifetime = userType === 'lifetime';
    const isExpired = !isLifetime && membershipExpiresAt
      ? new Date(membershipExpiresAt) < new Date()
      : false;
    const isMember = (userType === 'member' || userType === 'lifetime') && !isExpired;

    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        nickname: authData.user.user_metadata?.nickname || `用户${authData.user.email?.split('@')[0]?.slice(-4) || ''}`,
        user_type: userType,
        is_member: isMember,
        is_lifetime_member: isLifetime,
        membership_type: membershipType,
        membership_expires_at: isLifetime ? null : membershipExpiresAt,
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
