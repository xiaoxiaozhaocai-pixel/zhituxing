export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { setAuthCookies } from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  try {
    const { email, token, type = 'magiclink', flowType = 'signup', password, nickname } = await request.json();

    if (!email || !token) {
      return NextResponse.json({ error: '请提供邮箱和验证码' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. 验证 OTP
    // signInWithOtp 发送的 OTP 类型始终是 magiclink，必须匹配
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'magiclink',
    });

    if (authError) {
      console.error('OTP验证失败:', authError.message);
      if (authError.message.includes('expired')) {
        return NextResponse.json({ error: '验证码已过期，请重新获取' }, { status: 400 });
      }
      return NextResponse.json({ error: '验证码错误，请重新输入' }, { status: 400 });
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json({ error: '验证失败，请重试' }, { status: 500 });
    }

    // 2. 如果是注册流程且传入了密码，设置密码和昵称
    const finalSession = authData.session;
    let finalUser = authData.user;
    
    if (password && flowType === 'signup') {
      console.log('[verify-otp] 注册流程，设置密码和昵称:', { 
        userId: authData.user.id, 
        hasNickname: !!nickname 
      });
      
      // 使用 admin API 更新用户密码和元数据（service_role 客户端没有用户session上下文）
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        authData.user.id,
        {
          password,
          user_metadata: { 
            nickname: nickname || `用户${email.split('@')[0].slice(-4)}` 
          }
        }
      );
      
      if (updateError) {
        console.error('[verify-otp] 设置密码失败:', updateError);
        // 不阻止流程，继续登录
      } else if (updateData.user) {
        finalUser = updateData.user;
        console.log('[verify-otp] 密码设置成功');
      }
    }

    // 3. 验证成功后，如果是注册流程，插入 user_profiles 记录
    if (flowType === 'signup' && finalUser) {
      const adminClient = getSupabaseAdmin();
      const { error: profileError } = await adminClient
        .from('user_profiles')
        .upsert({
          id: finalUser.id,
          user_id: finalUser.id,
          nickname: finalUser.user_metadata?.nickname || nickname || `用户${(finalUser.email?.split('@')[0]?.slice(-4) || '')}`,
          user_type: 'free',
        }, { onConflict: 'id' });
      
      if (profileError) {
        console.error('[verify-otp] 创建用户档案失败:', profileError);
        // 不阻止登录流程
      } else {
        console.log('[verify-otp] 用户档案创建成功:', finalUser.id);
      }
    }

    // 4. 返回成功响应
    const response = NextResponse.json({
      success: true,
      message: '验证成功',
      user: {
        id: finalUser.id,
        email: finalUser.email,
        nickname: finalUser.user_metadata?.nickname || nickname || `用户${finalUser.email?.split('@')[0]?.slice(-4) || ''}`,
        is_member: false
      }
    });
    
    setAuthCookies(
      response,
      finalSession.access_token,
      finalSession.refresh_token,
      finalSession.expires_at ?? 0
    );
    
    return response;
  } catch (error) {
    console.error('OTP验证失败:', error);
    return NextResponse.json({ error: '验证失败，请稍后重试' }, { status: 500 });
  }
}
