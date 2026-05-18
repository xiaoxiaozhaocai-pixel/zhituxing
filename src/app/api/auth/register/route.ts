import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { execSql } from '@/lib/exec-sql';

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

    // 测试模式：18775139647@test.com 固定验证码 123456，同时开通会员
    const isTestEmail = email === '18775139647@test.com';
    if (isTestEmail && code !== '123456') {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }

    // 查询验证码（测试邮箱跳过）
    if (!isTestEmail) {
      const verifyResult = await execSql(
        `SELECT * FROM verification_codes WHERE phone = '${phone}' AND type = 'register' AND used = false ORDER BY created_at DESC LIMIT 1`
      );

      if (!verifyResult || verifyResult.length === 0) {
        return NextResponse.json({ error: '请先获取验证码' }, { status: 400 });
      }

      const verification = verifyResult[0] as { id: string; code: string; expires_at: string };

      if (new Date(verification.expires_at) < new Date()) {
        return NextResponse.json({ error: '验证码已过期，请重新获取' }, { status: 400 });
      }

      if (verification.code !== code) {
        return NextResponse.json({ error: '验证码错误' }, { status: 400 });
      }

      await execSql(`UPDATE verification_codes SET used = true WHERE id = '${verification.id}'`);
    }

    // 检查用户是否已存在
    const userCheck = await execSql(`SELECT id FROM users WHERE phone = '${phone}' LIMIT 1`);
    if (userCheck && userCheck.length > 0) {
      return NextResponse.json(
        { error: '该手机号已注册，请直接登录' },
        { status: 400 }
      );
    }

    // 查找邀请人（如果有邀请码）
    let inviterId: string | null = null;
    if (invite_code) {
      const inviterResult = await execSql(
        `SELECT id FROM users WHERE invite_code = '${invite_code}' LIMIT 1`
      );
      if (inviterResult && inviterResult.length > 0) {
        inviterId = (inviterResult[0] as { id: string }).id;
      }
    }

    // 测试模式：直接返回成功，并写入生产 Supabase user_profiles
    if (isTestEmail) {
      const testUserId = `test_${phone}_${Date.now()}`;
      const testUser = {
        id: testUserId,
        phone,
        nickname: nickname || `用户${phone.slice(-4)}`,
        created_at: new Date().toISOString(),
        token: `test_token_${Date.now()}`,
        user_type: 'member',
        membership_type: 'member'
      };

      // 写入生产 Supabase user_profiles 表
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gpwekhlltsvoalmqzjy.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd2VraGxsdHN2b2FsbXF6anl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1Nzc0NiwiZXhwIjoyMDkyMzMzNzQ2fQ.-hP6eVgWEUsYkM9pyVkXPT9bMP_ek30_wgOeZ0PL1X4';
        await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            user_id: testUserId,
            phone: phone,
            nickname: testUser.nickname,
            user_type: 'member',
            membership_type: 'member',
            membership_expires_at: '2030-12-31T23:59:59Z',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
      } catch (e) {
        console.log('Supabase write failed (expected in dev):', e);
      }

      return NextResponse.json({
        success: true,
        message: '注册成功（测试模式，会员已开通）',
        user: testUser
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    const userNickname = nickname || `用户${phone.slice(-4)}`;
    
    // 生成用户的邀请码
    const userInviteCode = `U${phone.slice(-6)}`;

    // 创建用户
    await execSql(
      `INSERT INTO users (phone, password, nickname, invite_code, monthly_quota, quota_reset_time) 
       VALUES ('${phone}', '${hashedPassword}', '${userNickname}', '${userInviteCode}', 5, DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second')`
    );

    // 查询新创建的用户
    const userResult = await execSql(
      `SELECT id, phone, nickname, created_at FROM users WHERE phone = '${phone}' LIMIT 1`
    );

    if (!userResult || userResult.length === 0) {
      return NextResponse.json(
        { error: '注册失败' },
        { status: 500 }
      );
    }

    const newUser = userResult[0] as {
      id: string;
      phone: string;
      nickname: string;
      created_at: string;
    };

    // 如果有邀请人，创建邀请记录并自动发放奖励
    if (inviterId) {
      // 创建邀请记录
      await execSql(
        `INSERT INTO invites (inviter_id, invitee_id, invite_code, reward_quota, reward_days, reward_status, claimed_at)
         VALUES ('${inviterId}', '${newUser.id}', '${invite_code}', 3, 7, 'claimed', NOW())`
      );

      // 自动发放奖励给邀请人
      await execSql(
        `UPDATE users SET monthly_quota = monthly_quota + 3 WHERE id = '${inviterId}'`
      );

      // 检查并延长邀请人的会员时间
      const inviterResult = await execSql(
        `SELECT member_expire_time FROM users WHERE id = '${inviterId}' LIMIT 1`
      );
      
      if (inviterResult && inviterResult.length > 0) {
        const inviter = inviterResult[0] as { member_expire_time: string };
        const now = new Date();
        let newExpireTime: Date;

        if (inviter.member_expire_time) {
          const currentExpire = new Date(inviter.member_expire_time);
          newExpireTime = new Date(currentExpire.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else {
          newExpireTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        await execSql(
          `UPDATE users SET 
            member_type = 'monthly',
            member_expire_time = '${newExpireTime.toISOString()}'
           WHERE id = '${inviterId}'`
        );
      }

      // 自动给被邀请人发放奖励（注册即可获得3次免费次数）
      await execSql(
        `UPDATE users SET monthly_quota = monthly_quota + 3 WHERE id = '${newUser.id}'`
      );
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
