export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { setAuthCookies } from '@/lib/auth-cookies';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const { email, token, type = 'magiclink', flowType = 'signup', password, nickname } = await request.json();

    if (!email || !token) {
      return NextResponse.json({ error: '请提供邮箱和验证码' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 🧪 测试模式：DEV_OTP_BYPASS + 旁路验证码 88888888
    const isBypass = process.env.DEV_OTP_BYPASS === 'true' && token === '88888888';
    
    let authData: { user: any; session: any } | null = null;
    let finalUser: any = null;

    if (isBypass) {
      console.log('[verify-otp] 🧪 测试模式旁路验证:', { email, flowType });
      
      if (flowType === 'signup') {
        // 直接创建用户
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: password || 'Test1234',
          email_confirm: true,
          user_metadata: { nickname: nickname || `用户${email.split('@')[0].slice(-4)}` }
        });
        
        if (createError) {
          // 用户可能已存在（之前注册过），尝试登录
          if (createError.message?.includes('already') || createError.message?.includes('exists')) {
            console.log('[verify-otp] 用户已存在，尝试登录');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password: password || 'Test1234',
            });
            if (signInError) {
              return NextResponse.json({ error: '用户已存在但密码错误，请使用登录功能' }, { status: 400 });
            }
            authData = signInData;
          } else {
            console.error('[verify-otp] 创建用户失败:', createError);
            return NextResponse.json({ error: '创建测试账号失败' }, { status: 500 });
          }
        } else {
          // 新用户创建成功，自动登录
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: password || 'Test1234',
          });
          if (signInError) {
            console.error('[verify-otp] 自动登录失败:', signInError);
            return NextResponse.json({ error: '账号创建成功但登录失败，请手动登录' }, { status: 500 });
          }
          authData = signInData;
          console.log('[verify-otp] 🧪 测试账号创建成功:', email);
        }
      } else {
        // 登录流程旁路：直接用密码登录
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: password || 'Test1234',
        });
        if (signInError) {
          return NextResponse.json({ error: '测试旁路登录失败，请检查账号是否存在' }, { status: 400 });
        }
        authData = signInData;
      }
    } else {
      // 正常 OTP 验证流程
      const result = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'magiclink',
      });

      if (result.error) {
        console.error('OTP验证失败:', result.error.message);
        if (result.error.message.includes('expired')) {
          return NextResponse.json({ error: '验证码已过期，请重新获取' }, { status: 400 });
        }
        return NextResponse.json({ error: '验证码错误，请重新输入' }, { status: 400 });
      }

      if (!result.data.user || !result.data.session) {
        return NextResponse.json({ error: '验证失败，请重试' }, { status: 500 });
      }

      authData = result.data;
    }

    if (!authData?.user || !authData?.session) {
      return NextResponse.json({ error: '验证失败，请重试' }, { status: 500 });
    }

    const finalSession = authData.session;
    finalUser = authData.user;
    
    // 正常 OTP 流程：如果是注册且传入了密码，设置密码和昵称
    if (!isBypass && password && flowType === 'signup') {
      console.log('[verify-otp] 注册流程，设置密码和昵称:', { 
        userId: authData.user.id, 
        hasNickname: !!nickname 
      });
      
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
      } else if (updateData.user) {
        finalUser = updateData.user;
        console.log('[verify-otp] 密码设置成功');
      }
    }

    // 验证成功后，如果是注册流程，插入 user_profiles 记录
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
