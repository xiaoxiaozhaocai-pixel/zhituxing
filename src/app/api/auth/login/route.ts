import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { execSql } from '@/lib/exec-sql';

// 查询用户会员状态（从生产 Supabase）
async function getMembershipStatus(userId: string, phone: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gpwekhlltsvoalmqzjy.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd2VraGxsdHN2b2FsbXF6anl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1Nzc0NiwiZXhwIjoyMDkyMzMzNzQ2fQ.-hP6eVgWEUsYkM9pyVkXPT9bMP_ek30_wgOeZ0PL1X4';
    const res = await fetch(
      `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}&phone=eq.${phone}&select=user_type,membership_type,membership_expires_at`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        // @ts-ignore - Next.js fetch 缓存选项
        cache: 'no-store'
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          user_type: data[0].user_type || 'free',
          membership_type: data[0].membership_type || 'free',
          membership_expires_at: data[0].membership_expires_at
        };
      }
    }
  } catch (e) {
    console.log('Supabase membership query failed (expected in dev):', e);
  }
  return { user_type: 'free', membership_type: 'free', membership_expires_at: null };
}

// 登录
export async function POST(request: NextRequest) {
  try {
    const { email, password, code } = await request.json();

    // 从邮箱提取手机号（去掉 @test.com）
    const phone = email ? email.replace(/@test\.com$/i, '') : '';

    // 测试邮箱强制会员: 18775139647@test.com
    const isTestEmail = email === '18775139647@test.com';

    if (!email) {
      return NextResponse.json({ error: '请输入邮箱' }, { status: 400 });
    }

    // ========== 密码登录 ==========
    if (password) {
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
      }

      // 测试手机：直接返回会员用户（跳过execSql）
      if (isTestEmail) {
        return NextResponse.json({
          success: true,
          message: '登录成功',
          user: {
            id: `test_${phone}`,
            phone,
            nickname: `用户${phone.slice(-4)}`,
            avatar_url: null,
            created_at: new Date().toISOString(),
            user_type: 'member',
            membership_type: 'member',
            membership_expires_at: '2030-12-31T23:59:59Z',
          }
        });
      }

      // 正常用户：查询dev数据库
      const userResult = await execSql(
        `SELECT * FROM users WHERE phone = '${phone}' LIMIT 1`
      );

      if (!userResult || userResult.length === 0) {
        return NextResponse.json({ error: '用户不存在，请先注册' }, { status: 401 });
      }

      const user = userResult[0] as {
        id: string; phone: string; nickname: string;
        avatar_url?: string; created_at: string; password?: string;
      };

      if (!user.password) {
        return NextResponse.json({ error: '请使用验证码登录' }, { status: 401 });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return NextResponse.json({ error: '密码错误' }, { status: 401 });
      }

      const membership = await getMembershipStatus(user.id, user.phone);
      return NextResponse.json({
        success: true,
        message: '登录成功',
        user: {
          id: user.id, phone: user.phone, nickname: user.nickname,
          avatar_url: user.avatar_url, created_at: user.created_at,
          ...membership
        }
      });
    }

    // ========== 验证码登录 ==========
    if (code) {
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 });
      }

      // 测试手机：跳过验证码验证
      if (!isTestEmail) {
        const verifyResult = await execSql(
          `SELECT * FROM verification_codes WHERE phone = '${phone}' AND type = 'login' AND used = false ORDER BY created_at DESC LIMIT 1`
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
      } else if (code !== '123456') {
        return NextResponse.json({ error: '验证码错误' }, { status: 400 });
      }

      // 测试手机：直接返回会员用户
      if (isTestEmail) {
        const testUserId = `test_${phone}_${Date.now()}`;
        return NextResponse.json({
          success: true,
          message: '登录成功',
          user: {
            id: testUserId,
            phone,
            nickname: `用户${phone.slice(-4)}`,
            avatar_url: null,
            created_at: new Date().toISOString(),
            user_type: 'member',
            membership_type: 'member',
            membership_expires_at: '2030-12-31T23:59:59Z',
          }
        });
      }

      // 正常用户：查询dev数据库
      let userResult = await execSql(
        `SELECT * FROM users WHERE phone = '${phone}' LIMIT 1`
      );

      if (!userResult || userResult.length === 0) {
        userResult = await execSql(
          `INSERT INTO users (phone, nickname) VALUES ('${phone}', '用户${phone.slice(-4)}') RETURNING *`
        );
        if (!userResult || userResult.length === 0) {
          return NextResponse.json({ error: '登录失败' }, { status: 500 });
        }
      }

      const user = userResult[0] as {
        id: string; phone: string; nickname: string;
        avatar_url?: string; created_at: string;
      };

      const membership = await getMembershipStatus(user.id, user.phone);
      return NextResponse.json({
        success: true,
        message: '登录成功',
        user: {
          id: user.id, phone: user.phone, nickname: user.nickname,
          avatar_url: user.avatar_url, created_at: user.created_at,
          ...membership
        }
      });
    }

    return NextResponse.json({ error: '请提供密码或验证码' }, { status: 400 });

  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
