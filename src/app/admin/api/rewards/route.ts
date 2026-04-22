import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取奖励发放记录列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    if (status && status !== 'all') {
      whereClause += ` AND r.status = '${status}'`;
    }

    // 获取总数
    const countResult = await execSql(`
      SELECT COUNT(*) as total FROM jd_reward_records r ${whereClause}
    `) as Array<{ total: number }>;
    const total = countResult[0]?.total || 0;

    // 获取列表
    const records = await execSql(`
      SELECT r.*, u.nickname as user_nickname
      FROM jd_reward_records r
      LEFT JOIN users u ON r.user_id = u.id::varchar
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // 获取统计数据
    const stats = await execSql(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'success') as success_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status = 'failed') as today_failed
      FROM jd_reward_records
    `) as any;

    return NextResponse.json({
      code: 200,
      data: {
        list: records,
        stats: {
          total: stats[0]?.success_count + stats[0]?.failed_count + stats[0]?.pending_count || 0,
          success: stats[0]?.success_count || 0,
          failed: stats[0]?.failed_count || 0,
          pending: stats[0]?.pending_count || 0,
          todayFailed: stats[0]?.today_failed || 0
        },
        pagination: { page, pageSize, total }
      }
    });
  } catch (error) {
    console.error('获取奖励记录失败:', error);
    return NextResponse.json({ code: 500, message: '获取列表失败' }, { status: 500 });
  }
}

// 手动补发奖励
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, rewardType, rewardValue, reason, adminId, adminUsername } = body;

    if (!userId || !rewardType) {
      return NextResponse.json({ code: 400, message: '参数不完整' }, { status: 400 });
    }

    // 获取用户名
    const userResult = await execSql(`SELECT id, nickname FROM users WHERE id = '${userId}'`) as any[];
    const username = userResult[0]?.nickname || userId;

    // 更新用户会员状态
    let updateSql = '';
    let expireTime: Date;

    if (rewardType === 'lifetime') {
      updateSql = `UPDATE users SET is_lifetime_member = TRUE, member_type = 'lifetime', member_expire_time = '2099-12-31 23:59:59' WHERE id = '${userId}'`;
    } else if (rewardType === 'monthly') {
      expireTime = new Date();
      expireTime.setMonth(expireTime.getMonth() + (parseInt(rewardValue) || 1));
      updateSql = `UPDATE users SET member_type = 'monthly', member_expire_time = '${expireTime.toISOString()}' WHERE id = '${userId}'`;
    } else if (rewardType === 'bonus_months') {
      // 额外增加月数
      const user = await execSql(`SELECT member_expire_time FROM users WHERE id = '${userId}'`) as any[];
      if (user[0]?.member_expire_time) {
        const currentExpire = new Date(user[0].member_expire_time);
        currentExpire.setMonth(currentExpire.getMonth() + (parseInt(rewardValue) || 1));
        updateSql = `UPDATE users SET member_expire_time = '${currentExpire.toISOString()}' WHERE id = '${userId}'`;
      }
    }

    if (updateSql) {
      await execSql(updateSql);
    }

    // 记录发放
    await execSql(`
      INSERT INTO jd_reward_records (user_id, username, reward_type, reward_value, status, created_at, processed_at, processed_by)
      VALUES ('${userId}', '${username}', '${rewardType}', '${rewardValue || ''}', 'success', NOW(), NOW(), '${adminUsername || 'system'}')
    `);

    // 记录操作日志
    await execSql(`
      INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
      VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'reward_grant', '手动补发奖励: 用户#${userId}, 类型:${rewardType}, 值:${rewardValue || ''}')
    `);

    return NextResponse.json({ code: 200, message: '奖励发放成功' });
  } catch (error) {
    console.error('发放奖励失败:', error);
    return NextResponse.json({ code: 500, message: '发放失败' }, { status: 500 });
  }
}

// 更新奖励状态
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, failReason, adminId, adminUsername } = body;

    if (!id || !status) {
      return NextResponse.json({ code: 400, message: '参数不完整' }, { status: 400 });
    }

    await execSql(`
      UPDATE jd_reward_records 
      SET status = '${status}',
          fail_reason = '${failReason || ''}',
          processed_at = NOW(),
          processed_by = '${adminUsername || 'system'}'
      WHERE id = ${id}
    `);

    await execSql(`
      INSERT INTO admin_operation_logs (admin_id, admin_username, operation_type, operation_content)
      VALUES (${adminId || 0}, '${adminUsername || 'unknown'}', 'reward_update', '更新奖励状态: 记录#${id}, 状态:${status}')
    `);

    return NextResponse.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新奖励状态失败:', error);
    return NextResponse.json({ code: 500, message: '更新失败' }, { status: 500 });
  }
}
