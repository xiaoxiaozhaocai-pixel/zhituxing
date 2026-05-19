export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';

// 注册
export async function POST(request: NextRequest) {
  try {
    const { email, password, code, nickname, invite_code } = await request.json();

    // 从邮箱提取手机号（去掉 @test.com）
    const phone = email ? email.replace(/@test\.com$/i, '') : '';

    // 验证必填项
    if (!email || !password || !code) {
      return NextResponse.json(
        { error: '请填写完整信息' },
        { status: 400 }
      );
    }

    // 验证邮箱格式（手机号@test.com）
    if (!/^1[3-9]\d{9}@test\.com$/i.test(email)) {
      return NextResponse.json(
        { error: '请输入正确的邮箱格式（手机号@test.com）' },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少6位' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 查询验证码
    const { data: verifyResult, error: verifyError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('type', 'register')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verifyError || !verifyResult) {
      return NextResponse.json({ error: '请先获取验证码' }, { status: 400 });
    }

    const verification = verifyResult as { id: string; code: string; expires_at: string };

    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json({ error: '验证码已过期，请重新获取' }, { status: 400 });
    }

    if (verification.code !== code) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }

    // 标记验证码已使用
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verification.id);

    // 检查用户是否已存在
    const { data: userCheck } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (userCheck) {
      return NextResponse.json(
        { error: '该手机号已注册，请直接登录' },
        { status: 400 }
      );
    }

    // 查找邀请人（如果有邀请码）
    let inviterId: string | null = null;
    if (invite_code) {
      const { data: inviterResult } = await supabase
        .from('users')
        .select('id')
        .eq('invite_code', invite_code)
        .maybeSingle();
      
      if (inviterResult) {
        inviterId = inviterResult.id;
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    const userNickname = nickname || `用户${phone.slice(-4)}`;
    
    // 生成用户的邀请码
    const userInviteCode = `U${phone.slice(-6)}`;

    // 计算配额重置时间（月底）
    const now = new Date();
    const quotaResetTime = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 创建用户
    const { data: insertResult, error: insertError } = await supabase
      .from('users')
      .insert({
        phone,
        password: hashedPassword,
        nickname: userNickname,
        invite_code: userInviteCode,
        monthly_quota: 5,
        quota_reset_time: quotaResetTime.toISOString()
      })
      .select('id, phone, nickname, created_at')
      .single();

    if (insertError || !insertResult) {
      console.error('创建用户失败:', insertError);
      return NextResponse.json(
        { error: '注册失败' },
        { status: 500 }
      );
    }

    const newUser = insertResult as {
      id: string;
      phone: string;
      nickname: string;
      created_at: string;
    };

    // 如果有邀请人，创建邀请记录并自动发放奖励
    if (inviterId) {
      // 创建邀请记录
      await supabase
        .from('invites')
        .insert({
          inviter_id: inviterId,
          invitee_id: newUser.id,
          invite_code: invite_code,
          reward_quota: 3,
          reward_days: 7,
          reward_status: 'claimed',
          claimed_at: now.toISOString()
        });

      // 自动发放奖励给邀请人
      const { data: inviterData } = await supabase
        .from('users')
        .select('monthly_quota, member_expire_time')
        .eq('id', inviterId)
        .single();

      if (inviterData) {
        await supabase
          .from('users')
          .update({ 
            monthly_quota: (inviterData.monthly_quota || 0) + 3 
          })
          .eq('id', inviterId);

        // 检查并延长邀请人的会员时间
        let newExpireTime: Date;

        if (inviterData.member_expire_time) {
          const currentExpire = new Date(inviterData.member_expire_time);
          newExpireTime = new Date(currentExpire.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else {
          newExpireTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        await supabase
          .from('users')
          .update({
            member_type: 'monthly',
            member_expire_time: newExpireTime.toISOString()
          })
          .eq('id', inviterId);
      }

      // 自动给被邀请人发放奖励（注册即可获得3次免费次数）
      await supabase
        .from('users')
        .update({ 
          monthly_quota: 5 + 3 
        })
        .eq('id', newUser.id);
    }

    // 返回用户信息
    const userInfo = {
      id: newUser.id,
      phone: newUser.phone,
      nickname: newUser.nickname,
      created_at: newUser.created_at,
      invite_reward: inviterId ? { quota: 3, message: '注册奖励：+3次AI次数' } : null
    };

    return NextResponse.json({
      success: true,
      message: inviterId ? '注册成功，获得3次免费AI次数！' : '注册成功',
      user: userInfo
    });

  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
