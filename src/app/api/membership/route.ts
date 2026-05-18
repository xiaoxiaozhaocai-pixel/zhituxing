import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

export const runtime = 'edge';

/**
 * GET /api/user/membership
 * 查询用户会员状态
 * Header: x-user-id
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 测试用户ID格式：test_xxx 或纯数字
    const isTestUser = userId.startsWith('test_');
    if (!isTestUser && !/^\d+$/.test(userId)) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }

    // 测试用户直接返回会员状态
    if (isTestUser) {
      return NextResponse.json({
        success: true,
        data: {
          membershipType: 'member',
          isMember: true,
          membershipPlan: '测试会员',
          expiresAt: '2030-12-31T23:59:59Z',
        },
      });
    }

    const rows = await execSql(
      `SELECT membership_type, membership_expires_at, user_type
       FROM user_profiles WHERE user_id = '${userId}'`
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const row = rows[0] as Record<string, unknown>;
    const membershipType = (row.membership_type as string) || (row.user_type as string) || 'free';
    const expiresAt = row.membership_expires_at as string | null;

    // 检查会员是否过期
    let isExpired = false;
    if (expiresAt && membershipType === 'member') {
      isExpired = new Date(expiresAt) < new Date();
      if (isExpired) {
        // 过期自动降级为免费用户
        await execSql(
          `UPDATE user_profiles SET membership_type = 'free', user_type = 'free' WHERE user_id = '${userId}'`
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        membershipType: isExpired ? 'free' : membershipType,
        isMember: !isExpired && membershipType === 'member',
        expiresAt: isExpired ? null : expiresAt,
      },
    });
  } catch (error) {
    console.error('[membership] GET error:', error);
    return NextResponse.json({ error: '查询会员状态失败' }, { status: 500 });
  }
}

/**
 * POST /api/user/membership
 * 升级会员
 * Body: { plan: 'semester' | 'annual' | 'lifetime' }
 * Header: x-user-id
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 防止SQL注入：只允许数字
    if (!/^\d+$/.test(userId)) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }

    const body = await request.json();
    const { plan } = body;

    // 校验套餐类型
    const validPlans: Record<string, { name: string; price: number; durationDays: number | null }> = {
      semester: { name: '学期会员', price: 29.9, durationDays: 180 },
      annual: { name: '年度会员', price: 99, durationDays: 365 },
      lifetime: { name: '永久会员', price: 199, durationDays: null },
    };

    if (!plan || !validPlans[plan]) {
      return NextResponse.json({ error: '无效的会员套餐', validPlans: Object.keys(validPlans) }, { status: 400 });
    }

    const selectedPlan = validPlans[plan];

    // 计算到期时间
    let expiresAt: string | null = null;
    if (selectedPlan.durationDays) {
      const expires = new Date();
      expires.setDate(expires.getDate() + selectedPlan.durationDays);
      expiresAt = expires.toISOString();
    }

    // 更新会员状态（实际项目中这里应接入支付系统，此处为演示直接升级）
    const expiresSql = expiresAt ? `'${expiresAt}'` : 'NULL';
    await execSql(
      `UPDATE user_profiles
       SET membership_type = 'member',
           user_type = 'member',
           membership_expires_at = ${expiresSql}
       WHERE user_id = '${userId}'`
    );

    return NextResponse.json({
      success: true,
      data: {
        membershipType: 'member',
        isMember: true,
        membershipPlan: selectedPlan.name,
        expiresAt,
        price: selectedPlan.price,
        message: `已成功升级为${selectedPlan.name}`,
      },
    });
  } catch (error) {
    console.error('[membership] POST error:', error);
    return NextResponse.json({ error: '升级会员失败' }, { status: 500 });
  }
}
