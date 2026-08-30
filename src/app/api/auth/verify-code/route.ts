import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { setAuthCookies } from '@/lib/auth-cookies';
export const dynamic = 'force-dynamic';

/**
 * 手机验证码验证 + 登录
 */

const PHONE_REGEX = /^1[3-9]\d{9}$/;

export async function POST(request: NextRequest) {
  try {
    const { phone, code, _type = 'login' } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ error: '请提供手机号和验证码' }, { status: 400 });
    }
    if (!PHONE_REGEX.test(phone)) {
      return NextResponse.json({ error: '手机号格式不正确' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: '验证码格式不正确' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. 验证验证码
    const { data: rows, error: queryError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (queryError || !rows?.[0]) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }
    if (new Date(rows[0].expires_at) < new Date()) {
      return NextResponse.json({ error: '验证码已过期，请重新获取' }, { status: 400 });
    }

    // 标记已使用
    await supabase.from('verification_codes').update({ used: true }).eq('id', rows[0].id);

    // 2. 查找用户
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, nickname, membership_tier, user_type, membership_expires_at')
      .eq('phone', phone)
      .limit(1);

    const fakeEmail = `phone_${phone}@zhituxing.tech`;
    let userId: string;
    let nickname: string;
    let userType = 'free';

    if (profiles && profiles.length > 0) {
      userId = profiles[0].user_id;
      nickname = profiles[0].nickname || `用户${phone.slice(-4)}`;
      // 优先读 membership_tier（新真相源），fallback 读 user_type（旧字段兼容）
      userType = profiles[0].membership_tier || profiles[0].user_type || 'free';
    } else {
      // 新用户：创建 Supabase Auth 用户
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: fakeEmail,
        phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { nickname: `用户${phone.slice(-4)}`, phone },
      });

      if (createError) {
        // 可能 fakeEmail 已有（之前创建过），尝试查找
        const { data: listData } = await supabase.auth.admin.listUsers();
        const found = listData?.users?.find((u) => u.email === fakeEmail || u.phone === phone);
        if (found) {
          userId = found.id;
          nickname = found.user_metadata?.nickname || `用户${phone.slice(-4)}`;
        } else {
          console.error('[verify-code] 创建用户失败:', createError);
          return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
        }
      } else {
        userId = newUser.user!.id;
        nickname = `用户${phone.slice(-4)}`;

        await supabase.from('user_profiles').upsert({
          id: userId,
          user_id: userId,
          phone,
          nickname,
          user_type: 'free',
          membership_tier: 'free',
        }, { onConflict: 'id' });
      }
    }

    // 3. 生成 session：使用 generateLink + verifyOtp
    // generateLink 返回 hashed_token，verifyOtp 用 token_hash 验证并创建 session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: fakeEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[verify-code] generateLink 失败:', linkError);
      return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
    }

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });

    if (verifyError || !verifyData?.session) {
      console.error('[verify-code] verifyOtp 失败:', verifyError);
      return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
    }

    // 4. 返回成功
    const isMember = userType !== 'free';
    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: userId,
        phone,
        nickname,
        is_member: isMember,
        user_type: userType,
      },
    });

    setAuthCookies(
      response,
      verifyData.session.access_token,
      verifyData.session.refresh_token,
      verifyData.session.expires_at ?? 0
    );

    return response;
  } catch (error) {
    console.error('[verify-code] 异常:', error);
    return NextResponse.json({ error: '验证失败，请稍后重试' }, { status: 500 });
  }
}
