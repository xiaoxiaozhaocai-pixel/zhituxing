export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isMember, getUserQuota } from '@/lib/quota';
import { generateJWT } from '@/lib/auth';

const supabase = getSupabaseAdmin();

// 登录接口
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password, code, email } = body;
    const loginPhone = phone || (email ? email.split('@')[0] : '');

    if (!loginPhone) {
      return NextResponse.json({ error: '请输入手机号' }, { status: 400 });
    }

    // 密码登录
    if (password) {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', loginPhone)
        .single();

      if (error || !user) {
        return NextResponse.json({ error: '用户不存在，请先注册' }, { status: 401 });
      }

      if (user.password !== password) {
        return NextResponse.json({ error: '密码错误' }, { status: 401 });
      }

      const isVip = await isMember(user.id);
      const quota = await getUserQuota(user.id);

      return NextResponse.json({
        success: true,
        message: '登录成功',
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          is_member: isVip,
          quota
        },
        access_token: generateJWT(user.id)
      });
    }

    // 验证码登录
    if (code) {
      const { data: verification, error: vError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('phone', loginPhone)
        .eq('type', 'login')
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vError || !verification) {
        return NextResponse.json({ error: '验证码不存在或已过期' }, { status: 400 });
      }

      if (verification.code !== code) {
        return NextResponse.json({ error: '验证码错误' }, { status: 400 });
      }

      if (new Date(verification.expires_at) < new Date()) {
        return NextResponse.json({ error: '验证码已过期' }, { status: 400 });
      }

      // 标记验证码已使用
      await supabase
        .from('verification_codes')
        .update({ used: true })
        .eq('id', verification.id);

      // 查找用户
      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('phone', loginPhone)
        .maybeSingle();

      // 自动注册
      if (!user) {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            phone: loginPhone,
            nickname: `用户${loginPhone.slice(-4)}`
          })
          .select()
          .single();

        if (insertError) throw insertError;
        user = newUser;
      }

      const isVip = await isMember(user.id);
      const quota = await getUserQuota(user.id);

      return NextResponse.json({
        success: true,
        message: '登录成功',
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          is_member: isVip,
          quota
        },
        access_token: null
      });
    }

    return NextResponse.json({ error: '请提供密码或验证码' }, { status: 400 });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
