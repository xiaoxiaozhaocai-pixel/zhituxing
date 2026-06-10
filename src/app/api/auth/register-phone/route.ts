import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { setAuthCookies } from '@/lib/auth-cookies';
export const dynamic = 'force-dynamic';

/**
 * 手机号注册：验证验证码 + 设置密码 + 创建账号
 */

const PHONE_REGEX = /^1[3-9]\d{9}$/;

export async function POST(request: NextRequest) {
  try {
    const { phone, code, password, nickname } = await request.json();

    if (!phone || !code || !password) {
      return NextResponse.json({ error: '请提供手机号、验证码和密码' }, { status: 400 });
    }
    if (!PHONE_REGEX.test(phone)) {
      return NextResponse.json({ error: '手机号格式不正确' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: '验证码格式不正确' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. 验证验证码
    const { data: rows, error: queryError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('type', 'register')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (queryError || !rows?.[0]) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 });
    }
    if (new Date(rows[0].expires_at) < new Date()) {
      return NextResponse.json({ error: '验证码已过期，请重新获取' }, { status: 400 });
    }

    await supabase.from('verification_codes').update({ used: true }).eq('id', rows[0].id);

    // 2. 检查是否已注册
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: '该手机号已注册，请直接登录' }, { status: 409 });
    }

    // 3. 创建用户（带密码）
    const fakeEmail = `phone_${phone}@zhituxing.tech`;
    const defaultNickname = nickname || `用户${phone.slice(-4)}`;

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: fakeEmail,
      phone,
      password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { nickname: defaultNickname, phone },
    });

    if (createError) {
      console.error('[register-phone] 创建用户失败:', createError);
      if (createError.message?.includes('already') || createError.message?.includes('duplicate')) {
        return NextResponse.json({ error: '该手机号已注册，请直接登录' }, { status: 409 });
      }
      return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
    }

    const userId = newUser.user!.id;

    // 4. 创建 user_profiles
    await supabase.from('user_profiles').upsert({
      id: userId,
      user_id: userId,
      phone,
      nickname: defaultNickname,
      user_type: 'free',
    }, { onConflict: 'id' });

    // 5. 生成 session（用 signInWithPassword，因为已设置密码）
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });

    if (signInError || !signInData?.session) {
      // 备用方案：generateLink + verifyOtp
      console.warn('[register-phone] signInWithPassword 失败，用 generateLink 备用');
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: fakeEmail,
      });
      if (!linkError && linkData?.properties?.hashed_token) {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: linkData.properties.hashed_token,
          type: 'magiclink',
        });
        if (!verifyError && verifyData?.session) {
          const response = NextResponse.json({
            success: true,
            message: '注册成功',
            user: { id: userId, phone, nickname: defaultNickname, is_member: false, user_type: 'free' },
          });
          setAuthCookies(response, verifyData.session.access_token, verifyData.session.refresh_token, verifyData.session.expires_at ?? 0);
          return response;
        }
      }
      console.error('[register-phone] session 创建失败:', signInError || linkError);
      return NextResponse.json({
        success: true,
        message: '注册成功，请重新登录',
        user: { id: userId, phone, nickname: defaultNickname, is_member: false, user_type: 'free' },
      });
    }

    // 6. 返回
    const response = NextResponse.json({
      success: true,
      message: '注册成功',
      user: { id: userId, phone, nickname: defaultNickname, is_member: false, user_type: 'free' },
    });

    setAuthCookies(
      response,
      signInData.session.access_token,
      signInData.session.refresh_token,
      signInData.session.expires_at ?? 0
    );

    return response;
  } catch (error) {
    console.error('[register-phone] 异常:', error);
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
